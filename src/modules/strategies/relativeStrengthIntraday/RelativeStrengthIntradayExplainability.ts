/**
 * Relative Strength Intraday Explainability — Sprint 11B.3G.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./RelativeStrengthIntradayUtils";
import type {
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayStrategyInput,
} from "./RelativeStrengthIntradayTypes";
import type { RelativeStrengthIntradayTradeSetup } from "./RelativeStrengthIntradayTradeTypes";
import type {
  RelativeStrengthIntradayFactorScores,
  RelativeStrengthIntradayInstitutionalScore,
} from "./RelativeStrengthIntradayScoring";
import {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG,
  scoreRelativeStrengthIntradayConvictionFactors,
  type RelativeStrengthIntradayScoringConfig,
} from "./RelativeStrengthIntradayScoring";

export type RelativeStrengthIntradayExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface RelativeStrengthIntradayExplanationFactor {
  title: string;
  description: string;
  impact: RelativeStrengthIntradayExplanationImpact;
  contribution: number;
}

export interface RelativeStrengthIntradayExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: RelativeStrengthIntradayExplanationFactor[];
}

export const DEFAULT_RELATIVE_STRENGTH_INTRADAY_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type RelativeStrengthIntradayExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveRelativeStrengthIntradayExplainabilityConfig(
  partial?: Partial<RelativeStrengthIntradayExplainabilityConfig>
): RelativeStrengthIntradayExplainabilityConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: RelativeStrengthIntradayExplainabilityConfig
): RelativeStrengthIntradayExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildRelativeStrengthIntradayExplanationFactors(input: {
  detection: RelativeStrengthIntradayDetection;
  setup: RelativeStrengthIntradayTradeSetup;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthIntradayStrategyInput;
  factors?: RelativeStrengthIntradayFactorScores;
  scoringConfig?: RelativeStrengthIntradayScoringConfig;
  explainConfig?: RelativeStrengthIntradayExplainabilityConfig;
}): RelativeStrengthIntradayExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG;
  const explain = resolveRelativeStrengthIntradayExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreRelativeStrengthIntradayConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      rsInput: input.rsInput,
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
      title: "Relative Strength Leadership",
      description: d.outperformsBenchmark
        ? "Stock outperforming benchmark."
        : "Stock not outperforming benchmark.",
      score: scores.leadership,
      weight: w.leadership,
    },
    {
      title: "Sector Leadership",
      description: d.sectorConfirmed
        ? "Sector leadership confirmed."
        : "Weak Sector — leadership insufficient.",
      score: scores.sector,
      weight: w.sector,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Institutional buying supported by volume."
        : "Low volume — weak confirmation of institutional participation.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Market breadth confirms leadership."
        : "Weak Breadth — participation insufficient.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Trend Quality",
      description: d.strongTrend
        ? "Momentum remains intact."
        : "Weak Trend — structure not clearly directional.",
      score: scores.trend,
      weight: w.trend,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwap >= 60
          ? "Price aligned with VWAP for relative strength."
          : "VWAP alignment weak for relative strength.",
      score: scores.vwap,
      weight: w.vwap,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Trade aligns with market regime."
        : "Market regime not supportive.",
      score: scores.market,
      weight: w.market,
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
          ? "Liquidity acceptable for relative strength intraday."
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

  if (d.sectorConfirmed) {
    catalog.push({
      title: "Sector Strength",
      description: `Sector leadership supports relative strength (avg ${round(averageSectorScore(input.marketContext), 0)}).`,
      score: scores.sector,
      weight: 0.05,
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

export function buildRelativeStrengthIntradayExplainability(input: {
  detection: RelativeStrengthIntradayDetection;
  setup: RelativeStrengthIntradayTradeSetup;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthIntradayStrategyInput;
  institutionalScore?: RelativeStrengthIntradayInstitutionalScore;
  scoringConfig?: RelativeStrengthIntradayScoringConfig;
  explainConfig?: Partial<RelativeStrengthIntradayExplainabilityConfig>;
}): RelativeStrengthIntradayExplainability {
  try {
    const explain = resolveRelativeStrengthIntradayExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildRelativeStrengthIntradayExplanationFactors({
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
      summary: buildRelativeStrengthIntradaySummary({
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
      summary: ["Relative Strength Intraday explainability unavailable."],
      factors: [],
    };
  }
}

export function buildRelativeStrengthIntradaySummary(input: {
  detection: RelativeStrengthIntradayDetection;
  setup: RelativeStrengthIntradayTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: RelativeStrengthIntradayInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_RELATIVE_STRENGTH_INTRADAY_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.outperformsBenchmark) {
    points.push("Stock outperforming benchmark.");
  } else {
    points.push("Relative Strength Intraday setup not confirmed.");
  }

  if (d.outperformsSector || d.sectorConfirmed) {
    points.push("Sector leadership confirmed.");
  }
  if (d.volumeConfirmed) {
    points.push("Institutional buying supported by volume.");
  }
  if (d.breadthConfirmed) {
    points.push("Market breadth confirms leadership.");
  }
  if (d.strongTrend) {
    points.push("Momentum remains intact.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG.highMin
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

export function createEmptyRelativeStrengthIntradayExplainability(
  warnings: string[] = []
): RelativeStrengthIntradayExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Relative Strength Intraday explainability not available."],
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
