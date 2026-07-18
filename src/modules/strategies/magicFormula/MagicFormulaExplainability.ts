/**
 * Magic Formula Explainability — Sprint 11B.3X.
 */

import { round } from "@/lib/engine/utils";
import type {
  MagicFormulaDetection,
  MagicFormulaInvestmentSetup,
} from "./MagicFormulaTypes";
import type {
  MagicFormulaFactorScores,
  MagicFormulaInstitutionalScore,
} from "./MagicFormulaScoring";
import {
  DEFAULT_MAGIC_FORMULA_SCORING_CONFIG,
  scoreMagicFormulaConvictionFactors,
  type MagicFormulaScoringConfig,
} from "./MagicFormulaScoring";
import { DEFAULT_MAGIC_FORMULA_CONFIG } from "./MagicFormulaConstants";

export type MagicFormulaExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface MagicFormulaExplanationFactor {
  title: string;
  description: string;
  impact: MagicFormulaExplanationImpact;
  contribution: number;
}

export interface MagicFormulaExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: MagicFormulaExplanationFactor[];
}

export const DEFAULT_MAGIC_FORMULA_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type MagicFormulaExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveMagicFormulaExplainabilityConfig(
  partial?: Partial<MagicFormulaExplainabilityConfig>
): MagicFormulaExplainabilityConfig {
  return {
    ...DEFAULT_MAGIC_FORMULA_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: MagicFormulaExplainabilityConfig
): MagicFormulaExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildMagicFormulaExplanationFactors(input: {
  detection: MagicFormulaDetection;
  setup: MagicFormulaInvestmentSetup;
  governanceScore: number;
  institutionalHolding: number;
  factors?: MagicFormulaFactorScores;
  scoringConfig?: MagicFormulaScoringConfig;
  explainConfig?: MagicFormulaExplainabilityConfig;
}): MagicFormulaExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_MAGIC_FORMULA_SCORING_CONFIG;
  const explain = resolveMagicFormulaExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreMagicFormulaConvictionFactors({
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
      title: "Composite Rank",
      description:
        d.ranking.percentileRank <=
        DEFAULT_MAGIC_FORMULA_CONFIG.topPercentileBuy
          ? "Company ranks in the top percentile of the Magic Formula universe."
          : "Magic Formula rank is outside the preferred top band.",
      score: scores.compositeRank,
      weight: w.compositeRank,
    },
    {
      title: "ROC Quality",
      description:
        d.roc.returnOnCapital >= DEFAULT_MAGIC_FORMULA_CONFIG.minRocWatch
          ? "Return on capital demonstrates efficient capital allocation."
          : "Return on capital is weak.",
      score: scores.rocQuality,
      weight: w.rocQuality,
    },
    {
      title: "Earnings Yield",
      description:
        d.earningsYield.earningsYield >=
        DEFAULT_MAGIC_FORMULA_CONFIG.minEarningsYieldWatch
          ? "High earnings yield indicates attractive valuation."
          : "Earnings yield is unattractive.",
      score: scores.earningsYield,
      weight: w.earningsYield,
    },
    {
      title: "Financial Strength",
      description: d.financial.healthyBalanceSheet
        ? "Financial strength and governance satisfy institutional filters."
        : "Balance sheet does not meet Magic Formula filters.",
      score: scores.financialStrength,
      weight: w.financialStrength,
    },
    {
      title: "Cash Flow Quality",
      description: d.financial.positiveFcf
        ? "Strong operating cash flow supports earnings quality."
        : "Negative Cash Flow.",
      score: scores.cashFlowQuality,
      weight: w.cashFlowQuality,
    },
    {
      title: "Governance",
      description:
        scores.governance >= DEFAULT_MAGIC_FORMULA_CONFIG.minGovernanceScore
          ? "Financial strength and governance satisfy institutional filters."
          : "Weak Governance.",
      score: scores.governance,
      weight: w.governance,
    },
    {
      title: "Institutional Ownership",
      description:
        scores.institutionalOwnership >= 40
          ? "Institutional participation supports the thesis."
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

export function buildMagicFormulaExplainability(input: {
  detection: MagicFormulaDetection;
  setup: MagicFormulaInvestmentSetup;
  governanceScore: number;
  institutionalHolding: number;
  institutionalScore?: MagicFormulaInstitutionalScore;
  scoringConfig?: MagicFormulaScoringConfig;
  explainConfig?: Partial<MagicFormulaExplainabilityConfig>;
}): MagicFormulaExplainability {
  try {
    const explain = resolveMagicFormulaExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildMagicFormulaExplanationFactors({
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
      summary: buildMagicFormulaSummary({
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
      summary: ["Magic Formula explainability unavailable."],
      factors: [],
    };
  }
}

export function buildMagicFormulaSummary(input: {
  detection: MagicFormulaDetection;
  positiveReasons: string[];
  negativeReasons: string[];
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_MAGIC_FORMULA_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (
    d.ranking.percentileRank <= DEFAULT_MAGIC_FORMULA_CONFIG.topPercentileBuy
  ) {
    points.push(
      "Company ranks in the top percentile of the Magic Formula universe."
    );
  }
  if (
    d.earningsYield.earningsYield >=
    DEFAULT_MAGIC_FORMULA_CONFIG.minEarningsYieldWatch
  ) {
    points.push("High earnings yield indicates attractive valuation.");
  }
  if (d.roc.returnOnCapital >= DEFAULT_MAGIC_FORMULA_CONFIG.minRocWatch) {
    points.push(
      "Return on capital demonstrates efficient capital allocation."
    );
  }
  if (d.financial.positiveOcf) {
    points.push("Strong operating cash flow supports earnings quality.");
  }
  if (d.financial.healthyBalanceSheet) {
    points.push(
      "Financial strength and governance satisfy institutional filters."
    );
  }
  if (input.negativeReasons.length > 0 && points.length < max) {
    points.push(input.negativeReasons[0]!);
  }
  return dedupe(points).slice(0, max);
}

export function createEmptyMagicFormulaExplainability(
  warnings: string[] = []
): MagicFormulaExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Magic Formula explainability not available."],
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
