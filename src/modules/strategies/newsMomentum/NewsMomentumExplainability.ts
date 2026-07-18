/**
 * News Momentum Explainability — Sprint 11B.3K.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  NewsMomentumDetection,
  NewsMomentumStrategyInput,
} from "./NewsMomentumTypes";
import type { NewsMomentumTradeSetup } from "./NewsMomentumTradeTypes";
import type {
  NewsMomentumFactorScores,
  NewsMomentumInstitutionalScore,
} from "./NewsMomentumScoring";
import {
  DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG,
  scoreNewsMomentumConvictionFactors,
  type NewsMomentumScoringConfig,
} from "./NewsMomentumScoring";

export type NewsMomentumExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface NewsMomentumExplanationFactor {
  title: string;
  description: string;
  impact: NewsMomentumExplanationImpact;
  contribution: number;
}

export interface NewsMomentumExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: NewsMomentumExplanationFactor[];
}

export const DEFAULT_NEWS_MOMENTUM_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type NewsMomentumExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveNewsMomentumExplainabilityConfig(
  partial?: Partial<NewsMomentumExplainabilityConfig>
): NewsMomentumExplainabilityConfig {
  return {
    ...DEFAULT_NEWS_MOMENTUM_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: NewsMomentumExplainabilityConfig
): NewsMomentumExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildNewsMomentumExplanationFactors(input: {
  detection: NewsMomentumDetection;
  setup: NewsMomentumTradeSetup;
  marketContext: InstitutionalMarketContext;
  nmInput: NewsMomentumStrategyInput;
  factors?: NewsMomentumFactorScores;
  scoringConfig?: NewsMomentumScoringConfig;
  explainConfig?: NewsMomentumExplainabilityConfig;
}): NewsMomentumExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG;
  const explain = resolveNewsMomentumExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreNewsMomentumConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      nmInput: input.nmInput,
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
      title: "Catalyst Strength",
      description:
        d.catalystStrength >= 70
          ? "Strong earnings surprise confirmed."
          : "Catalyst strength insufficient for high conviction.",
      score: scores.catalystStrength,
      weight: w.catalystStrength,
    },
    {
      title: "Credibility",
      description:
        d.credibility >= 60
          ? "News source credibility supports the catalyst."
          : "Low credibility — news catalyst weak.",
      score: scores.credibility,
      weight: w.credibility,
    },
    {
      title: "Price Action",
      description: d.priceConfirmed
        ? "Price confirms news acceptance."
        : "Contradictory price — news not accepted by market.",
      score: scores.priceAction,
      weight: w.priceAction,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Institutional volume validates catalyst."
        : "Weak volume — institutional participation not confirmed.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "Sector",
      description: d.sectorConfirmed
        ? "Sector also strengthening."
        : "Weak sector — news momentum insufficient.",
      score: scores.sector,
      weight: w.sector,
    },
    {
      title: "Breadth",
      description: d.breadthConfirmed
        ? "Momentum supported by overall market."
        : "Weak breadth — market participation insufficient.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "VWAP Alignment",
      description:
        scores.vwapAlignment >= 60
          ? "Price aligned with VWAP for news momentum."
          : "VWAP alignment weak for news momentum.",
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
          ? "Liquidity acceptable for news momentum."
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

export function buildNewsMomentumExplainability(input: {
  detection: NewsMomentumDetection;
  setup: NewsMomentumTradeSetup;
  marketContext: InstitutionalMarketContext;
  nmInput: NewsMomentumStrategyInput;
  institutionalScore?: NewsMomentumInstitutionalScore;
  scoringConfig?: NewsMomentumScoringConfig;
  explainConfig?: Partial<NewsMomentumExplainabilityConfig>;
}): NewsMomentumExplainability {
  try {
    const explain = resolveNewsMomentumExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildNewsMomentumExplanationFactors({
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
      summary: buildNewsMomentumSummary({
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
      summary: ["News Momentum explainability unavailable."],
      factors: [],
    };
  }
}

export function buildNewsMomentumSummary(input: {
  detection: NewsMomentumDetection;
  setup: NewsMomentumTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: NewsMomentumInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_NEWS_MOMENTUM_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected) {
    if (d.catalystType === "earnings_beat") {
      points.push("Strong earnings surprise confirmed.");
    } else {
      points.push(`News catalyst ${d.catalystType} detected.`);
    }
  } else {
    points.push("News Momentum setup not confirmed.");
  }

  if (d.volumeConfirmed) {
    points.push("Institutional volume validates catalyst.");
  }
  if (d.priceConfirmed) {
    points.push("Price confirms news acceptance.");
  }
  if (d.sectorConfirmed) {
    points.push("Sector also strengthening.");
  }
  if (d.marketConfirmed) {
    points.push("Momentum supported by overall market.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG.highMin
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

export function createEmptyNewsMomentumExplainability(
  warnings: string[] = []
): NewsMomentumExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["News Momentum explainability not available."],
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
