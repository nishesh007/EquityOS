/**
 * Institutional Accumulation Explainability — Sprint 11B.3H.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./InstitutionalAccumulationUtils";
import type {
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationStrategyInput,
} from "./InstitutionalAccumulationTypes";
import type { InstitutionalAccumulationTradeSetup } from "./InstitutionalAccumulationTradeTypes";
import type {
  InstitutionalAccumulationFactorScores,
  InstitutionalAccumulationInstitutionalScore,
} from "./InstitutionalAccumulationScoring";
import {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG,
  scoreInstitutionalAccumulationConvictionFactors,
  type InstitutionalAccumulationScoringConfig,
} from "./InstitutionalAccumulationScoring";

export type InstitutionalAccumulationExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface InstitutionalAccumulationExplanationFactor {
  title: string;
  description: string;
  impact: InstitutionalAccumulationExplanationImpact;
  contribution: number;
}

export interface InstitutionalAccumulationExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: InstitutionalAccumulationExplanationFactor[];
}

export const DEFAULT_INSTITUTIONAL_ACCUMULATION_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type InstitutionalAccumulationExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveInstitutionalAccumulationExplainabilityConfig(
  partial?: Partial<InstitutionalAccumulationExplainabilityConfig>
): InstitutionalAccumulationExplainabilityConfig {
  return {
    ...DEFAULT_INSTITUTIONAL_ACCUMULATION_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: InstitutionalAccumulationExplainabilityConfig
): InstitutionalAccumulationExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildInstitutionalAccumulationExplanationFactors(input: {
  detection: InstitutionalAccumulationDetection;
  setup: InstitutionalAccumulationTradeSetup;
  marketContext: InstitutionalMarketContext;
  accumulationInput: InstitutionalAccumulationStrategyInput;
  factors?: InstitutionalAccumulationFactorScores;
  scoringConfig?: InstitutionalAccumulationScoringConfig;
  explainConfig?: InstitutionalAccumulationExplainabilityConfig;
}): InstitutionalAccumulationExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG;
  const explain = resolveInstitutionalAccumulationExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreInstitutionalAccumulationConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      accumulationInput: input.accumulationInput,
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
      title: "Institutional Footprint",
      description:
        d.pattern !== "none"
          ? "Repeated accumulation detected."
          : "No clear institutional footprint.",
      score: scores.institutionalFootprint,
      weight: w.institutionalFootprint,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Large volume without price breakdown."
        : "Low volume — weak confirmation of institutional participation.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Price Action",
      description: d.higherLows
        ? "Higher lows confirm accumulation structure."
        : "Weak Trend — structure not clearly directional.",
      score: scores.priceAction,
      weight: w.priceAction,
    },
    {
      title: "Demand Zone Quality",
      description:
        d.pattern === "demand_zone_defense"
          ? "Demand zone defended multiple times."
          : "Demand zone not clearly defended.",
      score: scores.demandZoneQuality,
      weight: w.demandZoneQuality,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? "Sector participation confirms institutional buying."
        : "Weak Sector — accumulation insufficient.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Market breadth supports continuation."
        : "Weak Breadth — participation insufficient.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP for accumulation."
          : "VWAP alignment weak for accumulation.",
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
          ? "Liquidity acceptable for institutional accumulation."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
  ];

  if (d.sectorConfirmed) {
    catalog.push({
      title: "Sector Participation",
      description: `Sector participation confirms institutional buying (avg ${round(averageSectorScore(input.marketContext), 0)}).`,
      score: scores.sectorStrength,
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

export function buildInstitutionalAccumulationExplainability(input: {
  detection: InstitutionalAccumulationDetection;
  setup: InstitutionalAccumulationTradeSetup;
  marketContext: InstitutionalMarketContext;
  accumulationInput: InstitutionalAccumulationStrategyInput;
  institutionalScore?: InstitutionalAccumulationInstitutionalScore;
  scoringConfig?: InstitutionalAccumulationScoringConfig;
  explainConfig?: Partial<InstitutionalAccumulationExplainabilityConfig>;
}): InstitutionalAccumulationExplainability {
  try {
    const explain = resolveInstitutionalAccumulationExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildInstitutionalAccumulationExplanationFactors({
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
      summary: buildInstitutionalAccumulationSummary({
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
      summary: ["Institutional Accumulation explainability unavailable."],
      factors: [],
    };
  }
}

export function buildInstitutionalAccumulationSummary(input: {
  detection: InstitutionalAccumulationDetection;
  setup: InstitutionalAccumulationTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: InstitutionalAccumulationInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_INSTITUTIONAL_ACCUMULATION_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected && d.pattern !== "none") {
    points.push("Repeated accumulation detected.");
  } else {
    points.push("Institutional Accumulation setup not confirmed.");
  }

  if (d.volumeConfirmed) {
    points.push("Large volume without price breakdown.");
  }
  if (d.pattern === "demand_zone_defense") {
    points.push("Demand zone defended multiple times.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector participation confirms institutional buying.");
  }
  if (d.breadthConfirmed) {
    points.push("Market breadth supports continuation.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG.highMin
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

export function createEmptyInstitutionalAccumulationExplainability(
  warnings: string[] = []
): InstitutionalAccumulationExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Institutional Accumulation explainability not available."],
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
