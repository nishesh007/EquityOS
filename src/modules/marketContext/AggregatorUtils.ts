/**
 * Market Context Aggregator utilities — Sprint 11B.1D.
 * Pure functions that combine existing engine outputs only.
 * Never recalculate breadth / sector / volatility internals.
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_AGGREGATOR_CONFIG,
  type AggregatorConfig,
  type AggregatorHealthWeights,
  type AggregatorInput,
  type AggregatorSectionAvailability,
  type BreadthAnalysis,
  type InstitutionalMarketContext,
  type MarketContext,
  type MarketTrend,
  type QualityGrade,
  type RiskMode,
  type SectorStrengthAnalysis,
  type VolatilityAnalysis,
} from "./MarketContextTypes";
import { createFallbackBreadthAnalysis } from "./BreadthUtils";
import { createFallbackSectorStrengthAnalysis } from "./SectorStrengthUtils";
import { createFallbackVolatilityAnalysis } from "./VolatilityUtils";
import { createFallbackMarketContext } from "./MarketContextUtils";

export function resolveAggregatorConfig(
  partial?: AggregatorInput["config"]
): AggregatorConfig {
  return {
    ...DEFAULT_AGGREGATOR_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_AGGREGATOR_CONFIG.weights,
      ...partial?.weights,
    },
  };
}

export function classifyQualityGrade(
  healthScore: number,
  config: AggregatorConfig = DEFAULT_AGGREGATOR_CONFIG
): QualityGrade {
  if (healthScore >= config.gradeAPlusMin) return "A+";
  if (healthScore >= config.gradeAMin) return "A";
  if (healthScore >= config.gradeBMin) return "B";
  return "C";
}

function trendToHealthComponent(trend: MarketTrend): number {
  switch (trend) {
    case "Strong Bull":
      return 92;
    case "Weak Bull":
      return 72;
    case "Sideways":
      return 50;
    case "Weak Bear":
      return 28;
    case "Strong Bear":
      return 10;
    default:
      return 50;
  }
}

/**
 * Volatility health is inverse of intensity for risk-on markets:
 * calm/supportive vol scores higher; extreme vol scores lower.
 */
function volatilityToHealthComponent(volatility: VolatilityAnalysis): number {
  return clamp(round(100 - volatility.score, 1), 0, 100);
}

function averageSectorScore(sector: SectorStrengthAnalysis): number {
  if (sector.sectors.length === 0) return 50;
  const sum = sector.sectors.reduce((total, row) => total + row.score, 0);
  return clamp(round(sum / sector.sectors.length, 1), 0, 100);
}

function momentumComponent(
  context: MarketContext,
  breadth: BreadthAnalysis,
  sector: SectorStrengthAnalysis
): number {
  const breadthMomentumMapped = clamp(
    round(50 + breadth.breadthMomentum * 2.5, 1),
    0,
    100
  );
  const leaderBias =
    sector.leaders.length > 0
      ? clamp(round(sector.leaders[0].score, 1), 0, 100)
      : 50;
  const strengthBias = context.marketStrength;
  return clamp(
    round(
      breadthMomentumMapped * 0.35 + leaderBias * 0.35 + strengthBias * 0.3,
      1
    ),
    0,
    100
  );
}

/**
 * Weighted institutional health score 0–100.
 */
export function calculateHealthScore(
  context: MarketContext,
  breadth: BreadthAnalysis,
  sector: SectorStrengthAnalysis,
  volatility: VolatilityAnalysis,
  weights: AggregatorHealthWeights = DEFAULT_AGGREGATOR_CONFIG.weights
): number {
  const components = {
    marketTrend: trendToHealthComponent(context.marketTrend),
    breadth: breadth.score,
    sector: averageSectorScore(sector),
    volatility: volatilityToHealthComponent(volatility),
    momentum: momentumComponent(context, breadth, sector),
    participation: breadth.participationPercent,
  };

  const weightSum =
    weights.marketTrend +
    weights.breadth +
    weights.sector +
    weights.volatility +
    weights.momentum +
    weights.participation;

  const safeWeight = weightSum > 0 ? weightSum : 1;

  return clamp(
    round(
      (components.marketTrend * weights.marketTrend +
        components.breadth * weights.breadth +
        components.sector * weights.sector +
        components.volatility * weights.volatility +
        components.momentum * weights.momentum +
        components.participation * weights.participation) /
        safeWeight,
      1
    ),
    0,
    100
  );
}

/**
 * Consensus risk mode across available subsystem signals.
 */
export function aggregateRiskMode(
  context: MarketContext,
  breadth: BreadthAnalysis,
  volatility: VolatilityAnalysis
): RiskMode {
  const votes: RiskMode[] = [context.riskMode, volatility.riskMode];

  if (breadth.score >= 60 && context.marketStrength >= 55) {
    votes.push("Risk On");
  } else if (breadth.score <= 40 || volatility.score >= 65) {
    votes.push("Risk Off");
  } else {
    votes.push("Neutral");
  }

  const counts: Record<RiskMode, number> = {
    "Risk On": 0,
    Neutral: 0,
    "Risk Off": 0,
  };
  for (const vote of votes) counts[vote] += 1;

  if (counts["Risk Off"] >= counts["Risk On"] && counts["Risk Off"] >= counts.Neutral) {
    if (counts["Risk Off"] > counts.Neutral || counts["Risk Off"] > counts["Risk On"]) {
      return "Risk Off";
    }
  }
  if (counts["Risk On"] > counts.Neutral && counts["Risk On"] >= counts["Risk Off"]) {
    return "Risk On";
  }
  return "Neutral";
}

function signalsConflict(
  context: MarketContext,
  breadth: BreadthAnalysis,
  volatility: VolatilityAnalysis
): boolean {
  const bullishContext =
    context.marketTrend === "Strong Bull" || context.marketTrend === "Weak Bull";
  const bearishContext =
    context.marketTrend === "Strong Bear" || context.marketTrend === "Weak Bear";
  const strongBreadth = breadth.score >= 60;
  const weakBreadth = breadth.score <= 40;
  const stressedVol = volatility.score >= 65;
  const calmVol = volatility.score <= 40;

  if (bullishContext && weakBreadth) return true;
  if (bearishContext && strongBreadth) return true;
  if (bullishContext && stressedVol && context.riskMode === "Risk On") return true;
  if (bearishContext && calmVol && context.riskMode === "Risk Off") return true;
  if (context.riskMode === "Risk On" && volatility.riskMode === "Risk Off") return true;
  if (context.riskMode === "Risk Off" && volatility.riskMode === "Risk On") return true;
  return false;
}

/**
 * Aggregated confidence — reduced by missing data, conflicts, and weak subsystem confidence.
 */
export function calculateAggregatorConfidence(
  availability: AggregatorSectionAvailability,
  context: MarketContext,
  breadth: BreadthAnalysis,
  sector: SectorStrengthAnalysis,
  volatility: VolatilityAnalysis,
  config: AggregatorConfig = DEFAULT_AGGREGATOR_CONFIG
): { confidence: number; warnings: string[] } {
  const warnings: string[] = [];
  const subsystemScores: number[] = [];

  if (availability.context) subsystemScores.push(context.confidence);
  else warnings.push("Market context subsystem unavailable");

  if (availability.breadth) subsystemScores.push(breadth.confidence);
  else warnings.push("Breadth subsystem unavailable");

  if (availability.sector) subsystemScores.push(sector.confidence);
  else warnings.push("Sector strength subsystem unavailable");

  if (availability.volatility) subsystemScores.push(volatility.confidence);
  else warnings.push("Volatility subsystem unavailable");

  const missingCount =
    Number(!availability.context) +
    Number(!availability.breadth) +
    Number(!availability.sector) +
    Number(!availability.volatility);

  let confidence =
    subsystemScores.length > 0
      ? subsystemScores.reduce((sum, value) => sum + value, 0) /
        subsystemScores.length
      : 20;

  confidence -= missingCount * config.missingSubsystemPenalty;

  if (signalsConflict(context, breadth, volatility)) {
    confidence -= config.conflictConfidencePenalty;
    warnings.push("Conflicting signals across market subsystems");
  }

  if (
    availability.breadth &&
    breadth.confidence < config.lowSubsystemConfidenceThreshold
  ) {
    confidence -= config.lowSubsystemConfidencePenalty;
    warnings.push("Low breadth confidence");
  }
  if (
    availability.sector &&
    sector.confidence < config.lowSubsystemConfidenceThreshold
  ) {
    confidence -= config.lowSubsystemConfidencePenalty;
    warnings.push("Low sector confidence");
  }
  if (
    availability.volatility &&
    volatility.confidence < config.lowSubsystemConfidenceThreshold
  ) {
    confidence -= config.lowSubsystemConfidencePenalty;
    warnings.push("Low volatility confidence");
  }

  if (missingCount >= 3) {
    warnings.push("Severe API degradation — multiple subsystems offline");
  } else if (missingCount > 0) {
    warnings.push("Partial API degradation detected");
  }

  return {
    confidence: clamp(round(confidence, 1), 0, 100),
    warnings: dedupe(warnings),
  };
}

/**
 * Institutional summary — 5–8 concise explainable points.
 */
export function buildInstitutionalSummary(
  context: MarketContext,
  breadth: BreadthAnalysis,
  sector: SectorStrengthAnalysis,
  volatility: VolatilityAnalysis,
  riskMode: RiskMode,
  config: AggregatorConfig = DEFAULT_AGGREGATOR_CONFIG
): string[] {
  const points: string[] = [];

  if (breadth.score >= 60) {
    points.push("Broad market participation remains strong.");
  } else if (breadth.score <= 40) {
    points.push("Market participation is narrow and selective.");
  } else {
    points.push("Market participation is balanced.");
  }

  if (sector.leaders.length > 0) {
    points.push(`${sector.leaders[0].sector} continue leading.`);
  }
  if (sector.weakest.length > 0 && sector.weakest[0].score <= 45) {
    points.push(`${sector.weakest[0].sector} remain under pressure.`);
  }

  if (sector.rotation.improving.length > 0) {
    points.push(
      `Sector rotation improving in ${sector.rotation.improving.slice(0, 2).join(" and ")}.`
    );
  }

  if (volatility.indiaVix > 0 && volatility.score <= 40) {
    points.push("India VIX remains subdued.");
  } else if (volatility.score >= 65) {
    points.push("Volatility conditions are elevated.");
  } else if (volatility.indiaVix > 0) {
    points.push(`India VIX holds near ${round(volatility.indiaVix, 1)}.`);
  }

  if (breadth.largeCapBreadth >= 60 && breadth.breadthMomentum > 0) {
    points.push("Momentum improving across large caps.");
  } else if (breadth.breadthMomentum < -5) {
    points.push("Breadth momentum is deteriorating.");
  }

  if (riskMode === "Risk On") {
    points.push("Risk appetite remains positive.");
  } else if (riskMode === "Risk Off") {
    points.push("Risk appetite is defensive.");
  } else {
    points.push("Risk posture remains neutral.");
  }

  if (
    context.marketTrend === "Strong Bull" ||
    context.marketTrend === "Weak Bull"
  ) {
    points.push(`Trend bias is ${context.marketTrend.toLowerCase()}.`);
  } else if (
    context.marketTrend === "Strong Bear" ||
    context.marketTrend === "Weak Bear"
  ) {
    points.push(`Trend bias is ${context.marketTrend.toLowerCase()}.`);
  }

  const unique = dedupe(points);
  const capped = unique.slice(0, config.summaryMaxPoints);
  if (capped.length >= config.summaryMinPoints) return capped;

  while (capped.length < config.summaryMinPoints) {
    capped.push("Institutional market context remains under active monitoring.");
  }
  return capped.slice(0, config.summaryMaxPoints);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Fingerprint for cache invalidation — avoids re-aggregation when unchanged.
 */
export function buildAggregatorFingerprint(input: AggregatorInput): string {
  const ctx = input.context;
  const breadth = input.breadth;
  const sector = input.sector;
  const vol = input.volatility;

  return [
    ctx
      ? `${ctx.marketTrend}|${ctx.marketStrength}|${ctx.riskMode}|${ctx.confidence}|${ctx.lastUpdated.getTime()}`
      : "ctx:null",
    breadth
      ? `${breadth.score}|${breadth.breadthPercent}|${breadth.confidence}|${breadth.lastUpdated.getTime()}`
      : "br:null",
    sector
      ? `${sector.sectors.length}|${sector.confidence}|${sector.leaders[0]?.score ?? 0}|${sector.lastUpdated.getTime()}`
      : "sec:null",
    vol
      ? `${vol.score}|${vol.regime}|${vol.indiaVix}|${vol.confidence}|${vol.lastUpdated.getTime()}`
      : "vol:null",
  ].join("::");
}

/**
 * Assemble InstitutionalMarketContext from existing subsystem outputs.
 * Missing subsystems degrade gracefully with fallbacks + warnings.
 */
export function aggregateInstitutionalMarketContext(
  input: AggregatorInput
): InstitutionalMarketContext {
  const config = resolveAggregatorConfig(input.config);
  const timestamp = input.timestamp ?? new Date();

  const availability: AggregatorSectionAvailability = {
    context: input.context !== null,
    breadth: input.breadth !== null,
    sector: input.sector !== null,
    volatility: input.volatility !== null,
  };

  const context =
    input.context ??
    createFallbackMarketContext(
      timestamp,
      "Market context missing — neutral fallback in aggregator"
    );
  const breadth =
    input.breadth ??
    createFallbackBreadthAnalysis(
      timestamp,
      "Breadth missing — neutral fallback in aggregator"
    );
  const sector =
    input.sector ??
    createFallbackSectorStrengthAnalysis(
      timestamp,
      "Sector strength missing — neutral fallback in aggregator"
    );
  const volatility =
    input.volatility ??
    createFallbackVolatilityAnalysis(
      timestamp,
      "Volatility missing — neutral fallback in aggregator"
    );

  // Complete failure — all subsystems missing.
  if (
    !availability.context &&
    !availability.breadth &&
    !availability.sector &&
    !availability.volatility
  ) {
    const { confidence, warnings } = calculateAggregatorConfidence(
      availability,
      context,
      breadth,
      sector,
      volatility,
      config
    );
    return {
      timestamp,
      marketTrend: "Sideways",
      marketStrength: 50,
      marketBreadth: breadth,
      sectorStrength: sector.sectors,
      sectorRotation: sector.rotation,
      volatility,
      riskMode: "Neutral",
      confidence,
      healthScore: 50,
      qualityGrade: "C",
      summary: buildInstitutionalSummary(
        context,
        breadth,
        sector,
        volatility,
        "Neutral",
        config
      ),
      warnings: dedupe([
        ...warnings,
        "Complete API failure — neutral institutional context applied",
      ]),
    };
  }

  const riskMode = aggregateRiskMode(context, breadth, volatility);
  const healthScore = calculateHealthScore(
    context,
    breadth,
    sector,
    volatility,
    config.weights
  );
  const qualityGrade = classifyQualityGrade(healthScore, config);
  const { confidence, warnings } = calculateAggregatorConfidence(
    availability,
    context,
    breadth,
    sector,
    volatility,
    config
  );
  const summary = buildInstitutionalSummary(
    context,
    breadth,
    sector,
    volatility,
    riskMode,
    config
  );

  return {
    timestamp,
    marketTrend: context.marketTrend,
    marketStrength: context.marketStrength,
    marketBreadth: breadth,
    sectorStrength: sector.sectors,
    sectorRotation: sector.rotation,
    volatility,
    riskMode,
    confidence,
    healthScore,
    qualityGrade,
    summary,
    warnings,
  };
}
