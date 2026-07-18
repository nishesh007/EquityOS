/**
 * Strategy Eligibility utilities — Sprint 11B.2C.
 * Pure deterministic evaluation against StrategyMatrix + regime/context.
 * Never recalculates trend / breadth / sector / volatility internals.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  MarketRegimeLabel,
} from "@/src/modules/marketRegime";
import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_STRATEGY_ELIGIBILITY_CONFIG,
  type EligibleStrategy,
  type StrategyCategory,
  type StrategyEligibilityConfig,
  type StrategyEligibilityInput,
  type StrategyEligibilitySnapshot,
  type StrategyEligibilityWeights,
  type StrategyProfile,
} from "./StrategyEligibilityTypes";
import { STRATEGY_MATRIX } from "./StrategyMatrix";

export function resolveStrategyEligibilityConfig(
  partial?: StrategyEligibilityInput["config"]
): StrategyEligibilityConfig {
  return {
    ...DEFAULT_STRATEGY_ELIGIBILITY_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_STRATEGY_ELIGIBILITY_CONFIG.weights,
      ...partial?.weights,
    },
    categoryOrder:
      partial?.categoryOrder ?? DEFAULT_STRATEGY_ELIGIBILITY_CONFIG.categoryOrder,
  };
}

export function averageSectorScore(
  context: InstitutionalMarketContext
): number {
  if (context.sectorStrength.length === 0) return 0;
  const sum = context.sectorStrength.reduce((total, s) => total + s.score, 0);
  return clamp(round(sum / context.sectorStrength.length, 1), 0, 100);
}

export function isEligibilityInputIncomplete(
  context: InstitutionalMarketContext | null | undefined,
  regime: MarketRegime | null | undefined
): boolean {
  if (!context || !regime) return true;
  if (!regime.regime) return true;
  if (!Number.isFinite(regime.confidence)) return true;
  if (!Number.isFinite(context.marketStrength)) return true;
  if (!Number.isFinite(context.healthScore)) return true;
  if (!context.marketBreadth || !Number.isFinite(context.marketBreadth.score)) {
    return true;
  }
  if (!context.volatility || !Number.isFinite(context.volatility.score)) {
    return true;
  }
  return false;
}

/**
 * Score how well the current regime matches the strategy profile (0–100).
 */
export function scoreRegimeMatch(
  regime: MarketRegimeLabel,
  profile: StrategyProfile
): number {
  if (profile.blockedRegimes.includes(regime)) return 0;
  if (profile.supportedRegimes.includes(regime)) return 100;
  return 25;
}

function scoreAgainstMinimum(
  value: number,
  minimum: number,
  config: StrategyEligibilityConfig
): number {
  if (!Number.isFinite(value)) {
    return clamp(
      config.scoreFloor,
      config.scoreFloor,
      config.scoreCeiling
    );
  }
  if (value >= minimum) {
    const surplus = value - minimum;
    return clamp(round(70 + surplus * 0.6, 1), config.scoreFloor, config.scoreCeiling);
  }
  const deficit = minimum - value;
  return clamp(round(50 - deficit * 1.2, 1), config.scoreFloor, config.scoreCeiling);
}

export function computeEligibilityScore(
  context: InstitutionalMarketContext,
  regime: MarketRegime,
  profile: StrategyProfile,
  config: StrategyEligibilityConfig = DEFAULT_STRATEGY_ELIGIBILITY_CONFIG
): number {
  const weights: StrategyEligibilityWeights = config.weights;
  const sectorAvg = averageSectorScore(context);

  const regimeScore = scoreRegimeMatch(regime.regime, profile);
  const confidenceScore = scoreAgainstMinimum(
    regime.confidence,
    profile.minimumConfidence,
    config
  );
  const breadthScore = scoreAgainstMinimum(
    context.marketBreadth.score,
    profile.minimumBreadth,
    config
  );
  const sectorScore = scoreAgainstMinimum(
    sectorAvg,
    profile.minimumSectorStrength,
    config
  );
  const strengthScore = scoreAgainstMinimum(
    context.marketStrength,
    profile.minimumMarketStrength,
    config
  );
  const healthScore = scoreAgainstMinimum(
    context.healthScore,
    profile.minimumHealthScore,
    config
  );

  const composite =
    regimeScore * weights.regimeMatch +
    confidenceScore * weights.confidence +
    breadthScore * weights.breadth +
    sectorScore * weights.sectorStrength +
    strengthScore * weights.marketStrength +
    healthScore * weights.healthScore;

  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

/**
 * Collect hard-gate rejection reasons. Empty array = all mandatory gates pass.
 */
export function collectBlockedReasons(
  context: InstitutionalMarketContext,
  regime: MarketRegime,
  profile: StrategyProfile,
  config: StrategyEligibilityConfig
): string[] {
  const blocked: string[] = [];

  if (!profile.enabled) {
    blocked.push("Strategy disabled in eligibility matrix.");
  }

  if (profile.blockedRegimes.includes(regime.regime)) {
    blocked.push(`Blocked in ${regime.regime} regime.`);
  } else if (!profile.supportedRegimes.includes(regime.regime)) {
    blocked.push(`Regime ${regime.regime} is not supported for this strategy.`);
  }

  if (regime.confidence < profile.minimumConfidence) {
    blocked.push("Market confidence below threshold.");
  }

  if (context.healthScore < profile.minimumHealthScore) {
    blocked.push("Health score below strategy minimum.");
  }

  if (context.marketBreadth.score < profile.minimumBreadth) {
    blocked.push("Breadth insufficient.");
  }

  const sectorAvg = averageSectorScore(context);
  if (context.sectorStrength.length === 0) {
    blocked.push("Sector participation data missing.");
  } else if (sectorAvg < profile.minimumSectorStrength) {
    blocked.push("Sector participation weak.");
  }

  if (context.marketStrength < profile.minimumMarketStrength) {
    blocked.push("Market strength below strategy minimum.");
  }

  if (profile.blockedRiskModes.includes(context.riskMode)) {
    blocked.push(`Risk Mode = ${context.riskMode}.`);
  }

  const volScore = context.volatility.score;
  if (
    profile.maximumVolatilityScore !== null &&
    volScore > profile.maximumVolatilityScore
  ) {
    blocked.push("Volatility above strategy maximum.");
  }
  if (
    profile.minimumVolatilityScore !== null &&
    volScore < profile.minimumVolatilityScore
  ) {
    blocked.push("Volatility below strategy minimum.");
  }

  const score = computeEligibilityScore(context, regime, profile, config);
  if (score < config.minimumEligibilityScore && blocked.length === 0) {
    blocked.push("Eligibility score below institutional minimum.");
  }

  return blocked;
}

export function collectSupportReasons(
  context: InstitutionalMarketContext,
  regime: MarketRegime,
  profile: StrategyProfile,
  score: number
): string[] {
  const reasons: string[] = [];

  if (profile.supportedRegimes.includes(regime.regime)) {
    reasons.push(`Regime ${regime.regime} aligns with strategy profile.`);
  }
  if (regime.confidence >= profile.minimumConfidence) {
    reasons.push(
      `Regime confidence ${round(regime.confidence, 0)} meets minimum ${profile.minimumConfidence}.`
    );
  }
  if (context.marketBreadth.score >= profile.minimumBreadth) {
    reasons.push("Breadth supports strategy participation.");
  }
  const sectorAvg = averageSectorScore(context);
  if (
    context.sectorStrength.length > 0 &&
    sectorAvg >= profile.minimumSectorStrength
  ) {
    reasons.push("Sector strength confirms eligibility.");
  }
  if (context.marketStrength >= profile.minimumMarketStrength) {
    reasons.push("Market strength adequate for execution.");
  }
  if (context.healthScore >= profile.minimumHealthScore) {
    reasons.push("Context health score within tolerance.");
  }
  if (!profile.blockedRiskModes.includes(context.riskMode)) {
    reasons.push(`Risk mode ${context.riskMode} permitted.`);
  }
  reasons.push(`Eligibility score ${score}/100.`);
  return reasons;
}

export function evaluateStrategyEligibility(
  context: InstitutionalMarketContext,
  regime: MarketRegime,
  profile: StrategyProfile,
  config: StrategyEligibilityConfig = DEFAULT_STRATEGY_ELIGIBILITY_CONFIG
): EligibleStrategy {
  const score = computeEligibilityScore(context, regime, profile, config);
  const blockedReasons = collectBlockedReasons(
    context,
    regime,
    profile,
    config
  );
  const eligible = blockedReasons.length === 0;
  const reasons = eligible
    ? collectSupportReasons(context, regime, profile, score)
    : [];

  return {
    strategyId: profile.id,
    name: profile.name,
    category: profile.category,
    eligible,
    priority: profile.priority,
    score,
    reasons,
    blockedReasons,
  };
}

function categoryRank(
  category: StrategyCategory,
  order: readonly StrategyCategory[]
): number {
  const index = order.indexOf(category);
  return index === -1 ? order.length : index;
}

/**
 * Sort eligible strategies: Priority ↓ → Score ↓ → Category order.
 */
export function sortEligibleStrategies(
  strategies: EligibleStrategy[],
  config: StrategyEligibilityConfig = DEFAULT_STRATEGY_ELIGIBILITY_CONFIG
): EligibleStrategy[] {
  return [...strategies].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.score !== a.score) return b.score - a.score;
    return (
      categoryRank(a.category, config.categoryOrder) -
      categoryRank(b.category, config.categoryOrder)
    );
  });
}

export function buildEligibilitySummary(
  snapshot: Pick<
    StrategyEligibilitySnapshot,
    "regime" | "confidence" | "eligible" | "rejected" | "warnings"
  >
): string[] {
  const summary: string[] = [
    `Market regime: ${snapshot.regime} (confidence ${round(snapshot.confidence, 0)}).`,
    `${snapshot.eligible.length} strategies eligible.`,
    `${snapshot.rejected.length} strategies rejected.`,
  ];

  if (snapshot.eligible.length > 0) {
    const top = snapshot.eligible.slice(0, 3).map((s) => s.name);
    summary.push(`Top eligible: ${top.join(", ")}.`);
  } else {
    summary.push("No strategies cleared institutional eligibility gates.");
  }

  if (snapshot.warnings.length > 0) {
    summary.push(snapshot.warnings[0]!);
  }

  return summary.slice(0, 5);
}

/**
 * Evaluate the full strategy matrix against context + regime.
 */
export function evaluateStrategyMatrix(
  input: StrategyEligibilityInput
): StrategyEligibilitySnapshot {
  const config = resolveStrategyEligibilityConfig(input.config);
  const profiles = input.profiles ?? STRATEGY_MATRIX;
  const timestamp = input.context?.timestamp ?? new Date();
  const warnings: string[] = [];

  if (isEligibilityInputIncomplete(input.context, input.regime)) {
    warnings.push(
      "Incomplete market context or regime — eligibility reduced; all strategies rejected."
    );
    const degradedScore = clamp(
      config.scoreCeiling - config.missingContextPenalty - 20,
      config.scoreFloor,
      config.scoreCeiling
    );
    const rejected = profiles.map((profile) => ({
      strategyId: profile.id,
      name: profile.name,
      category: profile.category,
      eligible: false,
      priority: profile.priority,
      score: degradedScore,
      reasons: [],
      blockedReasons: [
        "Incomplete market context or regime data.",
        "Eligibility cannot be confirmed.",
      ],
    }));

    const snapshot: StrategyEligibilitySnapshot = {
      timestamp,
      regime: input.regime?.regime ?? "Sideways",
      confidence: input.regime?.confidence ?? 0,
      marketStrength: input.context?.marketStrength ?? 0,
      healthScore: input.context?.healthScore ?? 0,
      riskMode: input.context?.riskMode ?? "Neutral",
      strategies: rejected,
      eligible: [],
      rejected,
      summary: [],
      warnings,
    };
    snapshot.summary = buildEligibilitySummary(snapshot);
    return snapshot;
  }

  const context = input.context as InstitutionalMarketContext;
  const regime = input.regime as MarketRegime;

  if (context.warnings.length > 0) {
    warnings.push(...context.warnings.slice(0, 3));
  }
  if (context.sectorStrength.length === 0) {
    warnings.push("Sector strength empty — sector gates will fail.");
  }

  const evaluated = profiles.map((profile) =>
    evaluateStrategyEligibility(context, regime, profile, config)
  );

  const eligible = sortEligibleStrategies(
    evaluated.filter((s) => s.eligible),
    config
  );
  const rejected = evaluated
    .filter((s) => !s.eligible)
    .sort((a, b) => b.priority - a.priority);

  const strategies = [...eligible, ...rejected];

  const snapshot: StrategyEligibilitySnapshot = {
    timestamp: context.timestamp,
    regime: regime.regime,
    confidence: regime.confidence,
    marketStrength: context.marketStrength,
    healthScore: context.healthScore,
    riskMode: context.riskMode,
    strategies,
    eligible,
    rejected,
    summary: [],
    warnings,
  };
  snapshot.summary = buildEligibilitySummary(snapshot);
  return snapshot;
}

export function createFallbackEligibilitySnapshot(
  timestamp: Date = new Date(),
  reason = "Strategy eligibility evaluation failed — all strategies rejected."
): StrategyEligibilitySnapshot {
  const rejected = STRATEGY_MATRIX.map((profile) => ({
    strategyId: profile.id,
    name: profile.name,
    category: profile.category,
    eligible: false,
    priority: profile.priority,
    score: 0,
    reasons: [],
    blockedReasons: [reason],
  }));

  const snapshot: StrategyEligibilitySnapshot = {
    timestamp,
    regime: "Sideways",
    confidence: 0,
    marketStrength: 0,
    healthScore: 0,
    riskMode: "Neutral",
    strategies: rejected,
    eligible: [],
    rejected,
    summary: [],
    warnings: [reason],
  };
  snapshot.summary = buildEligibilitySummary(snapshot);
  return snapshot;
}
