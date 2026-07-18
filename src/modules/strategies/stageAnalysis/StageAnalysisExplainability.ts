/**
 * Stage Analysis Explainability — Sprint 11B.3M.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  StageAnalysisDetection,
  StageAnalysisStrategyInput,
} from "./StageAnalysisTypes";
import type { StageAnalysisTradeSetup } from "./StageAnalysisTradeTypes";
import type {
  StageAnalysisFactorScores,
  StageAnalysisInstitutionalScore,
} from "./StageAnalysisScoring";
import {
  DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG,
  scoreStageAnalysisConvictionFactors,
  type StageAnalysisScoringConfig,
} from "./StageAnalysisScoring";

export type StageAnalysisExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface StageAnalysisExplanationFactor {
  title: string;
  description: string;
  impact: StageAnalysisExplanationImpact;
  contribution: number;
}

export interface StageAnalysisExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: StageAnalysisExplanationFactor[];
}

export const DEFAULT_STAGE_ANALYSIS_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type StageAnalysisExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveStageAnalysisExplainabilityConfig(
  partial?: Partial<StageAnalysisExplainabilityConfig>
): StageAnalysisExplainabilityConfig {
  return {
    ...DEFAULT_STAGE_ANALYSIS_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: StageAnalysisExplainabilityConfig
): StageAnalysisExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildStageAnalysisExplanationFactors(input: {
  detection: StageAnalysisDetection;
  setup: StageAnalysisTradeSetup;
  marketContext: InstitutionalMarketContext;
  saInput: StageAnalysisStrategyInput;
  factors?: StageAnalysisFactorScores;
  scoringConfig?: StageAnalysisScoringConfig;
  explainConfig?: StageAnalysisExplainabilityConfig;
}): StageAnalysisExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG;
  const explain = resolveStageAnalysisExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreStageAnalysisConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      saInput: input.saInput,
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
      title: "Stage Transition",
      description:
        d.transition === "1_to_2"
          ? "Stock has transitioned from Stage 1 into Stage 2."
          : d.transition === "3_to_4"
            ? "Stage 3 → Stage 4 transition confirmed."
            : d.detected
              ? `Currently classified as Stage ${d.stage}.`
              : "Stage transition not confirmed.",
      score: scores.stageTransition,
      weight: w.stageTransition,
    },
    {
      title: "Trend Confirmation",
      description: d.maRising
        ? "30-week moving average has turned upward."
        : d.maFalling
          ? "30-week moving average is declining."
          : "30-week moving average is flat.",
      score: scores.trendConfirmation,
      weight: w.trendConfirmation,
    },
    {
      title: "Institutional Activity",
      description: d.institutionalAccumulation
        ? "Institutional accumulation detected."
        : d.distribution
          ? "Distribution pressure detected."
          : "Institutional activity inconclusive.",
      score: scores.institutionalActivity,
      weight: w.institutionalActivity,
    },
    {
      title: "Relative Strength",
      description: d.rsConfirmed
        ? "Relative Strength confirms market leadership."
        : "Relative Strength insufficient for leadership.",
      score: scores.relativeStrength,
      weight: w.relativeStrength,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Breakout supported by increasing volume."
        : "Volume confirmation weak.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Market breadth supports the stage signal."
        : "Weak breadth — participation missing.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP for stage entry."
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
          ? "Liquidity acceptable for Stage Analysis."
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

export function buildStageAnalysisExplainability(input: {
  detection: StageAnalysisDetection;
  setup: StageAnalysisTradeSetup;
  marketContext: InstitutionalMarketContext;
  saInput: StageAnalysisStrategyInput;
  institutionalScore?: StageAnalysisInstitutionalScore;
  scoringConfig?: StageAnalysisScoringConfig;
  explainConfig?: Partial<StageAnalysisExplainabilityConfig>;
}): StageAnalysisExplainability {
  try {
    const explain = resolveStageAnalysisExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildStageAnalysisExplanationFactors({
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
      summary: buildStageAnalysisSummary({
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
      summary: ["Stage Analysis explainability unavailable."],
      factors: [],
    };
  }
}

export function buildStageAnalysisSummary(input: {
  detection: StageAnalysisDetection;
  setup: StageAnalysisTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: StageAnalysisInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_STAGE_ANALYSIS_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected) {
    if (d.transition === "1_to_2") {
      points.push("Stock has transitioned from Stage 1 into Stage 2.");
    } else {
      points.push(`Weinstein Stage ${d.stage} classified.`);
    }
  } else {
    points.push("Stage Analysis setup not confirmed.");
  }

  if (d.maRising) points.push("30-week moving average has turned upward.");
  if (d.institutionalAccumulation) {
    points.push("Institutional accumulation detected.");
  }
  if (d.rsConfirmed) {
    points.push("Relative Strength confirms market leadership.");
  }
  if (d.volumeConfirmed) {
    points.push("Breakout supported by increasing volume.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG.highMin
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

export function createEmptyStageAnalysisExplainability(
  warnings: string[] = []
): StageAnalysisExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Stage Analysis explainability not available."],
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
