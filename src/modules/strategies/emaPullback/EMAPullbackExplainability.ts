/**
 * EMA Pullback Explainability — Sprint 11B.3P.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  EMAPullbackDetection,
  EMAPullbackStrategyInput,
} from "./EMAPullbackTypes";
import type { EMAPullbackTradeSetup } from "./EMAPullbackTradeTypes";
import type {
  EMAPullbackFactorScores,
  EMAPullbackInstitutionalScore,
} from "./EMAPullbackScoring";
import {
  DEFAULT_EMA_PULLBACK_SCORING_CONFIG,
  scoreEMAPullbackConvictionFactors,
  type EMAPullbackScoringConfig,
} from "./EMAPullbackScoring";

export type EMAPullbackExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface EMAPullbackExplanationFactor {
  title: string;
  description: string;
  impact: EMAPullbackExplanationImpact;
  contribution: number;
}

export interface EMAPullbackExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: EMAPullbackExplanationFactor[];
}

export const DEFAULT_EMA_PULLBACK_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type EMAPullbackExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveEMAPullbackExplainabilityConfig(
  partial?: Partial<EMAPullbackExplainabilityConfig>
): EMAPullbackExplainabilityConfig {
  return {
    ...DEFAULT_EMA_PULLBACK_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: EMAPullbackExplainabilityConfig
): EMAPullbackExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildEMAPullbackExplanationFactors(input: {
  detection: EMAPullbackDetection;
  setup: EMAPullbackTradeSetup;
  marketContext: InstitutionalMarketContext;
  epInput: EMAPullbackStrategyInput;
  factors?: EMAPullbackFactorScores;
  scoringConfig?: EMAPullbackScoringConfig;
  explainConfig?: EMAPullbackExplainabilityConfig;
}): EMAPullbackExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_EMA_PULLBACK_SCORING_CONFIG;
  const explain = resolveEMAPullbackExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreEMAPullbackConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      epInput: input.epInput,
      config: scoring,
    });
  const d = input.detection;

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "Trend Strength",
      description: d.strongTrend
        ? "Trend structure remains intact."
        : "Trend structure incomplete.",
      score: scores.trendStrength,
      weight: w.trendStrength,
    },
    {
      title: "EMA Alignment",
      description:
        d.emaAlignment >= 70
          ? "EMA stack confirms directional bias."
          : "EMA alignment weak.",
      score: scores.emaAlignment,
      weight: w.emaAlignment,
    },
    {
      title: "Pullback Quality",
      description:
        d.pullbackType === "ema20"
          ? d.direction === "BUY"
            ? "Price pulled back to rising EMA20."
            : "Price pulled back to falling EMA20."
          : d.controlledPullback
            ? "Controlled pullback into support."
            : "Pullback quality insufficient.",
      score: scores.pullbackQuality,
      weight: w.pullbackQuality,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Low-volume retracement suggests profit booking."
        : "Weak volume — institutional participation missing.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Sector and market remain supportive."
        : "Weak breadth — market participation missing.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? "Sector and market remain supportive."
        : "Weak sector — pullback continuation missing.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price remains aligned with VWAP."
          : "VWAP alignment weak.",
      score: scores.vwapAlignment,
      weight: w.vwapAlignment,
    },
    {
      title: "Risk/Reward",
      description:
        input.setup.riskReward >= scoring.minimumRiskReward
          ? "Risk/Reward exceeds institutional threshold."
          : "Risk/Reward below institutional threshold.",
      score: scores.riskReward,
      weight: w.riskReward,
    },
    {
      title: "Liquidity",
      description:
        scores.liquidity >= 60
          ? "Liquidity acceptable for EMA Pullback."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
  ];

  return catalog.map((item) => {
    const contribution = signedContribution(item.score, item.weight);
    return {
      title: item.title,
      description: item.description,
      impact: impactFromContribution(contribution, explain),
      contribution,
    };
  });
}

export function buildEMAPullbackExplainability(input: {
  detection: EMAPullbackDetection;
  setup: EMAPullbackTradeSetup;
  marketContext: InstitutionalMarketContext;
  epInput: EMAPullbackStrategyInput;
  institutionalScore?: EMAPullbackInstitutionalScore;
  scoringConfig?: EMAPullbackScoringConfig;
  explainConfig?: Partial<EMAPullbackExplainabilityConfig>;
}): EMAPullbackExplainability {
  try {
    const explain = resolveEMAPullbackExplainabilityConfig(input.explainConfig);
    const factors = buildEMAPullbackExplanationFactors({
      ...input,
      explainConfig: explain,
      scoringConfig: input.scoringConfig,
    });

    const positiveReasons: string[] = [];
    const negativeReasons: string[] = [];
    const neutralFactors: string[] = [];

    for (const factor of factors) {
      if (factor.impact === "Positive") positiveReasons.push(factor.description);
      else if (factor.impact === "Negative")
        negativeReasons.push(factor.description);
      else neutralFactors.push(factor.description);
    }

    const warnings = dedupe([
      ...input.setup.warnings,
      ...input.detection.warnings,
      ...input.marketContext.warnings,
    ]);

    return {
      positiveReasons: dedupe(positiveReasons),
      negativeReasons: dedupe(negativeReasons),
      neutralFactors: dedupe(neutralFactors),
      warnings,
      summary: buildEMAPullbackSummary({
        detection: input.detection,
        setup: input.setup,
        positiveReasons,
        negativeReasons,
        institutionalScore: input.institutionalScore,
        maxPoints: explain.summaryMaxPoints,
      }),
      factors: factors.sort(
        (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
      ),
    };
  } catch {
    return {
      positiveReasons: [],
      negativeReasons: ["Explainability engine degraded."],
      neutralFactors: [],
      warnings: ["Explainability failed — conviction reduced via warning."],
      summary: ["EMA Pullback explainability unavailable."],
      factors: [],
    };
  }
}

export function buildEMAPullbackSummary(input: {
  detection: EMAPullbackDetection;
  setup: EMAPullbackTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: EMAPullbackInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ?? DEFAULT_EMA_PULLBACK_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected && d.pullbackType === "ema20") {
    points.push(
      d.direction === "BUY"
        ? "Price pulled back to rising EMA20."
        : "Price pulled back to falling EMA20."
    );
  } else if (d.detected) {
    points.push("Controlled pullback into institutional support.");
  } else {
    points.push("EMA Pullback setup not confirmed.");
  }
  if (d.strongTrend) points.push("Trend structure remains intact.");
  if (d.volumeConfirmed) {
    points.push("Low-volume retracement suggests profit booking.");
  }
  if (d.bullishRejection) {
    points.push(
      d.direction === "BUY"
        ? "Bullish rejection confirms institutional buying."
        : "Bearish rejection confirms institutional selling."
    );
  }
  if (d.sectorConfirmed && d.breadthConfirmed) {
    points.push("Sector and market remain supportive.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_EMA_PULLBACK_SCORING_CONFIG.highMin
  ) {
    points.push(
      `Institutional conviction ${input.institutionalScore.grade} (${input.institutionalScore.signalGrade}).`
    );
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyEMAPullbackExplainability(
  warnings: string[] = []
): EMAPullbackExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["EMA Pullback explainability not available."],
    factors: [],
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
