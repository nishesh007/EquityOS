/**
 * Quality Compounder Explainability — Sprint 11B.3Y.
 */

import { round } from "@/lib/engine/utils";
import { DEFAULT_QUALITY_COMPOUNDER_CONFIG } from "./QualityCompounderConstants";
import type {
  QualityCompounderDetection,
  QualityCompounderInvestmentSetup,
} from "./QualityCompounderTypes";
import type {
  QualityCompounderFactorScores,
  QualityCompounderInstitutionalScore,
} from "./QualityCompounderScoring";
import {
  DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG,
  scoreQualityCompounderConvictionFactors,
  type QualityCompounderScoringConfig,
} from "./QualityCompounderScoring";

export type QualityCompounderExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface QualityCompounderExplanationFactor {
  title: string;
  description: string;
  impact: QualityCompounderExplanationImpact;
  contribution: number;
}

export interface QualityCompounderExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: QualityCompounderExplanationFactor[];
}

export const DEFAULT_QUALITY_COMPOUNDER_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 6,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type QualityCompounderExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveQualityCompounderExplainabilityConfig(
  partial?: Partial<QualityCompounderExplainabilityConfig>
): QualityCompounderExplainabilityConfig {
  return {
    ...DEFAULT_QUALITY_COMPOUNDER_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: QualityCompounderExplainabilityConfig
): QualityCompounderExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildQualityCompounderExplanationFactors(input: {
  detection: QualityCompounderDetection;
  setup: QualityCompounderInvestmentSetup;
  governanceScore: number;
  institutionalHolding: number;
  factors?: QualityCompounderFactorScores;
  scoringConfig?: QualityCompounderScoringConfig;
  explainConfig?: QualityCompounderExplainabilityConfig;
}): QualityCompounderExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG;
  const explain = resolveQualityCompounderExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreQualityCompounderConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
      institutionalHolding: input.institutionalHolding,
    });
  const d = input.detection;

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "Business Predictability",
      description:
        d.business.predictability >= 70
          ? "Business has demonstrated exceptional long-term capital compounding."
          : "Business predictability is limited.",
      score: scores.businessPredictability,
      weight: w.businessPredictability,
    },
    {
      title: "Moat Strength",
      description:
        d.moat.classification !== "No Moat"
          ? "The company possesses a durable economic moat."
          : "No durable economic moat.",
      score: scores.moatStrength,
      weight: w.moatStrength,
    },
    {
      title: "Capital Allocation",
      description:
        d.capital.score >=
        DEFAULT_QUALITY_COMPOUNDER_CONFIG.minCapitalAllocationHold
          ? "Management has an outstanding capital allocation track record."
          : "Weak Capital Allocation.",
      score: scores.capitalAllocation,
      weight: w.capitalAllocation,
    },
    {
      title: "Financial Strength",
      description: d.financial.healthyBalanceSheet
        ? "Balance sheet remains exceptionally strong."
        : "Financial strength below compounder standards.",
      score: scores.financialStrength,
      weight: w.financialStrength,
    },
    {
      title: "Management Quality",
      description:
        d.management.score >=
        DEFAULT_QUALITY_COMPOUNDER_CONFIG.minManagementHold
          ? "Management has an outstanding capital allocation track record."
          : "Poor Management.",
      score: scores.managementQuality,
      weight: w.managementQuality,
    },
    {
      title: "Cash Flow Quality",
      description: d.financial.positiveFcf
        ? "Revenue, earnings and free cash flow have compounded consistently for more than a decade."
        : "Weak Cash Flow.",
      score: scores.cashFlowQuality,
      weight: w.cashFlowQuality,
    },
    {
      title: "Governance",
      description: d.management.governanceRedFlags
        ? "Weak Governance."
        : "Governance standards support long-term ownership.",
      score: scores.governance,
      weight: w.governance,
    },
    {
      title: "Institutional Ownership",
      description:
        scores.institutionalOwnership >= 50
          ? "Institutional ownership supports the compounder thesis."
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

export function buildQualityCompounderExplainability(input: {
  detection: QualityCompounderDetection;
  setup: QualityCompounderInvestmentSetup;
  governanceScore: number;
  institutionalHolding: number;
  institutionalScore?: QualityCompounderInstitutionalScore;
  scoringConfig?: QualityCompounderScoringConfig;
  explainConfig?: Partial<QualityCompounderExplainabilityConfig>;
}): QualityCompounderExplainability {
  try {
    const explain = resolveQualityCompounderExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildQualityCompounderExplanationFactors({
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
      summary: buildQualityCompounderSummary({
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
      summary: ["Quality Compounder explainability unavailable."],
      factors: [],
    };
  }
}

export function buildQualityCompounderSummary(input: {
  detection: QualityCompounderDetection;
  positiveReasons: string[];
  negativeReasons: string[];
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_QUALITY_COMPOUNDER_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (
    d.business.grade === "Exceptional" ||
    d.business.grade === "Excellent"
  ) {
    points.push(
      "Business has demonstrated exceptional long-term capital compounding."
    );
  }
  if (d.financial.positiveRoic) {
    points.push("ROIC has remained consistently above the cost of capital.");
  }
  if (
    d.capital.score >=
    DEFAULT_QUALITY_COMPOUNDER_CONFIG.minCapitalAllocationHold
  ) {
    points.push(
      "Management has an outstanding capital allocation track record."
    );
  }
  if (d.moat.classification !== "No Moat") {
    points.push("The company possesses a durable economic moat.");
  }
  if (d.growth.score >= 65) {
    points.push(
      "Revenue, earnings and free cash flow have compounded consistently for more than a decade."
    );
  }
  if (d.financial.healthyBalanceSheet) {
    points.push("Balance sheet remains exceptionally strong.");
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyQualityCompounderExplainability(
  warnings: string[] = []
): QualityCompounderExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Quality Compounder explainability not available."],
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
