/**
 * Momentum Continuation Explainability — Sprint 11B.3F.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./MomentumContinuationUtils";
import type {
  MomentumContinuationDetection,
  MomentumContinuationStrategyInput,
} from "./MomentumContinuationTypes";
import type { MomentumContinuationTradeSetup } from "./MomentumContinuationTradeTypes";
import type {
  MomentumContinuationFactorScores,
  MomentumContinuationInstitutionalScore,
} from "./MomentumContinuationScoring";
import {
  DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG,
  scoreMomentumContinuationConvictionFactors,
  type MomentumContinuationScoringConfig,
} from "./MomentumContinuationScoring";

export type MomentumContinuationExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface MomentumContinuationExplanationFactor {
  title: string;
  description: string;
  impact: MomentumContinuationExplanationImpact;
  contribution: number;
}

export interface MomentumContinuationExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: MomentumContinuationExplanationFactor[];
}

export const DEFAULT_MOMENTUM_CONTINUATION_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type MomentumContinuationExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveMomentumContinuationExplainabilityConfig(
  partial?: Partial<MomentumContinuationExplainabilityConfig>
): MomentumContinuationExplainabilityConfig {
  return {
    ...DEFAULT_MOMENTUM_CONTINUATION_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: MomentumContinuationExplainabilityConfig
): MomentumContinuationExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildMomentumContinuationExplanationFactors(input: {
  detection: MomentumContinuationDetection;
  setup: MomentumContinuationTradeSetup;
  marketContext: InstitutionalMarketContext;
  mcInput: MomentumContinuationStrategyInput;
  factors?: MomentumContinuationFactorScores;
  scoringConfig?: MomentumContinuationScoringConfig;
  explainConfig?: MomentumContinuationExplainabilityConfig;
}): MomentumContinuationExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG;
  const explain = resolveMomentumContinuationExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreMomentumContinuationConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      mcInput: input.mcInput,
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
      title: "Momentum Strength",
      description: d.momentumResumption
        ? "Relative volume confirms renewed momentum."
        : "Momentum resumption not confirmed.",
      score: scores.momentumStrength,
      weight: w.momentumStrength,
    },
    {
      title: "Trend Quality",
      description: d.strongTrend
        ? "Primary trend remains intact."
        : "Weak Trend — structure not clearly directional.",
      score: scores.trendQuality,
      weight: w.trendQuality,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Relative volume confirms renewed momentum."
        : "Low volume — weak confirmation of renewed momentum.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "ADX",
      description:
        d.adx >= 22
          ? `ADX ${round(d.adx, 1)} confirms trend strength.`
          : "Weak ADX — trend strength insufficient.",
      score: scores.adx,
      weight: w.adx,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP for continuation."
          : "VWAP alignment weak for continuation.",
      score: scores.vwapAlignment,
      weight: w.vwapAlignment,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Breadth positive for continuation."
        : "Weak Breadth — participation insufficient.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? `Sector leadership supports continuation (avg ${round(averageSectorScore(input.marketContext), 0)}).`
        : "Weak Sector — leadership insufficient.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
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
          ? "Liquidity acceptable for momentum continuation."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
    {
      title: "Data Quality",
      description:
        input.marketContext.warnings.length === 0
          ? "Market data quality adequate for decisioning."
          : "Data quality warnings present in institutional context.",
      score: scores.dataQuality,
      weight: w.dataQuality,
    },
  ];

  if (d.healthyPullback) {
    catalog.push({
      title: "Pullback Quality",
      description: "Pullback respected institutional support.",
      score: 85,
      weight: 0.08,
    });
  }

  if (d.marketConfirmed) {
    catalog.push({
      title: "Market Regime",
      description: "Trade aligns with market regime.",
      score: 85,
      weight: 0.08,
    });
  }

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

export function buildMomentumContinuationExplainability(input: {
  detection: MomentumContinuationDetection;
  setup: MomentumContinuationTradeSetup;
  marketContext: InstitutionalMarketContext;
  mcInput: MomentumContinuationStrategyInput;
  institutionalScore?: MomentumContinuationInstitutionalScore;
  scoringConfig?: MomentumContinuationScoringConfig;
  explainConfig?: Partial<MomentumContinuationExplainabilityConfig>;
}): MomentumContinuationExplainability {
  try {
    const explain = resolveMomentumContinuationExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildMomentumContinuationExplanationFactors({
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
      summary: buildMomentumContinuationSummary({
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
      summary: ["Momentum Continuation explainability unavailable."],
      factors: [],
    };
  }
}

export function buildMomentumContinuationSummary(input: {
  detection: MomentumContinuationDetection;
  setup: MomentumContinuationTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: MomentumContinuationInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_MOMENTUM_CONTINUATION_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.strongTrend) points.push("Primary trend remains intact.");
  else points.push("Momentum Continuation setup not confirmed.");

  if (d.healthyPullback) {
    points.push("Pullback respected institutional support.");
  }
  if (d.volumeConfirmed) {
    points.push("Relative volume confirms renewed momentum.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector leadership supports continuation.");
  }
  if (d.marketConfirmed) {
    points.push("Trade aligns with market regime.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG.highMin
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

export function createEmptyMomentumContinuationExplainability(
  warnings: string[] = []
): MomentumContinuationExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Momentum Continuation explainability not available."],
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
