/**
 * Breakout Retest Explainability — Sprint 11B.3I.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./BreakoutRetestUtils";
import type {
  BreakoutRetestDetection,
  BreakoutRetestStrategyInput,
} from "./BreakoutRetestTypes";
import type { BreakoutRetestTradeSetup } from "./BreakoutRetestTradeTypes";
import type {
  BreakoutRetestFactorScores,
  BreakoutRetestInstitutionalScore,
} from "./BreakoutRetestScoring";
import {
  DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG,
  scoreBreakoutRetestConvictionFactors,
  type BreakoutRetestScoringConfig,
} from "./BreakoutRetestScoring";

export type BreakoutRetestExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface BreakoutRetestExplanationFactor {
  title: string;
  description: string;
  impact: BreakoutRetestExplanationImpact;
  contribution: number;
}

export interface BreakoutRetestExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: BreakoutRetestExplanationFactor[];
}

export const DEFAULT_BREAKOUT_RETEST_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type BreakoutRetestExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveBreakoutRetestExplainabilityConfig(
  partial?: Partial<BreakoutRetestExplainabilityConfig>
): BreakoutRetestExplainabilityConfig {
  return {
    ...DEFAULT_BREAKOUT_RETEST_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: BreakoutRetestExplainabilityConfig
): BreakoutRetestExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildBreakoutRetestExplanationFactors(input: {
  detection: BreakoutRetestDetection;
  setup: BreakoutRetestTradeSetup;
  marketContext: InstitutionalMarketContext;
  retestInput: BreakoutRetestStrategyInput;
  factors?: BreakoutRetestFactorScores;
  scoringConfig?: BreakoutRetestScoringConfig;
  explainConfig?: BreakoutRetestExplainabilityConfig;
}): BreakoutRetestExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG;
  const explain = resolveBreakoutRetestExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreBreakoutRetestConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      retestInput: input.retestInput,
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
      title: "Breakout Strength",
      description: d.breakoutConfirmed
        ? "Resistance converted into support."
        : "Breakout strength not confirmed.",
      score: scores.breakoutStrength,
      weight: w.breakoutStrength,
    },
    {
      title: "Retest Confirmation",
      description: d.retestHeld
        ? "Retest held with declining volume."
        : "Retest failed to hold breakout zone.",
      score: scores.retestConfirmation,
      weight: w.retestConfirmation,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Institutional buying resumed after pullback."
        : "Low volume — weak breakout confirmation.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "Trend Alignment",
      description: d.continuationConfirmed
        ? "Higher low maintained after retest."
        : "Weak Trend — continuation not confirmed.",
      score: scores.trendAlignment,
      weight: w.trendAlignment,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP for breakout continuation."
          : "VWAP alignment weak for breakout retest.",
      score: scores.vwapAlignment,
      weight: w.vwapAlignment,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Market breadth confirms breakout."
        : "Weak Breadth — participation insufficient.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? "Sector leadership remains intact."
        : "Weak Sector — breakout retest insufficient.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
    },
    {
      title: "Risk/Reward",
      description:
        input.setup.riskReward >= scoring.minimumRiskReward
          ? "Risk/Reward exceeds breakout retest threshold."
          : "Risk/Reward below breakout retest threshold.",
      score: scores.riskReward,
      weight: w.riskReward,
    },
    {
      title: "Liquidity",
      description:
        scores.liquidity >= 60
          ? "Liquidity acceptable for breakout retest."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
  ];

  if (d.sectorConfirmed) {
    catalog.push({
      title: "Sector Participation",
      description: `Sector leadership remains intact (avg ${round(averageSectorScore(input.marketContext), 0)}).`,
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

export function buildBreakoutRetestExplainability(input: {
  detection: BreakoutRetestDetection;
  setup: BreakoutRetestTradeSetup;
  marketContext: InstitutionalMarketContext;
  retestInput: BreakoutRetestStrategyInput;
  institutionalScore?: BreakoutRetestInstitutionalScore;
  scoringConfig?: BreakoutRetestScoringConfig;
  explainConfig?: Partial<BreakoutRetestExplainabilityConfig>;
}): BreakoutRetestExplainability {
  try {
    const explain = resolveBreakoutRetestExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildBreakoutRetestExplanationFactors({
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
      summary: buildBreakoutRetestSummary({
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
      summary: ["Breakout Retest explainability unavailable."],
      factors: [],
    };
  }
}

export function buildBreakoutRetestSummary(input: {
  detection: BreakoutRetestDetection;
  setup: BreakoutRetestTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: BreakoutRetestInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_BREAKOUT_RETEST_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected && d.direction === "BUY") {
    points.push("Resistance converted into support.");
  } else if (d.detected && d.direction === "SELL") {
    points.push("Support converted into resistance.");
  } else {
    points.push("Breakout Retest setup not confirmed.");
  }

  if (d.retestHeld) {
    points.push("Retest held with declining volume.");
  }
  if (d.volumeConfirmed) {
    points.push("Institutional buying resumed after pullback.");
  }
  if (d.breadthConfirmed) {
    points.push("Market breadth confirms breakout.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector leadership remains intact.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG.highMin
  ) {
    points.push(
      `Breakout retest conviction ${input.institutionalScore.grade} (${input.institutionalScore.signalGrade}).`
    );
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }

  return dedupe(points).slice(0, max);
}

export function createEmptyBreakoutRetestExplainability(
  warnings: string[] = []
): BreakoutRetestExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Breakout Retest explainability not available."],
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
