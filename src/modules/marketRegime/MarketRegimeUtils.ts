/**
 * Market Regime utilities — Sprint 11B.2A.
 * Pure rule evaluation against InstitutionalMarketContext.
 * Never recalculates trend / breadth / volatility / sector internals.
 *
 * RULE CATALOG (priority descending):
 * ┌──────────┬─────────────────────────┬──────────────────────────────────────────┐
 * │ Priority │ Rule                    │ Result                                   │
 * ├──────────┼─────────────────────────┼──────────────────────────────────────────┤
 * │ 100      │ high_volatility_override│ High Volatility                          │
 * │  95      │ event_driven_stress     │ Event Driven                             │
 * │  85      │ strong_bull_confirmed   │ Strong Bull                              │
 * │  85      │ strong_bear_confirmed   │ Strong Bear                              │
 * │  70      │ weak_bull_bias          │ Weak Bull                                │
 * │  70      │ weak_bear_bias          │ Weak Bear                                │
 * │  55      │ low_volatility_quiet    │ Low Volatility                           │
 * │  10      │ sideways_mixed_fallback │ Sideways                                 │
 * └──────────┴─────────────────────────┴──────────────────────────────────────────┘
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_MARKET_REGIME_CONFIG,
  type MarketRegime,
  type MarketRegimeClassification,
  type MarketRegimeConfig,
  type MarketRegimeRule,
  type MarketRegimeRuleMatch,
  type RegimeConfidenceAnalysis,
  type RegimeContextFeatures,
} from "./MarketRegimeTypes";

export function resolveMarketRegimeConfig(
  partial?: Partial<MarketRegimeConfig>
): MarketRegimeConfig {
  return { ...DEFAULT_MARKET_REGIME_CONFIG, ...partial };
}

function averageSectorScore(context: InstitutionalMarketContext): number {
  const sectors = context.sectorStrength;
  if (sectors.length === 0) return 50;
  const sum = sectors.reduce((total, sector) => total + sector.score, 0);
  return clamp(round(sum / sectors.length, 1), 0, 100);
}

function sectorParticipationRatio(context: InstitutionalMarketContext): number {
  const sectors = context.sectorStrength;
  if (sectors.length === 0) return 0.5;
  const advancing = sectors.filter((sector) => sector.score >= 55).length;
  return advancing / sectors.length;
}

/**
 * Project InstitutionalMarketContext into boolean/numeric features for rules.
 */
export function extractRegimeFeatures(
  context: InstitutionalMarketContext,
  config: MarketRegimeConfig = DEFAULT_MARKET_REGIME_CONFIG
): RegimeContextFeatures {
  const trend = context.marketTrend;
  const volRegime = context.volatility.regime;
  const avgSector = averageSectorScore(context);

  return {
    averageSectorScore: avgSector,
    sectorParticipationRatio: sectorParticipationRatio(context),
    isBullTrend: trend === "Strong Bull" || trend === "Weak Bull",
    isBearTrend: trend === "Strong Bear" || trend === "Weak Bear",
    isStrongBullTrend: trend === "Strong Bull",
    isStrongBearTrend: trend === "Strong Bear",
    isHighVolatility:
      volRegime === "High" ||
      volRegime === "Extreme" ||
      context.volatility.score >= config.volatilityHighMin,
    isExtremeVolatility:
      volRegime === "Extreme" ||
      context.volatility.score >= config.volatilityExtremeMin,
    isLowVolatility:
      volRegime === "Low" ||
      volRegime === "Very Low" ||
      context.volatility.score <= config.volatilityLowMax,
    isVeryLowVolatility:
      volRegime === "Very Low" ||
      context.volatility.score <= config.volatilityVeryLowMax,
    hasMaterialGap:
      Math.abs(context.volatility.gapPercent) >= config.gapEventMinPct,
    hasAtrExpansion: context.volatility.atrExpansion,
    hasConflicts: context.warnings.some((warning) =>
      /conflict/i.test(warning)
    ),
    isIncomplete:
      context.warnings.some((warning) =>
        /unavailable|missing|degradation|failure/i.test(warning)
      ) || context.confidence < config.lowContextConfidenceThreshold,
    qualitySupportive:
      context.qualityGrade === "A+" ||
      context.qualityGrade === "A" ||
      context.qualityGrade === "B",
    qualityWeak: context.qualityGrade === "C",
  };
}

function createRule(
  rule: MarketRegimeRule
): MarketRegimeRule {
  return rule;
}

/**
 * Built-in institutional regime rules — modular and extensible.
 */
export function buildDefaultMarketRegimeRules(): readonly MarketRegimeRule[] {
  return [
    createRule({
      name: "high_volatility_override",
      priority: 100,
      resultingRegime: "High Volatility",
      reason:
        "Extreme volatility overrides directional bias under Risk Off conditions.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (features.isExtremeVolatility && context.riskMode === "Risk Off") {
          return true;
        }
        return (
          features.isHighVolatility &&
          context.riskMode === "Risk Off" &&
          context.volatility.score >= config.volatilityHighMin
        );
      },
    }),

    createRule({
      name: "event_driven_stress",
      priority: 95,
      resultingRegime: "Event Driven",
      reason:
        "Material gap with volatility expansion indicates event-driven conditions.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (
          features.hasMaterialGap &&
          (features.hasAtrExpansion || features.isHighVolatility)
        ) {
          return true;
        }
        return (
          features.isExtremeVolatility &&
          features.hasMaterialGap &&
          (features.hasConflicts || features.isIncomplete)
        );
      },
    }),

    createRule({
      name: "strong_bull_confirmed",
      priority: 85,
      resultingRegime: "Strong Bull",
      reason:
        "Bullish trend confirmed by strength, breadth, and sector participation.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (features.isHighVolatility && context.riskMode === "Risk Off") {
          return false;
        }
        const strengthOk =
          context.marketStrength >= config.strongBullStrengthMin;
        const breadthOk =
          context.marketBreadth.score >= config.breadthStrongMin;
        const participationOk =
          context.marketBreadth.participationPercent >=
          config.participationStrongMin;
        const sectorOk = features.averageSectorScore >= config.sectorStrongMin;
        const healthOk = context.healthScore >= config.healthStrongMin;
        const trendOk =
          features.isStrongBullTrend ||
          (features.isBullTrend && strengthOk && breadthOk);

        const confirmations = [
          strengthOk,
          breadthOk,
          participationOk || sectorOk,
          healthOk || features.qualitySupportive,
          context.riskMode === "Risk On" || context.riskMode === "Neutral",
        ].filter(Boolean).length;

        return trendOk && confirmations >= 3 && !features.hasConflicts;
      },
    }),

    createRule({
      name: "strong_bear_confirmed",
      priority: 85,
      resultingRegime: "Strong Bear",
      reason:
        "Bearish trend confirmed by weak breadth, weak sectors, and defensive risk.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (features.isExtremeVolatility && context.riskMode === "Risk Off") {
          // High Volatility override owns extreme Risk Off tapes.
          return false;
        }
        const strengthOk =
          context.marketStrength <= config.strongBearStrengthMax;
        const breadthOk =
          context.marketBreadth.score <= config.breadthWeakMax;
        const participationOk =
          context.marketBreadth.participationPercent <=
            config.participationWeakMax ||
          features.averageSectorScore <= config.sectorWeakMax;
        const healthOk = context.healthScore <= config.healthWeakMax;
        const trendOk =
          features.isStrongBearTrend ||
          (features.isBearTrend && strengthOk && breadthOk);

        const confirmations = [
          strengthOk,
          breadthOk,
          participationOk,
          healthOk || features.qualityWeak,
          context.riskMode === "Risk Off" || context.riskMode === "Neutral",
        ].filter(Boolean).length;

        return trendOk && confirmations >= 3 && !features.hasConflicts;
      },
    }),

    createRule({
      name: "weak_bull_bias",
      priority: 70,
      resultingRegime: "Weak Bull",
      reason: "Bullish bias with moderate institutional confirmation.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (features.isHighVolatility && context.riskMode === "Risk Off") {
          return false;
        }
        if (!features.isBullTrend && context.marketTrend !== "Sideways") {
          return false;
        }
        const strengthOk = context.marketStrength >= config.bullStrengthMin;
        const breadthOk =
          context.marketBreadth.score >= config.breadthStrongMin - 8;
        const sectorOk =
          features.averageSectorScore >= config.sectorStrongMin - 6;
        const confirmations = [
          strengthOk,
          breadthOk,
          sectorOk,
          context.riskMode !== "Risk Off",
          !features.isHighVolatility,
        ].filter(Boolean).length;

        return (
          (features.isBullTrend ||
            (context.marketTrend === "Sideways" && strengthOk && breadthOk)) &&
          confirmations >= 3 &&
          !features.hasConflicts
        );
      },
    }),

    createRule({
      name: "weak_bear_bias",
      priority: 70,
      resultingRegime: "Weak Bear",
      reason: "Bearish bias with moderate defensive confirmation.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (features.isExtremeVolatility && context.riskMode === "Risk Off") {
          return false;
        }
        if (!features.isBearTrend && context.marketTrend !== "Sideways") {
          return false;
        }
        const strengthOk = context.marketStrength <= config.bearStrengthMax;
        const breadthOk =
          context.marketBreadth.score <= config.breadthWeakMax + 8;
        const sectorOk =
          features.averageSectorScore <= config.sectorWeakMax + 6;
        const confirmations = [
          strengthOk,
          breadthOk,
          sectorOk,
          context.riskMode !== "Risk On",
          !features.isVeryLowVolatility,
        ].filter(Boolean).length;

        return (
          (features.isBearTrend ||
            (context.marketTrend === "Sideways" && strengthOk && breadthOk)) &&
          confirmations >= 3 &&
          !features.hasConflicts
        );
      },
    }),

    createRule({
      name: "low_volatility_quiet",
      priority: 55,
      resultingRegime: "Low Volatility",
      reason: "Volatility remains subdued without a strong directional setup.",
      matches(context, config) {
        const features = extractRegimeFeatures(context, config);
        if (!features.isLowVolatility) return false;
        if (features.isStrongBullTrend || features.isStrongBearTrend) {
          return false;
        }
        const notStrongDirection =
          context.marketStrength < config.strongBullStrengthMin &&
          context.marketStrength > config.strongBearStrengthMax;
        return (
          features.isVeryLowVolatility ||
          (features.isLowVolatility &&
            notStrongDirection &&
            context.riskMode !== "Risk Off")
        );
      },
    }),

    createRule({
      name: "sideways_mixed_fallback",
      priority: 10,
      resultingRegime: "Sideways",
      reason:
        "Conflicting or insufficient signals resulted in Sideways classification.",
      matches() {
        // Always eligible as last-resort fallback; priority selects it when
        // no higher-priority rule matches.
        return true;
      },
    }),
  ];
}

/**
 * Evaluate all rules and return matches sorted by priority (desc).
 */
export function evaluateMarketRegimeRules(
  context: InstitutionalMarketContext,
  rules: readonly MarketRegimeRule[] = buildDefaultMarketRegimeRules(),
  config: MarketRegimeConfig = DEFAULT_MARKET_REGIME_CONFIG
): MarketRegimeRuleMatch[] {
  const matches: MarketRegimeRuleMatch[] = [];
  for (const rule of rules) {
    try {
      if (rule.matches(context, config)) {
        matches.push({ rule, reason: rule.reason });
      }
    } catch {
      // Individual rule failures must not abort classification.
    }
  }
  return matches.sort((a, b) => b.rule.priority - a.rule.priority);
}

function buildReasons(
  context: InstitutionalMarketContext,
  winner: MarketRegimeRuleMatch,
  features: RegimeContextFeatures
): string[] {
  const reasons: string[] = [winner.reason];

  if (context.marketBreadth.score >= 60) {
    reasons.push("Broad participation confirmed.");
  } else if (context.marketBreadth.score <= 40) {
    reasons.push("Market participation is narrow.");
  }

  if (context.marketStrength >= 70) {
    reasons.push("Market strength above institutional threshold.");
  } else if (context.marketStrength <= 35) {
    reasons.push("Market strength below institutional threshold.");
  }

  if (features.sectorParticipationRatio >= 0.55) {
    reasons.push("Sector leadership diversified.");
  } else if (features.sectorParticipationRatio <= 0.35) {
    reasons.push("Sector leadership concentrated / weak.");
  }

  if (
    winner.rule.resultingRegime === "High Volatility" ||
    winner.rule.resultingRegime === "Event Driven"
  ) {
    reasons.push("Extreme volatility overrides bullish trend.");
  }

  if (
    winner.rule.resultingRegime === "Sideways" &&
    (features.hasConflicts || features.isIncomplete)
  ) {
    reasons.push(
      "Conflicting signals resulted in Sideways classification."
    );
  }

  if (context.riskMode === "Risk On") {
    reasons.push("Risk appetite remains constructive.");
  } else if (context.riskMode === "Risk Off") {
    reasons.push("Risk appetite is defensive.");
  }

  return dedupe(reasons).slice(0, 8);
}

function calculateRegimeConfidence(
  context: InstitutionalMarketContext,
  winner: MarketRegimeRuleMatch,
  matchCount: number,
  features: RegimeContextFeatures,
  config: MarketRegimeConfig
): number {
  let confidence = context.confidence;

  // Agreement bonus when multiple rules align with the same regime.
  if (matchCount >= 2) confidence += 4;

  confidence += Math.min(winner.rule.priority / 20, 5);

  if (features.hasConflicts) {
    confidence -= config.conflictConfidencePenalty;
  }
  if (features.isIncomplete) {
    confidence -= config.conflictConfidencePenalty / 2;
  }
  if (context.confidence < config.lowContextConfidenceThreshold) {
    confidence = Math.min(confidence, config.incompleteContextConfidence + 15);
  }

  return clamp(round(confidence, 1), config.confidenceFloor, 100);
}

/**
 * Classify InstitutionalMarketContext into a regime classification
 * (confidenceAnalysis attached by RegimeConfidenceEngine / enricher).
 */
export function classifyMarketRegime(
  context: InstitutionalMarketContext,
  config: MarketRegimeConfig = DEFAULT_MARKET_REGIME_CONFIG,
  rules: readonly MarketRegimeRule[] = buildDefaultMarketRegimeRules()
): MarketRegimeClassification {
  const features = extractRegimeFeatures(context, config);
  const matches = evaluateMarketRegimeRules(context, rules, config);
  const winner =
    matches[0] ??
    ({
      rule: rules[rules.length - 1],
      reason: "Fallback Sideways classification.",
    } satisfies MarketRegimeRuleMatch);

  const sameRegimeCount = matches.filter(
    (match) => match.rule.resultingRegime === winner.rule.resultingRegime
  ).length;

  return {
    regime: winner.rule.resultingRegime,
    confidence: calculateRegimeConfidence(
      context,
      winner,
      sameRegimeCount,
      features,
      config
    ),
    priority: winner.rule.priority,
    reasons: buildReasons(context, winner, features),
    triggeredRules: matches.map((match) => match.rule.name),
    timestamp: context.timestamp ?? new Date(),
  };
}

/**
 * Safe fallback when InstitutionalMarketContext is missing or unusable.
 */
export function createFallbackMarketRegime(
  timestamp: Date = new Date(),
  reason = "Incomplete market context — Sideways regime with reduced confidence."
): MarketRegime {
  const confidenceAnalysis: RegimeConfidenceAnalysis = {
    score: DEFAULT_MARKET_REGIME_CONFIG.incompleteContextConfidence,
    grade: "Low",
    positiveReasons: [],
    negativeReasons: [reason],
    neutralReasons: ["Momentum remains stable."],
    contributions: [
      {
        factor: "Data Quality",
        title: "Missing Context",
        description: reason,
        score: 20,
        weight: 1,
        contribution: -30,
        direction: "Negative",
        reason,
      },
    ],
    summary: [
      "Insufficient evidence for high-confidence regime call.",
      "Overall institutional confidence remains low.",
    ],
  };

  return {
    regime: "Sideways",
    confidence: confidenceAnalysis.score,
    priority: 10,
    reasons: [reason],
    triggeredRules: ["sideways_incomplete_fallback"],
    timestamp,
    confidenceAnalysis,
  };
}

/**
 * True when context lacks the minimum fields required for classification.
 */
export function isInstitutionalContextIncomplete(
  context: InstitutionalMarketContext | null | undefined
): boolean {
  if (!context) return true;
  if (!(context.timestamp instanceof Date)) return true;
  if (!context.marketBreadth || !context.volatility) return true;
  if (!Array.isArray(context.sectorStrength)) return true;
  if (!Number.isFinite(context.marketStrength)) return true;
  if (!Number.isFinite(context.confidence)) return true;
  return false;
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
