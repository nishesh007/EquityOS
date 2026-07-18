/**
 * VWAP Mean Reversion Explainability — Sprint 11B.3D.3.
 * Institutional reasons, factors, and summary bullets. Never throws.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./VWAPMeanReversionUtils";
import type {
  VWAPMeanReversionDetection,
  VWAPMeanReversionStrategyInput,
} from "./VWAPMeanReversionTypes";
import type { VWAPMeanReversionTradeSetup } from "./VWAPMeanReversionTradeTypes";
import type {
  VWAPMeanReversionFactorScores,
  VWAPMeanReversionInstitutionalScore,
} from "./VWAPMeanReversionScoring";
import {
  DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG,
  scoreVWAPMeanReversionConvictionFactors,
  type VWAPMeanReversionScoringConfig,
} from "./VWAPMeanReversionScoring";

export type VWAPMeanReversionExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface VWAPMeanReversionExplanationFactor {
  title: string;
  description: string;
  impact: VWAPMeanReversionExplanationImpact;
  contribution: number;
}

export interface VWAPMeanReversionExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: VWAPMeanReversionExplanationFactor[];
}

export const DEFAULT_VWAP_MEAN_REVERSION_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 4,
  negativeContributionMax: -4,
} as const;

export type VWAPMeanReversionExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveVWAPMeanReversionExplainabilityConfig(
  partial?: Partial<VWAPMeanReversionExplainabilityConfig>
): VWAPMeanReversionExplainabilityConfig {
  return {
    ...DEFAULT_VWAP_MEAN_REVERSION_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: VWAPMeanReversionExplainabilityConfig
): VWAPMeanReversionExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildVWAPMeanReversionExplanationFactors(input: {
  detection: VWAPMeanReversionDetection;
  setup: VWAPMeanReversionTradeSetup;
  marketContext: InstitutionalMarketContext;
  mrInput: VWAPMeanReversionStrategyInput;
  factors?: VWAPMeanReversionFactorScores;
  scoringConfig?: VWAPMeanReversionScoringConfig;
  explainConfig?: VWAPMeanReversionExplainabilityConfig;
}): VWAPMeanReversionExplanationFactor[] {
  const scoring =
    input.scoringConfig ?? DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG;
  const explain = resolveVWAPMeanReversionExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreVWAPMeanReversionConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      mrInput: input.mrInput,
      config: scoring,
    });
  const d = input.detection;
  const payload = input.mrInput.vwapMeanReversion;

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "VWAP Deviation",
      description: d.detected
        ? "Price extended significantly beyond VWAP."
        : "Price not statistically extended from VWAP.",
      score: scores.vwapDeviation,
      weight: w.vwapDeviation,
    },
    {
      title: "Reversal Strength",
      description: d.reversalConfirmed
        ? "Reversal candle confirms exhaustion."
        : "Trend remains exceptionally strong.",
      score: scores.reversalStrength,
      weight: w.reversalStrength,
    },
    {
      title: "Volume Stability",
      description: d.volumeStable
        ? "Volume stabilized during reversal."
        : "Low liquidity.",
      score: scores.volumeStability,
      weight: w.volumeStability,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Market environment supports reversion."
        : "Market regime incompatible with mean reversion.",
      score: scores.marketRegime,
      weight: w.marketRegime,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Market breadth supports recovery."
        : "Breadth does not support reversion.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? `Sector participation adequate (avg ${round(averageSectorScore(input.marketContext), 0)}).`
        : "Sector participation weak.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
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
      score: scores.atrEnvironment,
      weight: w.atrEnvironment,
    },
    {
      title: "Liquidity",
      description:
        scores.liquidity >= 60
          ? "Liquidity adequate for mean reversion."
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

  if (
    d.rsi > 0 &&
    ((d.direction === "BUY" && d.rsi <= 35) ||
      (d.direction === "SELL" && d.rsi >= 65))
  ) {
    catalog.push({
      title: "RSI",
      description:
        d.direction === "BUY"
          ? "RSI exited oversold region."
          : "RSI exited overbought region.",
      score: 80,
      weight: 0.05,
    });
  }

  const vix = input.marketContext.volatility?.indiaVix;
  if (
    Number.isFinite(vix) &&
    (vix as number) >= scoring.elevatedVixThreshold
  ) {
    catalog.push({
      title: "India VIX",
      description: "India VIX elevated.",
      score: 30,
      weight: 0.05,
    });
  }

  if (
    input.setup.entry > 0 &&
    d.direction === "BUY" &&
    input.setup.finalTarget > 0 &&
    Math.abs(input.setup.finalTarget - input.setup.entry) /
      input.setup.entry <
      0.005
  ) {
    catalog.push({
      title: "Resistance Proximity",
      description: "Recovery occurring near resistance.",
      score: 35,
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

export function buildVWAPMeanReversionExplainability(input: {
  detection: VWAPMeanReversionDetection;
  setup: VWAPMeanReversionTradeSetup;
  marketContext: InstitutionalMarketContext;
  mrInput: VWAPMeanReversionStrategyInput;
  institutionalScore?: VWAPMeanReversionInstitutionalScore;
  scoringConfig?: VWAPMeanReversionScoringConfig;
  explainConfig?: Partial<VWAPMeanReversionExplainabilityConfig>;
}): VWAPMeanReversionExplainability {
  try {
    const explain = resolveVWAPMeanReversionExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildVWAPMeanReversionExplanationFactors({
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

    const summary = buildVWAPMeanReversionSummary({
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
      summary: ["VWAP Mean Reversion explainability unavailable."],
      factors: [],
    };
  }
}

export function buildVWAPMeanReversionSummary(input: {
  detection: VWAPMeanReversionDetection;
  setup: VWAPMeanReversionTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: VWAPMeanReversionInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_VWAP_MEAN_REVERSION_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected) {
    points.push("Price reached statistically significant deviation.");
  } else {
    points.push("VWAP mean reversion setup not confirmed.");
  }

  if (d.reversalConfirmed) {
    points.push("Exhaustion pattern confirmed.");
  }
  if (input.setup.entry > 0) {
    points.push("VWAP offers high-probability mean target.");
  }
  if (input.setup.riskReward >= 2) {
    points.push("Risk/Reward exceeds institutional threshold.");
  }
  if (d.marketConfirmed) {
    points.push("Market environment supports reversion.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG.highMin
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

export function createEmptyVWAPMeanReversionExplainability(
  warnings: string[] = []
): VWAPMeanReversionExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["VWAP Mean Reversion explainability not available."],
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
