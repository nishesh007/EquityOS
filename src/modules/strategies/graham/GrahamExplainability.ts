/**
 * Graham Explainability — Sprint 11B.3V.
 */

import { DEFAULT_GRAHAM_CONFIG } from "./GrahamConstants";
import { round } from "@/lib/engine/utils";
import type { GrahamDetection, GrahamInvestmentSetup } from "./GrahamTypes";
import type {
  GrahamFactorScores,
  GrahamInstitutionalScore,
} from "./GrahamScoring";
import {
  DEFAULT_GRAHAM_SCORING_CONFIG,
  scoreGrahamConvictionFactors,
  type GrahamScoringConfig,
} from "./GrahamScoring";

export type GrahamExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface GrahamExplanationFactor {
  title: string;
  description: string;
  impact: GrahamExplanationImpact;
  contribution: number;
}

export interface GrahamExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: GrahamExplanationFactor[];
}

export const DEFAULT_GRAHAM_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type GrahamExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveGrahamExplainabilityConfig(
  partial?: Partial<GrahamExplainabilityConfig>
): GrahamExplainabilityConfig {
  return {
    ...DEFAULT_GRAHAM_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: GrahamExplainabilityConfig
): GrahamExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildGrahamExplanationFactors(input: {
  detection: GrahamDetection;
  setup: GrahamInvestmentSetup;
  governanceScore: number;
  factors?: GrahamFactorScores;
  scoringConfig?: GrahamScoringConfig;
  explainConfig?: GrahamExplainabilityConfig;
}): GrahamExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_GRAHAM_SCORING_CONFIG;
  const explain = resolveGrahamExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreGrahamConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
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
      title: "Margin of Safety",
      description:
        d.marginSafety.marginOfSafety > 0
          ? "The investment offers a meaningful margin of safety."
          : "Insufficient margin of safety.",
      score: scores.marginOfSafety,
      weight: w.marginOfSafety,
    },
    {
      title: "Financial Stability",
      description:
        d.financial.score >= 70
          ? "Company maintains a strong balance sheet with conservative leverage."
          : "Financial stability below Graham standards.",
      score: scores.financialStability,
      weight: w.financialStability,
    },
    {
      title: "Intrinsic Value Confidence",
      description:
        d.intrinsic.confidence >= 60
          ? "Current price trades significantly below estimated intrinsic value."
          : "Intrinsic value estimate has limited confidence.",
      score: scores.intrinsicValueConfidence,
      weight: w.intrinsicValueConfidence,
    },
    {
      title: "Cash Flow",
      description: d.financial.positiveFcf
        ? "Free cash flow remains consistently positive."
        : "Negative Free Cash Flow.",
      score: scores.cashFlow,
      weight: w.cashFlow,
    },
    {
      title: "Debt Profile",
      description: d.balanceSheet.debtOk
        ? "Company maintains a strong balance sheet with conservative leverage."
        : "High Debt.",
      score: scores.debtProfile,
      weight: w.debtProfile,
    },
    {
      title: "Governance",
      description:
        scores.governance >= 60
          ? "Governance standards are acceptable."
          : "Corporate Governance Issues.",
      score: scores.governance,
      weight: w.governance,
    },
    {
      title: "Earnings Stability",
      description:
        d.financial.earningsStability >= 55
          ? "Earnings profile is sufficiently stable for value investing."
          : "Earnings instability.",
      score: scores.earningsStability,
      weight: w.earningsStability,
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

export function buildGrahamExplainability(input: {
  detection: GrahamDetection;
  setup: GrahamInvestmentSetup;
  governanceScore: number;
  institutionalScore?: GrahamInstitutionalScore;
  scoringConfig?: GrahamScoringConfig;
  explainConfig?: Partial<GrahamExplainabilityConfig>;
}): GrahamExplainability {
  try {
    const explain = resolveGrahamExplainabilityConfig(input.explainConfig);
    const factors = buildGrahamExplanationFactors({
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
    ]);

    return {
      positiveReasons: dedupe(positiveReasons),
      negativeReasons: dedupe(negativeReasons),
      neutralFactors: dedupe(neutralFactors),
      warnings,
      summary: buildGrahamSummary({
        detection: input.detection,
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
      warnings: ["Explainability failed."],
      summary: ["Graham explainability unavailable."],
      factors: [],
    };
  }
}

export function buildGrahamSummary(input: {
  detection: GrahamDetection;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: GrahamInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ?? DEFAULT_GRAHAM_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.marginSafety.marginOfSafety > 0) {
    points.push(
      "Current price trades significantly below estimated intrinsic value."
    );
  }
  if (d.balanceSheet.debtOk) {
    points.push(
      "Company maintains a strong balance sheet with conservative leverage."
    );
  }
  if (d.balanceSheet.currentRatioOk && d.balanceSheet.quickRatioOk) {
    points.push(
      "Current ratio and liquidity comfortably exceed Graham's thresholds."
    );
  }
  if (d.financial.positiveFcf) {
    points.push("Free cash flow remains consistently positive.");
  }
  if (d.marginSafety.marginOfSafety >= DEFAULT_GRAHAM_CONFIG.minMarginOfSafetyWatch) {
    points.push("The investment offers a meaningful margin of safety.");
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyGrahamExplainability(
  warnings: string[] = []
): GrahamExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Graham explainability not available."],
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
