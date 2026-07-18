/**
 * VWAP Continuation Explainability — Sprint 11B.3C.3.
 * Institutional reasons, factors, and summary bullets. Never throws.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./VWAPContinuationUtils";
import type {
  VWAPContinuationDetection,
  VWAPContinuationStrategyInput,
} from "./VWAPContinuationTypes";
import type { VWAPContinuationTradeSetup } from "./VWAPContinuationTradeTypes";
import type {
  VWAPContinuationFactorScores,
  VWAPContinuationInstitutionalScore,
} from "./VWAPContinuationScoring";
import {
  DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG,
  scoreVWAPContinuationConvictionFactors,
  type VWAPContinuationScoringConfig,
} from "./VWAPContinuationScoring";

export type VWAPContinuationExplanationImpact =
  | "Positive"
  | "Negative"
  | "Neutral";

export interface VWAPContinuationExplanationFactor {
  title: string;
  description: string;
  impact: VWAPContinuationExplanationImpact;
  contribution: number;
}

export interface VWAPContinuationExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: VWAPContinuationExplanationFactor[];
}

export const DEFAULT_VWAP_CONTINUATION_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 8,
  negativeContributionMax: -8,
} as const;

export type VWAPContinuationExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveVWAPContinuationExplainabilityConfig(
  partial?: Partial<VWAPContinuationExplainabilityConfig>
): VWAPContinuationExplainabilityConfig {
  return {
    ...DEFAULT_VWAP_CONTINUATION_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: VWAPContinuationExplainabilityConfig
): VWAPContinuationExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildVWAPContinuationExplanationFactors(input: {
  detection: VWAPContinuationDetection;
  setup: VWAPContinuationTradeSetup;
  marketContext: InstitutionalMarketContext;
  vwapInput: VWAPContinuationStrategyInput;
  factors?: VWAPContinuationFactorScores;
  scoringConfig?: VWAPContinuationScoringConfig;
  explainConfig?: VWAPContinuationExplainabilityConfig;
}): VWAPContinuationExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG;
  const explain = resolveVWAPContinuationExplainabilityConfig(
    input.explainConfig
  );
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreVWAPContinuationConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      vwapInput: input.vwapInput,
      config: scoring,
    });
  const d = input.detection;
  const payload = input.vwapInput.vwapContinuation;
  const direction = d.direction === "SELL" ? "bearish" : "bullish";

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "VWAP Trend",
      description: d.detected
        ? d.direction === "BUY"
          ? "VWAP slope confirms trend."
          : "VWAP slope confirms bearish trend."
        : "VWAP flattening.",
      score: scores.vwapTrend,
      weight: w.vwapTrend,
    },
    {
      title: "Trend Structure",
      description:
        d.pullbackDetected && d.bounceConfirmed
          ? "Price respected VWAP support."
          : d.pullbackDetected
            ? "Pullback too deep."
            : "Healthy pullback not confirmed.",
      score: scores.trendStructure,
      weight: w.trendStructure,
    },
    {
      title: "Volume",
      description: d.volumeConfirmed
        ? "Relative volume confirms institutional activity."
        : "Low relative volume.",
      score: scores.volume,
      weight: w.volume,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Market regime remains supportive."
        : "Market regime incompatible with continuation.",
      score: scores.marketRegime,
      weight: w.marketRegime,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Broad market participation supports continuation."
        : "Weak breadth participation.",
      score: scores.breadth,
      weight: w.breadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? `Sector leadership aligned (avg ${round(averageSectorScore(input.marketContext), 0)}).`
        : "Weak sector participation.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
    },
    {
      title: "Risk/Reward",
      description:
        input.setup.riskReward >= scoring.minimumRiskReward
          ? "Trade meets institutional quality."
          : "Risk/Reward below institutional threshold.",
      score: scores.riskReward,
      weight: w.riskReward,
    },
    {
      title: "ATR Quality",
      description:
        payload.atr === null
          ? "ATR unavailable — stop/target quality reduced."
          : "ATR supports institutional stop and target spacing.",
      score: scores.atrQuality,
      weight: w.atrQuality,
    },
    {
      title: "Liquidity",
      description:
        scores.liquidity >= 60
          ? "Liquidity adequate for VWAP continuation."
          : "Poor liquidity / elevated volatility.",
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
    {
      title: "VWAP Respect",
      description:
        d.pullbackDetected && d.bounceConfirmed
          ? direction === "bullish"
            ? "Price respected VWAP support."
            : "Price respected VWAP resistance."
          : Math.abs(d.distanceFromVWAP) >
              scoring.deepPullbackDistancePct
            ? "Pullback too deep."
            : "VWAP respect incomplete.",
      score: scores.vwapRespect,
      weight: w.vwapRespect,
    },
  ];

  const vix = input.marketContext.volatility?.indiaVix;
  if (
    Number.isFinite(vix) &&
    (vix as number) >= scoring.elevatedVixThreshold
  ) {
    catalog.push({
      title: "India VIX",
      description: "Elevated India VIX.",
      score: 30,
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

export function buildVWAPContinuationExplainability(input: {
  detection: VWAPContinuationDetection;
  setup: VWAPContinuationTradeSetup;
  marketContext: InstitutionalMarketContext;
  vwapInput: VWAPContinuationStrategyInput;
  institutionalScore?: VWAPContinuationInstitutionalScore;
  scoringConfig?: VWAPContinuationScoringConfig;
  explainConfig?: Partial<VWAPContinuationExplainabilityConfig>;
}): VWAPContinuationExplainability {
  try {
    const explain = resolveVWAPContinuationExplainabilityConfig(
      input.explainConfig
    );
    const factors = buildVWAPContinuationExplanationFactors({
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

    const summary = buildVWAPContinuationSummary({
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
      summary: ["VWAP Continuation explainability unavailable."],
      factors: [],
    };
  }
}

export function buildVWAPContinuationSummary(input: {
  detection: VWAPContinuationDetection;
  setup: VWAPContinuationTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: VWAPContinuationInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max =
    input.maxPoints ??
    DEFAULT_VWAP_CONTINUATION_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected && d.direction === "BUY") {
    points.push("VWAP trend remains intact.");
  } else if (d.detected && d.direction === "SELL") {
    points.push("VWAP bearish trend remains intact.");
  } else {
    points.push("VWAP continuation setup not confirmed.");
  }

  if (d.pullbackDetected && d.bounceConfirmed) {
    points.push("Healthy pullback completed.");
  }
  if (d.volumeConfirmed) {
    points.push("Volume confirms continuation.");
  }
  if (d.marketConfirmed) {
    points.push("Market regime remains supportive.");
  }
  if (input.setup.entry > 0 && input.setup.riskReward >= 2) {
    points.push("Trade meets institutional quality.");
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >=
      DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG.highMin
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

export function createEmptyVWAPContinuationExplainability(
  warnings: string[] = []
): VWAPContinuationExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["VWAP Continuation explainability not available."],
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
