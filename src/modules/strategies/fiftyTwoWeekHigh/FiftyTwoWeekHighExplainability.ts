/**
 * 52-Week High Explainability — Sprint 11B.3S.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighStrategyInput,
} from "./FiftyTwoWeekHighTypes";
import type { FiftyTwoWeekHighTradeSetup } from "./FiftyTwoWeekHighTradeTypes";
import type {
  FiftyTwoWeekHighFactorScores,
  FiftyTwoWeekHighInstitutionalScore,
} from "./FiftyTwoWeekHighScoring";
import {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG,
  scoreFiftyTwoWeekHighConvictionFactors,
  type FiftyTwoWeekHighScoringConfig,
} from "./FiftyTwoWeekHighScoring";

export type FiftyTwoWeekHighExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface FiftyTwoWeekHighExplanationFactor {
  title: string;
  description: string;
  impact: FiftyTwoWeekHighExplanationImpact;
  contribution: number;
}

export interface FiftyTwoWeekHighExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: FiftyTwoWeekHighExplanationFactor[];
}

export const DEFAULT_FIFTY_TWO_WEEK_HIGH_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type FiftyTwoWeekHighExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveFiftyTwoWeekHighExplainabilityConfig(
  partial?: Partial<FiftyTwoWeekHighExplainabilityConfig>
): FiftyTwoWeekHighExplainabilityConfig {
  return {
    ...DEFAULT_FIFTY_TWO_WEEK_HIGH_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: FiftyTwoWeekHighExplainabilityConfig
): FiftyTwoWeekHighExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildFiftyTwoWeekHighExplanationFactors(input: {
  detection: FiftyTwoWeekHighDetection;
  setup: FiftyTwoWeekHighTradeSetup;
  marketContext: InstitutionalMarketContext;
  ftwInput: FiftyTwoWeekHighStrategyInput;
  factors?: FiftyTwoWeekHighFactorScores;
  scoringConfig?: FiftyTwoWeekHighScoringConfig;
  explainConfig?: FiftyTwoWeekHighExplainabilityConfig;
}): FiftyTwoWeekHighExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG;
  const explain = resolveFiftyTwoWeekHighExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreFiftyTwoWeekHighConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      ftwInput: input.ftwInput,
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
      title: "Institutional Participation",
      description: d.institutionalConfirmed
        ? "Institutional buying confirmed by strong volume."
        : "Institutional participation missing.",
      score: scores.institutionalParticipation,
      weight: w.institutionalParticipation,
    },
    {
      title: "Breakout Strength",
      description: d.breakoutConfirmed
        ? "Stock has achieved a fresh 52-week high."
        : "Breakout strength insufficient.",
      score: scores.breakoutStrength,
      weight: w.breakoutStrength,
    },
    {
      title: "Relative Strength",
      description: d.rsConfirmed
        ? "Relative strength ranks among market leaders."
        : "Relative Strength insufficient.",
      score: scores.relativeStrength,
      weight: w.relativeStrength,
    },
    {
      title: "Momentum Persistence",
      description:
        d.momentumPersistence >= 60
          ? "Trend structure remains exceptionally strong."
          : "Momentum persistence weak.",
      score: scores.momentumPersistence,
      weight: w.momentumPersistence,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Institutional buying confirmed by strong volume."
        : "Weak volume — confirmation missing.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? "Sector leadership supports continuation."
        : "Weak sector — leadership missing.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
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
          ? "Liquidity acceptable for 52-Week High."
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

export function buildFiftyTwoWeekHighExplainability(input: {
  detection: FiftyTwoWeekHighDetection;
  setup: FiftyTwoWeekHighTradeSetup;
  marketContext: InstitutionalMarketContext;
  ftwInput: FiftyTwoWeekHighStrategyInput;
  institutionalScore?: FiftyTwoWeekHighInstitutionalScore;
  scoringConfig?: FiftyTwoWeekHighScoringConfig;
  explainConfig?: Partial<FiftyTwoWeekHighExplainabilityConfig>;
}): FiftyTwoWeekHighExplainability {
  try {
    const explain = resolveFiftyTwoWeekHighExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildFiftyTwoWeekHighExplanationFactors({
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
      summary: buildFiftyTwoWeekHighSummary({
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
      summary: ["52-Week High explainability unavailable."],
      factors: [],
    };
  }
}

export function buildFiftyTwoWeekHighSummary(input: {
  detection: FiftyTwoWeekHighDetection;
  setup: FiftyTwoWeekHighTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: FiftyTwoWeekHighInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_FIFTY_TWO_WEEK_HIGH_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.breakoutConfirmed) {
    points.push("Stock has achieved a fresh 52-week high.");
  } else {
    points.push("52-Week High setup not confirmed.");
  }
  if (d.volumeConfirmed) {
    points.push("Institutional buying confirmed by strong volume.");
  }
  if (d.rsConfirmed) {
    points.push("Relative strength ranks among market leaders.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector leadership supports continuation.");
  }
  if (d.trendQuality >= 70) {
    points.push("Trend structure remains exceptionally strong.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG.highMin
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

export function createEmptyFiftyTwoWeekHighExplainability(
  warnings: string[] = []
): FiftyTwoWeekHighExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["52-Week High explainability not available."],
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
