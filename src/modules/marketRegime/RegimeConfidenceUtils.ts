/**
 * Regime Confidence utilities — Sprint 11B.2B.
 * Pure explainability scoring against InstitutionalMarketContext + MarketRegime.
 * Never recalculates trend / breadth / sector / volatility internals.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_REGIME_CONFIDENCE_CONFIG,
  type ConfidenceContribution,
  type ConfidenceDirection,
  type ConfidenceGrade,
  type MarketRegimeClassification,
  type MarketRegimeLabel,
  type RegimeConfidenceAnalysis,
  type RegimeConfidenceConfig,
  type RegimeConfidenceInput,
  type RegimeConfidenceWeights,
} from "./MarketRegimeTypes";
import { extractRegimeFeatures } from "./MarketRegimeUtils";

export function resolveRegimeConfidenceConfig(
  partial?: RegimeConfidenceInput["config"]
): RegimeConfidenceConfig {
  return {
    ...DEFAULT_REGIME_CONFIDENCE_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_REGIME_CONFIDENCE_CONFIG.weights,
      ...partial?.weights,
    },
  };
}

export function classifyConfidenceGrade(
  score: number,
  config: RegimeConfidenceConfig = DEFAULT_REGIME_CONFIDENCE_CONFIG
): ConfidenceGrade {
  if (score >= config.exceptionalMin) return "Exceptional";
  if (score >= config.highMin) return "High";
  if (score >= config.goodMin) return "Good";
  if (score >= config.moderateMin) return "Moderate";
  return "Low";
}

function directionFromScore(
  score: number,
  config: RegimeConfidenceConfig
): ConfidenceDirection {
  if (score >= 50 + config.neutralBand) return "Positive";
  if (score <= 50 - config.neutralBand) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

function isBullishRegime(regime: MarketRegimeLabel): boolean {
  return regime === "Strong Bull" || regime === "Weak Bull";
}

function isBearishRegime(regime: MarketRegimeLabel): boolean {
  return regime === "Strong Bear" || regime === "Weak Bear";
}

function averageSectorScore(context: InstitutionalMarketContext): number {
  if (context.sectorStrength.length === 0) return 50;
  const sum = context.sectorStrength.reduce((total, s) => total + s.score, 0);
  return clamp(round(sum / context.sectorStrength.length, 1), 0, 100);
}

/**
 * Score how well market trend agrees with the classified regime (0–100).
 */
export function scoreTrendAgreement(
  context: InstitutionalMarketContext,
  regime: MarketRegimeLabel
): { score: number; title: string; description: string; reason: string } {
  const trend = context.marketTrend;
  let score = 50;
  let reason = "Trend alignment is mixed relative to the classified regime.";
  let title = "Trend Confirmation";
  let description = "Index trend provides limited confirmation of the regime.";

  if (isBullishRegime(regime)) {
    if (trend === "Strong Bull") {
      score = 95;
      reason = "Broad market participation confirms trend.";
      description = "Major indices remain above bullish trend thresholds.";
    } else if (trend === "Weak Bull") {
      score = 78;
      reason = "Trend bias supports the bullish regime.";
      description = "Indices hold a constructive but not dominant uptrend.";
    } else if (trend === "Sideways") {
      score = 48;
      reason = "Momentum remains stable.";
      title = "Trend Neutral";
      description = "Trend is balanced and does not strongly confirm the regime.";
    } else {
      score = 22;
      reason = "Trend conflicts with bullish regime classification.";
      title = "Trend Conflict";
      description = "Index trend is bearish while regime is classified bullish.";
    }
  } else if (isBearishRegime(regime)) {
    if (trend === "Strong Bear") {
      score = 95;
      reason = "Bearish trend strongly confirms the regime.";
      description = "Major indices remain below bearish trend thresholds.";
    } else if (trend === "Weak Bear") {
      score = 78;
      reason = "Trend bias supports the bearish regime.";
      description = "Indices hold a defensive but not extreme downtrend.";
    } else if (trend === "Sideways") {
      score = 48;
      reason = "Momentum remains stable.";
      title = "Trend Neutral";
      description = "Trend is balanced and does not strongly confirm the regime.";
    } else {
      score = 22;
      reason = "Trend conflicts with bearish regime classification.";
      title = "Trend Conflict";
      description = "Index trend is bullish while regime is classified bearish.";
    }
  } else if (regime === "High Volatility" || regime === "Event Driven") {
    score = trend === "Sideways" ? 60 : 55;
    reason = "Trend is secondary under volatility-dominant regimes.";
    description = "Directional trend is deprioritized under volatility override.";
  } else if (regime === "Low Volatility") {
    score = trend === "Sideways" || trend === "Weak Bull" ? 75 : 55;
    reason =
      trend === "Sideways"
        ? "Momentum remains stable."
        : "Quiet volatility with mild directional bias.";
    description = "Low-volatility regimes prefer contained directional impulse.";
  } else {
    // Sideways
    score = trend === "Sideways" ? 88 : 45;
    reason =
      trend === "Sideways"
        ? "Momentum remains stable."
        : "Directional trend weakens Sideways confidence.";
    title = trend === "Sideways" ? "Trend Confirmation" : "Trend Drift";
    description =
      trend === "Sideways"
        ? "Indices remain range-bound, confirming Sideways regime."
        : "Underlying trend bias challenges a pure Sideways read.";
  }

  return { score, title, description, reason };
}

export function scoreBreadthAgreement(
  context: InstitutionalMarketContext,
  regime: MarketRegimeLabel
): { score: number; title: string; description: string; reason: string } {
  const breadth = context.marketBreadth.score;
  const participation = context.marketBreadth.participationPercent;

  if (isBullishRegime(regime)) {
    if (breadth >= 65 && participation >= 60) {
      return {
        score: 90,
        title: "Breadth Confirmation",
        description: "Advance/decline and participation support the bullish regime.",
        reason: "Broad market participation confirms trend.",
      };
    }
    if (breadth <= 40) {
      return {
        score: 25,
        title: "Weak Breadth",
        description: "Narrow participation undermines the bullish regime.",
        reason: "Market breadth weakening.",
      };
    }
    return {
      score: clamp(round(40 + breadth * 0.5, 1), 0, 100),
      title: "Breadth Mixed",
      description: "Breadth provides only partial confirmation.",
      reason: "Participation remains selective.",
    };
  }

  if (isBearishRegime(regime)) {
    if (breadth <= 40) {
      return {
        score: 88,
        title: "Breadth Confirmation",
        description: "Weak breadth confirms defensive regime conditions.",
        reason: "Market breadth weakening.",
      };
    }
    if (breadth >= 65) {
      return {
        score: 28,
        title: "Strong Breadth Conflict",
        description: "Broad participation conflicts with bearish regime.",
        reason: "Broad market participation challenges bearish regime.",
      };
    }
    return {
      score: clamp(round(100 - breadth * 0.55, 1), 0, 100),
      title: "Breadth Mixed",
      description: "Breadth only partially supports the bearish regime.",
      reason: "Breadth signals remain mixed.",
    };
  }

  if (regime === "High Volatility" || regime === "Event Driven") {
    return {
      score: breadth <= 50 ? 70 : 55,
      title: "Breadth Under Stress",
      description: "Breadth behavior under elevated volatility.",
      reason:
        breadth <= 45
          ? "Market breadth weakening."
          : "Breadth remains mixed under volatility stress.",
    };
  }

  return {
    score: breadth >= 45 && breadth <= 60 ? 80 : 50,
    title: "Breadth Balance",
    description: "Breadth is evaluated for Sideways / quiet regimes.",
    reason:
      breadth >= 45 && breadth <= 60
        ? "Momentum remains stable."
        : "Breadth is not centered for a balanced regime.",
  };
}

export function scoreSectorAgreement(
  context: InstitutionalMarketContext,
  regime: MarketRegimeLabel
): { score: number; title: string; description: string; reason: string } {
  const avg = averageSectorScore(context);
  const leaders = context.sectorRotation.leaders.length;
  const missing = context.sectorStrength.length === 0;

  if (missing) {
    return {
      score: 35,
      title: "Missing Sector Data",
      description: "Sector strength inputs are unavailable.",
      reason: "Sector data missing reduced confidence.",
    };
  }

  if (isBullishRegime(regime)) {
    if (avg >= 62 && leaders >= 2) {
      return {
        score: 88,
        title: "Sector Leadership",
        description: "Multiple sectors confirm leadership breadth.",
        reason: "Sector leadership remains diversified.",
      };
    }
    if (avg <= 42) {
      return {
        score: 28,
        title: "Weak Sector Complex",
        description: "Sector scores conflict with bullish regime.",
        reason: "Sector leadership concentrated / weak.",
      };
    }
    return {
      score: clamp(round(avg, 1), 0, 100),
      title: "Sector Mixed",
      description: "Sector complex provides partial confirmation.",
      reason: "Sector participation is selective.",
    };
  }

  if (isBearishRegime(regime)) {
    if (avg <= 42) {
      return {
        score: 86,
        title: "Sector Weakness",
        description: "Sector complex confirms defensive conditions.",
        reason: "Sector leadership concentrated / weak.",
      };
    }
    return {
      score: clamp(round(100 - avg * 0.7, 1), 0, 100),
      title: "Sector Mixed",
      description: "Sectors only partially support bearish regime.",
      reason: "Sector signals remain mixed.",
    };
  }

  return {
    score: avg >= 45 && avg <= 60 ? 78 : 52,
    title: "Sector Balance",
    description: "Sector dispersion evaluated for non-directional regimes.",
    reason:
      avg >= 45 && avg <= 60
        ? "Sector leadership remains diversified."
        : "Sector skew challenges a balanced regime.",
  };
}

export function scoreVolatilityAgreement(
  context: InstitutionalMarketContext,
  regime: MarketRegimeLabel
): { score: number; title: string; description: string; reason: string } {
  const vol = context.volatility;
  const features = extractRegimeFeatures(context);

  if (regime === "High Volatility" || regime === "Event Driven") {
    if (features.isExtremeVolatility || features.isHighVolatility) {
      return {
        score: 92,
        title: "Volatility Confirmation",
        description: "Elevated volatility confirms the classified regime.",
        reason: "India VIX increasing.",
      };
    }
    return {
      score: 35,
      title: "Volatility Conflict",
      description: "Volatility is not elevated enough for this regime.",
      reason: "Volatility remains contained versus regime expectation.",
    };
  }

  if (regime === "Low Volatility") {
    if (features.isVeryLowVolatility || features.isLowVolatility) {
      return {
        score: 90,
        title: "Quiet Volatility",
        description: "Subdued volatility confirms the quiet regime.",
        reason: "India VIX remains subdued.",
      };
    }
    return {
      score: 30,
      title: "Volatility Elevated",
      description: "Volatility is too high for a Low Volatility regime.",
      reason: "India VIX increasing.",
    };
  }

  if (isBullishRegime(regime)) {
    if (features.isHighVolatility) {
      return {
        score: 32,
        title: "Volatility Drag",
        description: "Elevated volatility weakens bullish confidence.",
        reason: "India VIX increasing.",
      };
    }
    if (features.isLowVolatility) {
      return {
        score: 85,
        title: "Supportive Volatility",
        description: "Calm volatility supports the bullish regime.",
        reason: "India VIX remains subdued.",
      };
    }
    return {
      score: 60,
      title: "Volatility Neutral",
      description: "Volatility is neither strongly supportive nor hostile.",
      reason: "Momentum remains stable.",
    };
  }

  if (isBearishRegime(regime)) {
    if (features.isHighVolatility) {
      return {
        score: 82,
        title: "Volatility Confirmation",
        description: "Elevated volatility supports defensive regimes.",
        reason: "India VIX increasing.",
      };
    }
    return {
      score: clamp(round(40 + vol.score * 0.4, 1), 0, 100),
      title: "Volatility Mixed",
      description: "Volatility only partially confirms bearish conditions.",
      reason: "Volatility signals remain mixed.",
    };
  }

  return {
    score: vol.score >= 35 && vol.score <= 55 ? 75 : 50,
    title: "Volatility Balance",
    description: "Volatility assessed for Sideways regime fit.",
    reason:
      vol.score >= 35 && vol.score <= 55
        ? "Momentum remains stable."
        : "Volatility skew challenges Sideways confidence.",
  };
}

export function scoreMarketStrengthAgreement(
  context: InstitutionalMarketContext,
  regime: MarketRegimeLabel
): { score: number; title: string; description: string; reason: string } {
  const strength = context.marketStrength;

  if (isBullishRegime(regime)) {
    if (strength >= 70) {
      return {
        score: 90,
        title: "Strength Confirmation",
        description: "Market strength sits above institutional bull thresholds.",
        reason: "Market strength above institutional threshold.",
      };
    }
    if (strength <= 45) {
      return {
        score: 28,
        title: "Weak Strength",
        description: "Market strength conflicts with bullish regime.",
        reason: "Market strength below institutional threshold.",
      };
    }
    return {
      score: clamp(round(strength, 1), 0, 100),
      title: "Strength Mixed",
      description: "Market strength provides partial confirmation.",
      reason: "Market strength remains moderate.",
    };
  }

  if (isBearishRegime(regime)) {
    if (strength <= 35) {
      return {
        score: 90,
        title: "Strength Confirmation",
        description: "Weak market strength confirms defensive regime.",
        reason: "Market strength below institutional threshold.",
      };
    }
    return {
      score: clamp(round(100 - strength, 1), 0, 100),
      title: "Strength Mixed",
      description: "Strength only partially supports bearish regime.",
      reason: "Market strength remains mixed.",
    };
  }

  return {
    score: strength >= 45 && strength <= 60 ? 80 : 50,
    title: "Strength Balance",
    description: "Strength assessed for non-directional regimes.",
    reason:
      strength >= 45 && strength <= 60
        ? "Momentum remains stable."
        : "Strength skew challenges balanced regime confidence.",
  };
}

export function scoreRiskModeAgreement(
  context: InstitutionalMarketContext,
  regime: MarketRegimeLabel
): { score: number; title: string; description: string; reason: string } {
  const risk = context.riskMode;

  if (isBullishRegime(regime) || regime === "Low Volatility") {
    if (risk === "Risk On") {
      return {
        score: 88,
        title: "Risk Mode Alignment",
        description: "Risk appetite supports the classified regime.",
        reason: "Risk appetite remains constructive.",
      };
    }
    if (risk === "Risk Off") {
      return {
        score: 30,
        title: "Risk Mode Conflict",
        description: "Defensive risk mode conflicts with the regime.",
        reason: "Risk appetite is defensive.",
      };
    }
    return {
      score: 60,
      title: "Risk Mode Neutral",
      description: "Neutral risk posture is acceptable but not ideal.",
      reason: "Risk posture remains neutral.",
    };
  }

  if (isBearishRegime(regime) || regime === "High Volatility") {
    if (risk === "Risk Off") {
      return {
        score: 90,
        title: "Risk Mode Alignment",
        description: "Defensive risk appetite confirms the regime.",
        reason: "Risk appetite is defensive.",
      };
    }
    if (risk === "Risk On") {
      return {
        score: 28,
        title: "Risk Mode Conflict",
        description: "Risk-on posture conflicts with defensive regime.",
        reason: "Risk appetite remains constructive.",
      };
    }
    return {
      score: 58,
      title: "Risk Mode Neutral",
      description: "Neutral risk posture partially fits the regime.",
      reason: "Risk posture remains neutral.",
    };
  }

  return {
    score: risk === "Neutral" ? 82 : 55,
    title: "Risk Mode Balance",
    description: "Risk mode evaluated for Sideways / event regimes.",
    reason:
      risk === "Neutral"
        ? "Risk posture remains neutral."
        : `Risk mode is ${risk} under a balanced regime.`,
  };
}

export function scoreDataQuality(
  context: InstitutionalMarketContext
): { score: number; title: string; description: string; reason: string } {
  const grade = context.qualityGrade;
  const warningCount = context.warnings.length;
  const incomplete = context.warnings.some((w) =>
    /unavailable|missing|degradation|failure/i.test(w)
  );

  let score =
    grade === "A+" ? 96 : grade === "A" ? 88 : grade === "B" ? 72 : 45;
  score -= Math.min(warningCount * 4, 20);
  if (incomplete) score -= 15;

  if (incomplete) {
    return {
      score: clamp(round(score, 1), 0, 100),
      title: "Data Quality Drag",
      description: "Incomplete or degraded inputs reduced confidence.",
      reason: "Incomplete market data reduced confidence.",
    };
  }

  if (score >= 80) {
    return {
      score: clamp(round(score, 1), 0, 100),
      title: "Data Quality Strong",
      description: "Institutional data quality supports the regime call.",
      reason: "Data quality remains institutional-grade.",
    };
  }

  return {
    score: clamp(round(score, 1), 0, 100),
    title: "Data Quality Mixed",
    description: "Data quality is acceptable with some reservations.",
    reason: "Data quality warnings require monitoring.",
  };
}

function buildContribution(
  factor: string,
  weight: number,
  scored: {
    score: number;
    title: string;
    description: string;
    reason: string;
  },
  config: RegimeConfidenceConfig
): ConfidenceContribution {
  const direction = directionFromScore(scored.score, config);
  return {
    factor,
    title: scored.title,
    description: scored.description,
    score: clamp(round(scored.score, 1), 0, 100),
    weight,
    contribution: signedContribution(scored.score, weight * 100),
    direction,
    reason: scored.reason,
  };
}

/**
 * Build full RegimeConfidenceAnalysis from context + classified regime.
 */
export function buildRegimeConfidenceAnalysis(
  input: RegimeConfidenceInput
): RegimeConfidenceAnalysis {
  const config = resolveRegimeConfidenceConfig(input.config);

  if (!input.context || !input.regime) {
    return createFallbackConfidenceAnalysis(
      "Missing regime or market context — confidence reduced."
    );
  }

  const context = input.context;
  const regime = input.regime.regime;
  const weights = config.weights;

  const contributions: ConfidenceContribution[] = [
    buildContribution(
      "Trend Agreement",
      weights.trendAgreement,
      scoreTrendAgreement(context, regime),
      config
    ),
    buildContribution(
      "Breadth Agreement",
      weights.breadthAgreement,
      scoreBreadthAgreement(context, regime),
      config
    ),
    buildContribution(
      "Sector Agreement",
      weights.sectorAgreement,
      scoreSectorAgreement(context, regime),
      config
    ),
    buildContribution(
      "Volatility Agreement",
      weights.volatilityAgreement,
      scoreVolatilityAgreement(context, regime),
      config
    ),
    buildContribution(
      "Market Strength",
      weights.marketStrength,
      scoreMarketStrengthAgreement(context, regime),
      config
    ),
    buildContribution(
      "Risk Mode",
      weights.riskMode,
      scoreRiskModeAgreement(context, regime),
      config
    ),
    buildContribution(
      "Data Quality",
      weights.dataQuality,
      scoreDataQuality(context),
      config
    ),
  ];

  // Order by absolute contribution descending for institutional readability.
  contributions.sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  const weightSum =
    weights.trendAgreement +
    weights.breadthAgreement +
    weights.sectorAgreement +
    weights.volatilityAgreement +
    weights.marketStrength +
    weights.riskMode +
    weights.dataQuality;

  let score = clamp(
    round(
      contributions.reduce(
        (sum, row) => sum + row.score * row.weight,
        0
      ) / (weightSum > 0 ? weightSum : 1),
      1
    ),
    0,
    100
  );

  const features = extractRegimeFeatures(context);
  if (features.hasConflicts) {
    score = clamp(round(score - config.conflictPenalty, 1), 0, 100);
  }
  if (features.isIncomplete) {
    score = clamp(round(score - config.incompletePenalty, 1), 0, 100);
  }
  if (context.sectorStrength.length === 0) {
    score = clamp(round(score - config.missingFactorPenalty, 1), 0, 100);
  }
  if (context.volatility.indiaVix <= 0 && context.volatility.score === 50) {
    score = clamp(round(score - config.missingFactorPenalty / 2, 1), 0, 100);
  }

  score = clamp(round(score, 1), config.confidenceFloor, 100);
  const grade = classifyConfidenceGrade(score, config);

  const positiveReasons = contributions
    .filter((c) => c.direction === "Positive")
    .map((c) => c.reason);
  const negativeReasons = contributions
    .filter((c) => c.direction === "Negative")
    .map((c) => c.reason);
  const neutralReasons = contributions
    .filter((c) => c.direction === "Neutral")
    .map((c) => c.reason);

  if (features.hasConflicts) {
    negativeReasons.push("Conflicting signals reduced institutional confidence.");
  }
  if (features.isIncomplete) {
    negativeReasons.push("Incomplete market data reduced confidence.");
  }

  const summary = buildConfidenceSummary(
    regime,
    grade,
    contributions,
    config.summaryMaxPoints
  );

  return {
    score,
    grade,
    positiveReasons: dedupe(positiveReasons),
    negativeReasons: dedupe(negativeReasons),
    neutralReasons: dedupe(neutralReasons),
    contributions,
    summary,
  };
}

export function buildConfidenceSummary(
  regime: MarketRegimeLabel,
  grade: ConfidenceGrade,
  contributions: ConfidenceContribution[],
  maxPoints: number
): string[] {
  const points: string[] = [];
  const topPositive = contributions.filter((c) => c.direction === "Positive");
  const topNegative = contributions.filter((c) => c.direction === "Negative");

  if (topPositive[0]) {
    points.push(
      topPositive[0].factor.includes("Trend")
        ? "Trend strongly confirmed."
        : topPositive[0].reason.replace(/\.$/, "") + "."
    );
  }
  if (topPositive[1]) {
    points.push(
      /participation|breadth/i.test(topPositive[1].reason)
        ? "Participation remains broad."
        : topPositive[1].reason.replace(/\.$/, "") + "."
    );
  }
  if (topNegative[0]) {
    points.push(
      /VIX|volatility/i.test(topNegative[0].reason)
        ? "Volatility slightly elevated."
        : topNegative[0].reason.replace(/\.$/, "") + "."
    );
  }

  points.push(`Regime classified as ${regime}.`);
  points.push(
    grade === "Exceptional" || grade === "High"
      ? "Overall institutional confidence remains high."
      : grade === "Good"
        ? "Overall institutional confidence remains constructive."
        : grade === "Moderate"
          ? "Overall institutional confidence is moderate."
          : "Overall institutional confidence remains low."
  );

  return dedupe(points).slice(0, maxPoints);
}

export function createFallbackConfidenceAnalysis(
  reason = "Insufficient evidence — confidence reduced."
): RegimeConfidenceAnalysis {
  return {
    score: DEFAULT_REGIME_CONFIDENCE_CONFIG.confidenceFloor,
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
}

/**
 * Attach confidence analysis onto a classified regime.
 */
export function enrichRegimeWithConfidence(
  regime: MarketRegimeClassification,
  context: InstitutionalMarketContext | null,
  config?: RegimeConfidenceInput["config"]
): MarketRegimeClassification & { confidenceAnalysis: RegimeConfidenceAnalysis; confidence: number } {
  const confidenceAnalysis = buildRegimeConfidenceAnalysis({
    context,
    regime,
    config,
  });
  return {
    ...regime,
    confidence: confidenceAnalysis.score,
    confidenceAnalysis,
  };
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

export type { RegimeConfidenceWeights };
