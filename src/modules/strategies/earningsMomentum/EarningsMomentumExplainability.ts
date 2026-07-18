/**
 * Earnings Momentum Explainability — Sprint 11B.3T.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  EarningsMomentumDetection,
  EarningsMomentumStrategyInput,
} from "./EarningsMomentumTypes";
import type { EarningsMomentumTradeSetup } from "./EarningsMomentumTradeTypes";
import type {
  EarningsMomentumFactorScores,
  EarningsMomentumInstitutionalScore,
} from "./EarningsMomentumScoring";
import {
  DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG,
  scoreEarningsMomentumConvictionFactors,
  type EarningsMomentumScoringConfig,
} from "./EarningsMomentumScoring";

export type EarningsMomentumExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface EarningsMomentumExplanationFactor {
  title: string;
  description: string;
  impact: EarningsMomentumExplanationImpact;
  contribution: number;
}

export interface EarningsMomentumExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: EarningsMomentumExplanationFactor[];
}

export const DEFAULT_EARNINGS_MOMENTUM_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type EarningsMomentumExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveEarningsMomentumExplainabilityConfig(
  partial?: Partial<EarningsMomentumExplainabilityConfig>
): EarningsMomentumExplainabilityConfig {
  return {
    ...DEFAULT_EARNINGS_MOMENTUM_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: EarningsMomentumExplainabilityConfig
): EarningsMomentumExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildEarningsMomentumExplanationFactors(input: {
  detection: EarningsMomentumDetection;
  setup: EarningsMomentumTradeSetup;
  marketContext: InstitutionalMarketContext;
  emInput: EarningsMomentumStrategyInput;
  factors?: EarningsMomentumFactorScores;
  scoringConfig?: EarningsMomentumScoringConfig;
  explainConfig?: EarningsMomentumExplainabilityConfig;
}): EarningsMomentumExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG;
  const explain = resolveEarningsMomentumExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreEarningsMomentumConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      emInput: input.emInput,
      config: scoring,
    });
  const d = input.detection;
  const epsPct = round(Math.abs(d.epsSurprise) * 100, 1);

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "EPS Surprise",
      description:
        d.direction === "SELL"
          ? `EPS missed analyst estimates by ${epsPct}%.`
          : `EPS exceeded analyst estimates by ${epsPct}%.`,
      score: scores.epsSurprise,
      weight: w.epsSurprise,
    },
    {
      title: "Revenue Surprise",
      description:
        d.revenueSurprise >= 0
          ? "Revenue growth significantly outperformed expectations."
          : "Revenue missed expectations.",
      score: scores.revenueSurprise,
      weight: w.revenueSurprise,
    },
    {
      title: "Guidance",
      description: d.analysis.guidanceUpgrade
        ? "Management upgraded forward guidance."
        : d.analysis.guidanceDowngrade
          ? "Management downgraded forward guidance."
          : "Guidance remains inline.",
      score: scores.guidance,
      weight: w.guidance,
    },
    {
      title: "Institutional Buying",
      description: d.institutionalConfirmed
        ? "Institutional buying confirmed after earnings."
        : "Institutional participation unclear.",
      score: scores.institutionalBuying,
      weight: w.institutionalBuying,
    },
    {
      title: "Price Action",
      description: d.priceConfirmed
        ? "Price action confirms the earnings catalyst."
        : "Price confirmation weak.",
      score: scores.priceAction,
      weight: w.priceAction,
    },
    {
      title: "Volume Confirmation",
      description: d.volumeConfirmed
        ? "Volume confirms institutional interest."
        : "Weak volume.",
      score: scores.volumeConfirmation,
      weight: w.volumeConfirmation,
    },
    {
      title: "Relative Strength",
      description: d.rsConfirmed
        ? "Relative strength supports the earnings move."
        : "Relative strength insufficient.",
      score: scores.relativeStrength,
      weight: w.relativeStrength,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Sector and market conditions support continuation."
        : "Weak breadth.",
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

export function buildEarningsMomentumExplainability(input: {
  detection: EarningsMomentumDetection;
  setup: EarningsMomentumTradeSetup;
  marketContext: InstitutionalMarketContext;
  emInput: EarningsMomentumStrategyInput;
  institutionalScore?: EarningsMomentumInstitutionalScore;
  scoringConfig?: EarningsMomentumScoringConfig;
  explainConfig?: Partial<EarningsMomentumExplainabilityConfig>;
}): EarningsMomentumExplainability {
  try {
    const explain = resolveEarningsMomentumExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildEarningsMomentumExplanationFactors({
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
      summary: buildEarningsMomentumSummary({
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
      summary: ["Earnings Momentum explainability unavailable."],
      factors: [],
    };
  }
}

export function buildEarningsMomentumSummary(input: {
  detection: EarningsMomentumDetection;
  setup: EarningsMomentumTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: EarningsMomentumInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_EARNINGS_MOMENTUM_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;
  const epsPct = round(Math.abs(d.epsSurprise) * 100, 1);

  if (d.detected && d.direction === "BUY") {
    points.push(`EPS exceeded analyst estimates by ${epsPct}%.`);
  } else if (d.detected && d.direction === "SELL") {
    points.push(`EPS missed analyst estimates by ${epsPct}%.`);
  } else {
    points.push("Earnings Momentum setup not confirmed.");
  }
  if (d.revenueSurprise > 0) {
    points.push("Revenue growth significantly outperformed expectations.");
  }
  if (d.analysis.guidanceUpgrade) {
    points.push("Management upgraded forward guidance.");
  }
  if (d.institutionalConfirmed && d.direction === "BUY") {
    points.push("Institutional buying confirmed after earnings.");
  }
  if (d.sectorConfirmed && d.breadthConfirmed) {
    points.push("Sector and market conditions support continuation.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG.highMin
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

export function createEmptyEarningsMomentumExplainability(
  warnings: string[] = []
): EarningsMomentumExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Earnings Momentum explainability not available."],
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
