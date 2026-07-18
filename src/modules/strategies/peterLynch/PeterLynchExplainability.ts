/**
 * Peter Lynch Explainability — Sprint 11B.3W.
 */

import { round } from "@/lib/engine/utils";
import type {
  PeterLynchDetection,
  PeterLynchInvestmentSetup,
} from "./PeterLynchTypes";
import type {
  PeterLynchFactorScores,
  PeterLynchInstitutionalScore,
} from "./PeterLynchScoring";
import {
  DEFAULT_PETER_LYNCH_SCORING_CONFIG,
  scorePeterLynchConvictionFactors,
  type PeterLynchScoringConfig,
} from "./PeterLynchScoring";

export type PeterLynchExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface PeterLynchExplanationFactor {
  title: string;
  description: string;
  impact: PeterLynchExplanationImpact;
  contribution: number;
}

export interface PeterLynchExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: PeterLynchExplanationFactor[];
}

export const DEFAULT_PETER_LYNCH_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type PeterLynchExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolvePeterLynchExplainabilityConfig(
  partial?: Partial<PeterLynchExplainabilityConfig>
): PeterLynchExplainabilityConfig {
  return {
    ...DEFAULT_PETER_LYNCH_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: PeterLynchExplainabilityConfig
): PeterLynchExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildPeterLynchExplanationFactors(input: {
  detection: PeterLynchDetection;
  setup: PeterLynchInvestmentSetup;
  governanceScore: number;
  institutionalHolding: number;
  factors?: PeterLynchFactorScores;
  scoringConfig?: PeterLynchScoringConfig;
  explainConfig?: PeterLynchExplainabilityConfig;
}): PeterLynchExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_PETER_LYNCH_SCORING_CONFIG;
  const explain = resolvePeterLynchExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scorePeterLynchConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
      institutionalHolding: input.institutionalHolding,
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
      title: "Growth Consistency",
      description:
        d.growth.grade === "Excellent" || d.growth.grade === "Good"
          ? "Revenue and EPS have compounded consistently over multiple years."
          : "Growth consistency is limited.",
      score: scores.growthConsistency,
      weight: w.growthConsistency,
    },
    {
      title: "PEG Quality",
      description:
        d.peg.band === "PEG < 1" || d.peg.band === "PEG 1–1.5"
          ? "PEG ratio indicates attractive growth-adjusted valuation."
          : "PEG is stretched relative to growth.",
      score: scores.pegQuality,
      weight: w.pegQuality,
    },
    {
      title: "Business Scalability",
      description:
        d.business.scalableBusiness >= 65
          ? "Business continues to scale while maintaining profitability."
          : "Scalability concerns.",
      score: scores.businessScalability,
      weight: w.businessScalability,
    },
    {
      title: "Financial Strength",
      description: d.financial.healthyBalanceSheet
        ? "Balance sheet supports future expansion."
        : "Financial strength below GARP standards.",
      score: scores.financialStrength,
      weight: w.financialStrength,
    },
    {
      title: "Cash Flow Quality",
      description: d.financial.positiveFcf
        ? "Free cash flow supports growth reinvestment."
        : "Negative Cash Flow.",
      score: scores.cashFlowQuality,
      weight: w.cashFlowQuality,
    },
    {
      title: "Management Quality",
      description:
        d.business.score >= 65
          ? "Growth quality remains above industry average."
          : "Business quality concerns.",
      score: scores.managementQuality,
      weight: w.managementQuality,
    },
    {
      title: "Governance",
      description:
        scores.governance >= 55
          ? "Governance standards are acceptable."
          : "Poor Governance.",
      score: scores.governance,
      weight: w.governance,
    },
    {
      title: "Institutional Ownership",
      description:
        scores.institutionalOwnership >= 50
          ? "Institutional ownership supports the thesis."
          : "Institutional ownership is low.",
      score: scores.institutionalOwnership,
      weight: w.institutionalOwnership,
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

export function buildPeterLynchExplainability(input: {
  detection: PeterLynchDetection;
  setup: PeterLynchInvestmentSetup;
  governanceScore: number;
  institutionalHolding: number;
  institutionalScore?: PeterLynchInstitutionalScore;
  scoringConfig?: PeterLynchScoringConfig;
  explainConfig?: Partial<PeterLynchExplainabilityConfig>;
}): PeterLynchExplainability {
  try {
    const explain = resolvePeterLynchExplainabilityConfig(input.explainConfig);
    const factors = buildPeterLynchExplanationFactors({
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
      summary: buildPeterLynchSummary({
        detection: input.detection,
        positiveReasons,
        negativeReasons,
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
      summary: ["Peter Lynch explainability unavailable."],
      factors: [],
    };
  }
}

export function buildPeterLynchSummary(input: {
  detection: PeterLynchDetection;
  positiveReasons: string[];
  negativeReasons: string[];
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_PETER_LYNCH_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.growth.grade === "Excellent" || d.growth.grade === "Good") {
    points.push(
      "Revenue and EPS have compounded consistently over multiple years."
    );
  }
  if (d.peg.band === "PEG < 1" || d.peg.band === "PEG 1–1.5") {
    points.push(
      "PEG ratio indicates attractive growth-adjusted valuation."
    );
  }
  if (d.business.scalableBusiness >= 65) {
    points.push(
      "Business continues to scale while maintaining profitability."
    );
  }
  if (d.financial.healthyBalanceSheet) {
    points.push("Balance sheet supports future expansion.");
  }
  if (d.growth.score >= 70) {
    points.push("Growth quality remains above industry average.");
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyPeterLynchExplainability(
  warnings: string[] = []
): PeterLynchExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Peter Lynch explainability not available."],
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
