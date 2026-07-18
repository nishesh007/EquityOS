/**
 * Liquidity Sweep Explainability — Sprint 11B.3E.
 * Institutional reasons, factors, and summary bullets. Never throws.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./LiquiditySweepUtils";
import type {
  LiquiditySweepDetection,
  LiquiditySweepStrategyInput,
} from "./LiquiditySweepTypes";
import type { LiquiditySweepTradeSetup } from "./LiquiditySweepTradeTypes";
import type {
  LiquiditySweepFactorScores,
  LiquiditySweepInstitutionalScore,
} from "./LiquiditySweepScoring";
import {
  DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG,
  scoreLiquiditySweepConvictionFactors,
  type LiquiditySweepScoringConfig,
} from "./LiquiditySweepScoring";

export type LiquiditySweepExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface LiquiditySweepExplanationFactor {
  title: string;
  description: string;
  impact: LiquiditySweepExplanationImpact;
  contribution: number;
}

export interface LiquiditySweepExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: LiquiditySweepExplanationFactor[];
}

export const DEFAULT_LIQUIDITY_SWEEP_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type LiquiditySweepExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveLiquiditySweepExplainabilityConfig(
  partial?: Partial<LiquiditySweepExplainabilityConfig>
): LiquiditySweepExplainabilityConfig {
  return {
    ...DEFAULT_LIQUIDITY_SWEEP_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: LiquiditySweepExplainabilityConfig
): LiquiditySweepExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildLiquiditySweepExplanationFactors(input: {
  detection: LiquiditySweepDetection;
  setup: LiquiditySweepTradeSetup;
  marketContext: InstitutionalMarketContext;
  lsInput: LiquiditySweepStrategyInput;
  factors?: LiquiditySweepFactorScores;
  scoringConfig?: LiquiditySweepScoringConfig;
  explainConfig?: LiquiditySweepExplainabilityConfig;
}): LiquiditySweepExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG;
  const explain = resolveLiquiditySweepExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreLiquiditySweepConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      lsInput: input.lsInput,
      config: scoring,
    });
  const d = input.detection;
  const payload = input.lsInput.liquiditySweep;

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "Liquidity Grab",
      description: d.detected
        ? d.direction === "BUY"
          ? "Liquidity below swing low successfully swept."
          : "Liquidity above swing high successfully swept."
        : "No confirmed liquidity grab.",
      score: scores.liquidityGrab,
      weight: w.liquidityGrab,
    },
    {
      title: "Volume Spike",
      description: d.volumeSpike
        ? "Volume spike indicates institutional participation."
        : "Weak Volume — no clear institutional spike.",
      score: scores.volumeSpike,
      weight: w.volumeSpike,
    },
    {
      title: "Structure Quality",
      description: d.reversalConfirmed
        ? "Strong rejection confirms stop hunt."
        : "Weak reversal — structure reclaim not confirmed.",
      score: scores.structureQuality,
      weight: w.structureQuality,
    },
    {
      title: "Market Context",
      description: d.marketConfirmed
        ? "Trade aligns with current market regime."
        : "Market regime incompatible with liquidity sweep.",
      score: scores.marketContext,
      weight: w.marketContext,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Breadth supports reversal."
        : "Breadth does not support reversal.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? `Sector participation adequate (avg ${round(averageSectorScore(input.marketContext), 0)}).`
        : "Sector participation weak.",
      score: scores.sector,
      weight: w.sector,
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
      title: "ATR Environment",
      description:
        payload.atr === null
          ? "ATR unavailable — environment quality reduced."
          : "ATR environment supports stop and target spacing.",
      score: scores.atr,
      weight: w.atr,
    },
    {
      title: "Liquidity",
      description:
        scores.liquidity >= 60
          ? "Liquidity adequate for sweep execution quality."
          : "Low liquidity.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
    {
      title: "Data Quality",
      description:
        input.marketContext.warnings.length === 0
          ? "Market data quality adequate for decisioning."
          : "Data quality warnings present in institutional context.",
      score: scores.dataQuality,
      weight: w.dataQuality,
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

export function buildLiquiditySweepExplainability(input: {
  detection: LiquiditySweepDetection;
  setup: LiquiditySweepTradeSetup;
  marketContext: InstitutionalMarketContext;
  lsInput: LiquiditySweepStrategyInput;
  institutionalScore?: LiquiditySweepInstitutionalScore;
  scoringConfig?: LiquiditySweepScoringConfig;
  explainConfig?: Partial<LiquiditySweepExplainabilityConfig>;
}): LiquiditySweepExplainability {
  try {
    const explain = resolveLiquiditySweepExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildLiquiditySweepExplanationFactors({
      ...input,
      explainConfig: explain,
      scoringConfig: input.scoringConfig,
    });

    const positiveReasons: string[] = [];
    const negativeReasons: string[] = [];
    const neutralFactors: string[] = [];

    for (const factor of factors) {
      const line = factor.description;
      if (factor.impact === "Positive") positiveReasons.push(line);
      else if (factor.impact === "Negative") negativeReasons.push(line);
      else neutralFactors.push(line);
    }

    const warnings = dedupe([
      ...input.setup.warnings,
      ...input.detection.warnings,
      ...input.marketContext.warnings,
    ]);

    const summary = buildLiquiditySweepSummary({
      detection: input.detection,
      setup: input.setup,
      positiveReasons,
      negativeReasons,
      institutionalScore: input.institutionalScore,
      maxPoints: explain.summaryMaxPoints,
    });

    return {
      positiveReasons: dedupe(positiveReasons),
      negativeReasons: dedupe(negativeReasons),
      neutralFactors: dedupe(neutralFactors),
      warnings,
      summary,
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
      summary: ["Liquidity Sweep explainability unavailable."],
      factors: [],
    };
  }
}

export function buildLiquiditySweepSummary(input: {
  detection: LiquiditySweepDetection;
  setup: LiquiditySweepTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: LiquiditySweepInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_LIQUIDITY_SWEEP_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected) {
    points.push(
      d.direction === "BUY"
        ? "Liquidity below swing low successfully swept."
        : "Liquidity above swing high successfully swept."
    );
  } else {
    points.push("Liquidity Sweep setup not confirmed.");
  }

  if (d.reversalConfirmed) {
    points.push("Strong rejection confirms stop hunt.");
  }
  if (d.volumeSpike) {
    points.push("Volume spike indicates institutional participation.");
  }
  if (input.setup.riskReward >= 2) {
    points.push("Risk/Reward exceeds institutional threshold.");
  }
  if (d.marketConfirmed) {
    points.push("Trade aligns with current market regime.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG.highMin
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

export function createEmptyLiquiditySweepExplainability(
  warnings: string[] = []
): LiquiditySweepExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["Liquidity Sweep explainability not available."],
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
