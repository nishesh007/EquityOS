/**
 * Relative Strength Leadership Explainability — Sprint 11B.3O.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipStrategyInput,
} from "./RelativeStrengthLeadershipTypes";
import type { RelativeStrengthLeadershipTradeSetup } from "./RelativeStrengthLeadershipTradeTypes";
import type {
  RelativeStrengthLeadershipFactorScores,
  RelativeStrengthLeadershipInstitutionalScore,
} from "./RelativeStrengthLeadershipScoring";
import {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG,
  scoreRelativeStrengthLeadershipConvictionFactors,
  type RelativeStrengthLeadershipScoringConfig,
} from "./RelativeStrengthLeadershipScoring";

export type RelativeStrengthLeadershipExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface RelativeStrengthLeadershipExplanationFactor {
  title: string;
  description: string;
  impact: RelativeStrengthLeadershipExplanationImpact;
  contribution: number;
}

export interface RelativeStrengthLeadershipExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: RelativeStrengthLeadershipExplanationFactor[];
}

export const DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type RelativeStrengthLeadershipExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveRelativeStrengthLeadershipExplainabilityConfig(
  partial?: Partial<RelativeStrengthLeadershipExplainabilityConfig>
): RelativeStrengthLeadershipExplainabilityConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: RelativeStrengthLeadershipExplainabilityConfig
): RelativeStrengthLeadershipExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildRelativeStrengthLeadershipExplanationFactors(input: {
  detection: RelativeStrengthLeadershipDetection;
  setup: RelativeStrengthLeadershipTradeSetup;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthLeadershipStrategyInput;
  factors?: RelativeStrengthLeadershipFactorScores;
  scoringConfig?: RelativeStrengthLeadershipScoringConfig;
  explainConfig?: RelativeStrengthLeadershipExplainabilityConfig;
}): RelativeStrengthLeadershipExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG;
  const explain = resolveRelativeStrengthLeadershipExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreRelativeStrengthLeadershipConvictionFactors({
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
      title: "RS Momentum",
      description: d.rsIncreasing
        ? "Relative strength momentum remains constructive."
        : "Declining RS — momentum not persistent.",
      score: scores.rsMomentum,
      weight: w.rsMomentum,
    },
    {
      title: "Institutional Leadership",
      description: d.detected
        ? "Institutional leadership confirmed."
        : "Institutional leadership missing.",
      score: scores.institutionalLeadership,
      weight: w.institutionalLeadership,
    },
    {
      title: "Trend Confirmation",
      description:
        d.trendQuality >= 70
          ? "Trend quality remains exceptionally strong."
          : "Trend confirmation weak.",
      score: scores.trendConfirmation,
      weight: w.trendConfirmation,
    },
    {
      title: "Relative Volume",
      description: d.volumeConfirmed
        ? "Strong relative volume supports leadership."
        : "Weak volume — institutional participation missing.",
      score: scores.relativeVolume,
      weight: w.relativeVolume,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Healthy breadth supports continued leadership."
        : "Weak breadth — market participation missing.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? "Sector leadership supports continued momentum."
        : "Weak sector — leadership missing.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price remains aligned above VWAP."
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
          ? "Liquidity acceptable for RS leadership."
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

export function buildRelativeStrengthLeadershipExplainability(input: {
  detection: RelativeStrengthLeadershipDetection;
  setup: RelativeStrengthLeadershipTradeSetup;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthLeadershipStrategyInput;
  institutionalScore?: RelativeStrengthLeadershipInstitutionalScore;
  scoringConfig?: RelativeStrengthLeadershipScoringConfig;
  explainConfig?: Partial<RelativeStrengthLeadershipExplainabilityConfig>;
}): RelativeStrengthLeadershipExplainability {
  try {
    const explain = resolveRelativeStrengthLeadershipExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildRelativeStrengthLeadershipExplanationFactors({
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
      summary: buildRelativeStrengthLeadershipSummary({
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
      summary: ["Relative Strength Leadership explainability unavailable."],
      factors: [],
    };
  }
}

export function buildRelativeStrengthLeadershipSummary(input: {
  detection: RelativeStrengthLeadershipDetection;
  setup: RelativeStrengthLeadershipTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: RelativeStrengthLeadershipInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected) {
    points.push(
      "Stock ranks in the top percentile for relative strength."
    );
  } else {
    points.push("Relative Strength Leadership setup not confirmed.");
  }
  if (d.outperformingBenchmark && d.outperformingSector) {
    points.push("Outperforming both benchmark and sector.");
  }
  if (d.detected && d.rsIncreasing) {
    points.push("Institutional leadership confirmed.");
  }
  if (d.trendQuality >= 70) {
    points.push("Trend quality remains exceptionally strong.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector leadership supports continued momentum.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG.highMin
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

export function createEmptyRelativeStrengthLeadershipExplainability(
  warnings: string[] = []
): RelativeStrengthLeadershipExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Relative Strength Leadership explainability not available."],
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
