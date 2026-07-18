/**
 * Cup & Handle Explainability — Sprint 11B.3Q.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  CupHandleDetection,
  CupHandleStrategyInput,
} from "./CupHandleTypes";
import type { CupHandleTradeSetup } from "./CupHandleTradeTypes";
import type {
  CupHandleFactorScores,
  CupHandleInstitutionalScore,
} from "./CupHandleScoring";
import {
  DEFAULT_CUP_HANDLE_SCORING_CONFIG,
  scoreCupHandleConvictionFactors,
  type CupHandleScoringConfig,
} from "./CupHandleScoring";

export type CupHandleExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface CupHandleExplanationFactor {
  title: string;
  description: string;
  impact: CupHandleExplanationImpact;
  contribution: number;
}

export interface CupHandleExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: CupHandleExplanationFactor[];
}

export const DEFAULT_CUP_HANDLE_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type CupHandleExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveCupHandleExplainabilityConfig(
  partial?: Partial<CupHandleExplainabilityConfig>
): CupHandleExplainabilityConfig {
  return {
    ...DEFAULT_CUP_HANDLE_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: CupHandleExplainabilityConfig
): CupHandleExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildCupHandleExplanationFactors(input: {
  detection: CupHandleDetection;
  setup: CupHandleTradeSetup;
  marketContext: InstitutionalMarketContext;
  chInput: CupHandleStrategyInput;
  factors?: CupHandleFactorScores;
  scoringConfig?: CupHandleScoringConfig;
  explainConfig?: CupHandleExplainabilityConfig;
}): CupHandleExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_CUP_HANDLE_SCORING_CONFIG;
  const explain = resolveCupHandleExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreCupHandleConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      chInput: input.chInput,
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
      title: "Pattern Integrity",
      description: d.roundedCup
        ? "Rounded cup formation identified."
        : "Cup pattern integrity weak.",
      score: scores.patternIntegrity,
      weight: w.patternIntegrity,
    },
    {
      title: "Breakout Strength",
      description: d.breakoutConfirmed
        ? "Breakout confirmed with institutional participation."
        : "Breakout strength insufficient.",
      score: scores.breakoutStrength,
      weight: w.breakoutStrength,
    },
    {
      title: "Institutional Participation",
      description: d.handleValid
        ? "Supply absorbed during consolidation."
        : "Institutional participation missing.",
      score: scores.institutionalParticipation,
      weight: w.institutionalParticipation,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Handle formed with declining volume."
        : "Weak volume — confirmation missing.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Relative Strength",
      description: d.rsConfirmed
        ? "Relative strength and sector leadership support continuation."
        : "Relative Strength insufficient.",
      score: scores.relativeStrength,
      weight: w.relativeStrength,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Market breadth supports continuation."
        : "Weak breadth — participation missing.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Market regime remains supportive."
        : "Market regime unsupportive.",
      score: scores.marketRegime,
      weight: w.marketRegime,
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
          ? "Liquidity acceptable for Cup & Handle."
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

export function buildCupHandleExplainability(input: {
  detection: CupHandleDetection;
  setup: CupHandleTradeSetup;
  marketContext: InstitutionalMarketContext;
  chInput: CupHandleStrategyInput;
  institutionalScore?: CupHandleInstitutionalScore;
  scoringConfig?: CupHandleScoringConfig;
  explainConfig?: Partial<CupHandleExplainabilityConfig>;
}): CupHandleExplainability {
  try {
    const explain = resolveCupHandleExplainabilityConfig(input.explainConfig);
    const factors = buildCupHandleExplanationFactors({
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
      summary: buildCupHandleSummary({
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
      summary: ["Cup & Handle explainability unavailable."],
      factors: [],
    };
  }
}

export function buildCupHandleSummary(input: {
  detection: CupHandleDetection;
  setup: CupHandleTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: CupHandleInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ?? DEFAULT_CUP_HANDLE_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.roundedCup) points.push("Rounded cup formation identified.");
  else points.push("Cup & Handle setup not confirmed.");
  if (d.handleValid) points.push("Handle formed with declining volume.");
  if (d.handleValid) points.push("Supply absorbed during consolidation.");
  if (d.breakoutConfirmed && d.volumeConfirmed) {
    points.push("Breakout confirmed with institutional participation.");
  }
  if (d.rsConfirmed && d.sectorConfirmed) {
    points.push(
      "Relative strength and sector leadership support continuation."
    );
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_CUP_HANDLE_SCORING_CONFIG.highMin
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

export function createEmptyCupHandleExplainability(
  warnings: string[] = []
): CupHandleExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Cup & Handle explainability not available."],
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
