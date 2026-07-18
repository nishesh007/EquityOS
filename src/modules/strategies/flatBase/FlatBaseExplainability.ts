/**
 * Flat Base Explainability — Sprint 11B.3R.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  FlatBaseDetection,
  FlatBaseStrategyInput,
} from "./FlatBaseTypes";
import type { FlatBaseTradeSetup } from "./FlatBaseTradeTypes";
import type {
  FlatBaseFactorScores,
  FlatBaseInstitutionalScore,
} from "./FlatBaseScoring";
import {
  DEFAULT_FLAT_BASE_SCORING_CONFIG,
  scoreFlatBaseConvictionFactors,
  type FlatBaseScoringConfig,
} from "./FlatBaseScoring";

export type FlatBaseExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface FlatBaseExplanationFactor {
  title: string;
  description: string;
  impact: FlatBaseExplanationImpact;
  contribution: number;
}

export interface FlatBaseExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: FlatBaseExplanationFactor[];
}

export const DEFAULT_FLAT_BASE_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type FlatBaseExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveFlatBaseExplainabilityConfig(
  partial?: Partial<FlatBaseExplainabilityConfig>
): FlatBaseExplainabilityConfig {
  return {
    ...DEFAULT_FLAT_BASE_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: FlatBaseExplainabilityConfig
): FlatBaseExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildFlatBaseExplanationFactors(input: {
  detection: FlatBaseDetection;
  setup: FlatBaseTradeSetup;
  marketContext: InstitutionalMarketContext;
  fbInput: FlatBaseStrategyInput;
  factors?: FlatBaseFactorScores;
  scoringConfig?: FlatBaseScoringConfig;
  explainConfig?: FlatBaseExplainabilityConfig;
}): FlatBaseExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_FLAT_BASE_SCORING_CONFIG;
  const explain = resolveFlatBaseExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreFlatBaseConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      fbInput: input.fbInput,
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
      description: d.flatBaseValid
        ? "Flat base formed after a strong advance."
        : "Flat base pattern integrity weak.",
      score: scores.patternIntegrity,
      weight: w.patternIntegrity,
    },
    {
      title: "Institutional Buying",
      description: d.volumeConfirmed
        ? "Breakout confirmed with institutional volume."
        : "Institutional buying missing.",
      score: scores.institutionalBuying,
      weight: w.institutionalBuying,
    },
    {
      title: "Breakout Strength",
      description: d.breakoutConfirmed
        ? "Price remained within acceptable depth."
        : "Breakout strength insufficient.",
      score: scores.breakoutStrength,
      weight: w.breakoutStrength,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Volatility contracted throughout the base."
        : "Weak volume — confirmation missing.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Relative Strength",
      description: d.rsConfirmed
        ? "Relative strength supports continuation."
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
          ? "Sector leadership supports continuation."
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

export function buildFlatBaseExplainability(input: {
  detection: FlatBaseDetection;
  setup: FlatBaseTradeSetup;
  marketContext: InstitutionalMarketContext;
  fbInput: FlatBaseStrategyInput;
  institutionalScore?: FlatBaseInstitutionalScore;
  scoringConfig?: FlatBaseScoringConfig;
  explainConfig?: Partial<FlatBaseExplainabilityConfig>;
}): FlatBaseExplainability {
  try {
    const explain = resolveFlatBaseExplainabilityConfig(input.explainConfig);
    const factors = buildFlatBaseExplanationFactors({
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
      summary: buildFlatBaseSummary({
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
      summary: ["Flat Base explainability unavailable."],
      factors: [],
    };
  }
}

export function buildFlatBaseSummary(input: {
  detection: FlatBaseDetection;
  setup: FlatBaseTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: FlatBaseInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_FLAT_BASE_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.flatBaseValid) {
    points.push("Flat base formed after a strong advance.");
  } else {
    points.push("Flat Base setup not confirmed.");
  }
  if (d.baseValid) {
    points.push("Volatility contracted throughout the base.");
    points.push("Price remained within acceptable depth.");
  }
  if (d.breakoutConfirmed && d.volumeConfirmed) {
    points.push("Breakout confirmed with institutional volume.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector leadership supports continuation.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_FLAT_BASE_SCORING_CONFIG.highMin
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

export function createEmptyFlatBaseExplainability(
  warnings: string[] = []
): FlatBaseExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Flat Base explainability not available."],
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
