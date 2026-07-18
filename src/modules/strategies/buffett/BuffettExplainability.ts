/**
 * Buffett Explainability — Sprint 11B.3U.
 */

import { round } from "@/lib/engine/utils";
import type { BuffettDetection, BuffettInvestmentSetup } from "./BuffettTypes";
import type {
  BuffettFactorScores,
  BuffettInstitutionalScore,
} from "./BuffettScoring";
import {
  DEFAULT_BUFFETT_SCORING_CONFIG,
  scoreBuffettConvictionFactors,
  type BuffettScoringConfig,
} from "./BuffettScoring";

export type BuffettExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface BuffettExplanationFactor {
  title: string;
  description: string;
  impact: BuffettExplanationImpact;
  contribution: number;
}

export interface BuffettExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: BuffettExplanationFactor[];
}

export const DEFAULT_BUFFETT_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type BuffettExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveBuffettExplainabilityConfig(
  partial?: Partial<BuffettExplainabilityConfig>
): BuffettExplainabilityConfig {
  return {
    ...DEFAULT_BUFFETT_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: BuffettExplainabilityConfig
): BuffettExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildBuffettExplanationFactors(input: {
  detection: BuffettDetection;
  setup: BuffettInvestmentSetup;
  institutionalHolding: number;
  factors?: BuffettFactorScores;
  scoringConfig?: BuffettScoringConfig;
  explainConfig?: BuffettExplainabilityConfig;
}): BuffettExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_BUFFETT_SCORING_CONFIG;
  const explain = resolveBuffettExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreBuffettConvictionFactors({
      detection: input.detection,
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
      title: "Moat Strength",
      description:
        d.moat.classification !== "No Moat"
          ? "Business demonstrates a durable competitive advantage."
          : "Weak moat.",
      score: scores.moatStrength,
      weight: w.moatStrength,
    },
    {
      title: "Business Predictability",
      description:
        d.business.predictability >= 70
          ? "Free cash flow generation is highly predictable."
          : "Business predictability is limited.",
      score: scores.businessPredictability,
      weight: w.businessPredictability,
    },
    {
      title: "Financial Strength",
      description:
        d.financial.roeOk && d.financial.roceOk
          ? "ROE and ROCE have remained consistently strong."
          : "Financial strength below Buffett standards.",
      score: scores.financialStrength,
      weight: w.financialStrength,
    },
    {
      title: "Management Quality",
      description:
        d.management.score >= 70
          ? "Management has demonstrated disciplined capital allocation."
          : "Management quality concerns.",
      score: scores.managementQuality,
      weight: w.managementQuality,
    },
    {
      title: "Valuation",
      description:
        d.valuation.status === "Undervalued"
          ? "Current valuation provides an adequate margin of safety."
          : d.valuation.status === "Fairly Valued"
            ? "Valuation is roughly fair."
            : "Overvalued relative to intrinsic value.",
      score: scores.valuation,
      weight: w.valuation,
    },
    {
      title: "Cash Flow Quality",
      description:
        d.financial.positiveFcf
          ? "Free cash flow generation is highly predictable."
          : "Negative Free Cash Flow.",
      score: scores.cashFlowQuality,
      weight: w.cashFlowQuality,
    },
    {
      title: "Governance",
      description: d.management.governanceRedFlags
        ? "Poor governance."
        : "Governance standards are acceptable.",
      score: scores.governance,
      weight: w.governance,
    },
    {
      title: "Institutional Ownership",
      description:
        scores.institutionalOwnership >= 60
          ? "Institutional ownership supports quality ownership base."
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

export function buildBuffettExplainability(input: {
  detection: BuffettDetection;
  setup: BuffettInvestmentSetup;
  institutionalHolding: number;
  institutionalScore?: BuffettInstitutionalScore;
  scoringConfig?: BuffettScoringConfig;
  explainConfig?: Partial<BuffettExplainabilityConfig>;
}): BuffettExplainability {
  try {
    const explain = resolveBuffettExplainabilityConfig(input.explainConfig);
    const factors = buildBuffettExplanationFactors({
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
      summary: buildBuffettSummary({
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
      summary: ["Buffett explainability unavailable."],
      factors: [],
    };
  }
}

export function buildBuffettSummary(input: {
  detection: BuffettDetection;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: BuffettInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ?? DEFAULT_BUFFETT_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.moat.classification !== "No Moat") {
    points.push("Business demonstrates a durable competitive advantage.");
  }
  if (d.financial.roeOk && d.financial.roceOk) {
    points.push("ROE and ROCE have remained consistently strong.");
  }
  if (d.financial.positiveFcf) {
    points.push("Free cash flow generation is highly predictable.");
  }
  if (d.management.score >= 70) {
    points.push(
      "Management has demonstrated disciplined capital allocation."
    );
  }
  if (d.valuation.status === "Undervalued") {
    points.push("Current valuation provides an adequate margin of safety.");
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyBuffettExplainability(
  warnings: string[] = []
): BuffettExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Buffett explainability not available."],
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
