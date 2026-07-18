/**
 * ORB Explainability — Sprint 11B.3B.3.
 * Institutional reasons, factors, and summary bullets. Never throws.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./ORBUtils";
import type { ORBDetection, ORBStrategyInput } from "./ORBTypes";
import type { ORBTradeSetup } from "./ORBTradeTypes";
import type { ORBFactorScores, ORBInstitutionalScore } from "./ORBScoring";
import {
  DEFAULT_ORB_SCORING_CONFIG,
  scoreORBConvictionFactors,
  type ORBScoringConfig,
} from "./ORBScoring";

export type ORBExplanationImpact = "Positive" | "Negative" | "Neutral";

export interface ORBExplanationFactor {
  title: string;
  description: string;
  impact: ORBExplanationImpact;
  contribution: number;
}

export interface ORBExplainability {
  positiveReasons: string[];
  negativeReasons: string[];
  neutralFactors: string[];
  warnings: string[];
  summary: string[];
  factors: ORBExplanationFactor[];
}

export const DEFAULT_ORB_EXPLAINABILITY_CONFIG = {
  summaryMaxPoints: 5,
  positiveContributionMin: 8,
  negativeContributionMax: -8,
} as const;

export type ORBExplainabilityConfig = {
  readonly summaryMaxPoints: number;
  readonly positiveContributionMin: number;
  readonly negativeContributionMax: number;
};

export function resolveORBExplainabilityConfig(
  partial?: Partial<ORBExplainabilityConfig>
): ORBExplainabilityConfig {
  return {
    ...DEFAULT_ORB_EXPLAINABILITY_CONFIG,
    ...partial,
  };
}

function impactFromContribution(
  contribution: number,
  config: ORBExplainabilityConfig
): ORBExplanationImpact {
  if (contribution >= config.positiveContributionMin) return "Positive";
  if (contribution <= config.negativeContributionMax) return "Negative";
  return "Neutral";
}

function signedContribution(score: number, weight: number): number {
  return round((score - 50) * weight, 1);
}

export function buildORBExplanationFactors(input: {
  detection: ORBDetection;
  setup: ORBTradeSetup;
  marketContext: InstitutionalMarketContext;
  orbInput: ORBStrategyInput;
  factors?: ORBFactorScores;
  scoringConfig?: ORBScoringConfig;
  explainConfig?: ORBExplainabilityConfig;
}): ORBExplanationFactor[] {
  const scoring = input.scoringConfig ?? DEFAULT_ORB_SCORING_CONFIG;
  const explain = resolveORBExplainabilityConfig(input.explainConfig);
  const w = scoring.weights;
  const scores =
    input.factors ??
    scoreORBConvictionFactors({
      detection: input.detection,
      setup: input.setup,
      marketContext: input.marketContext,
      orbInput: input.orbInput,
      config: scoring,
    });
  const d = input.detection;
  const direction = d.direction === "SELL" ? "bearish" : "bullish";

  const catalog: Array<{
    title: string;
    description: string;
    score: number;
    weight: number;
  }> = [
    {
      title: "Breakout Quality",
      description: d.detected
        ? `Opening range breakout confirmed with ${direction} close beyond the range.`
        : "No validated opening range breakout.",
      score: scores.breakoutQuality,
      weight: w.breakoutQuality,
    },
    {
      title: "Volume Quality",
      description: d.volumeConfirmed
        ? "Relative volume significantly above average."
        : "Volume confirmation weak or missing.",
      score: scores.volumeQuality,
      weight: w.volumeQuality,
    },
    {
      title: "Market Regime",
      description: d.marketConfirmed
        ? "Market regime compatible with ORB continuation."
        : "Market regime or risk posture unfavourable.",
      score: scores.marketRegime,
      weight: w.marketRegime,
    },
    {
      title: "Market Breadth",
      description: d.breadthConfirmed
        ? "Market breadth supports continuation."
        : "Market breadth does not support the breakout direction.",
      score: scores.marketBreadth,
      weight: w.marketBreadth,
    },
    {
      title: "Sector Strength",
      description: d.sectorConfirmed
        ? `Sector leadership aligned (avg ${round(averageSectorScore(input.marketContext), 0)}).`
        : "Sector participation weak.",
      score: scores.sectorStrength,
      weight: w.sectorStrength,
    },
    {
      title: "Risk/Reward",
      description:
        input.setup.riskReward >= scoring.minimumRiskReward
          ? "Risk/Reward exceeds institutional minimum."
          : "Risk/Reward below institutional threshold.",
      score: scores.riskReward,
      weight: w.riskReward,
    },
    {
      title: "Liquidity",
      description: d.liquidityConfirmed
        ? "Liquidity acceptable for intraday ORB execution."
        : "Liquidity conditions suboptimal.",
      score: scores.liquidity,
      weight: w.liquidity,
    },
    {
      title: "VWAP Alignment",
      description:
        input.orbInput.orb.vwap === null
          ? "VWAP unavailable — alignment scored neutrally."
          : d.direction === "BUY" && input.setup.entry >= input.orbInput.orb.vwap
            ? "Price holds above VWAP — bullish alignment."
            : d.direction === "SELL" &&
                input.setup.entry <= (input.orbInput.orb.vwap ?? 0)
              ? "Price holds below VWAP — bearish alignment."
              : "Breakout occurred near resistance / opposite VWAP side.",
      score: scores.vwapAlignment,
      weight: w.vwapAlignment,
    },
    {
      title: "ATR Quality",
      description:
        input.orbInput.orb.atr === null
          ? "ATR unavailable — stop/target quality reduced."
          : "ATR supports institutional stop and target spacing.",
      score: scores.atrQuality,
      weight: w.atrQuality,
    },
    {
      title: "Data Quality",
      description:
        input.marketContext.warnings.length === 0
          ? "Market data quality adequate for ORB decisioning."
          : "Data quality warnings present in institutional context.",
      score: scores.dataQuality,
      weight: w.dataQuality,
    },
  ];

  // Optional India VIX / volatility narrative
  const vix = input.marketContext.volatility?.indiaVix;
  if (Number.isFinite(vix) && (vix as number) >= 20) {
    catalog.push({
      title: "India VIX",
      description: "India VIX elevated.",
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

export function buildORBExplainability(input: {
  detection: ORBDetection;
  setup: ORBTradeSetup;
  marketContext: InstitutionalMarketContext;
  orbInput: ORBStrategyInput;
  institutionalScore?: ORBInstitutionalScore;
  scoringConfig?: ORBScoringConfig;
  explainConfig?: Partial<ORBExplainabilityConfig>;
}): ORBExplainability {
  try {
    const explain = resolveORBExplainabilityConfig(input.explainConfig);
    const factors = buildORBExplanationFactors({
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

    const summary = buildORBSummary({
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
      summary: ["ORB explainability unavailable."],
      factors: [],
    };
  }
}

export function buildORBSummary(input: {
  detection: ORBDetection;
  setup: ORBTradeSetup;
  positiveReasons: string[];
  negativeReasons: string[];
  institutionalScore?: ORBInstitutionalScore;
  maxPoints?: number;
}): string[] {
  const max = input.maxPoints ?? DEFAULT_ORB_EXPLAINABILITY_CONFIG.summaryMaxPoints;
  const points: string[] = [];
  const d = input.detection;

  if (d.detected && d.direction === "BUY") {
    points.push("Strong bullish ORB confirmed.");
  } else if (d.detected && d.direction === "SELL") {
    points.push("Strong bearish ORB confirmed.");
  } else {
    points.push("ORB setup not confirmed.");
  }

  if (d.volumeConfirmed) {
    points.push("Volume expansion validates breakout.");
  }
  if (d.breadthConfirmed) {
    points.push("Broad market participation supports continuation.");
  }
  if (input.setup.riskReward >= DEFAULT_ORB_SCORING_CONFIG.minimumRiskReward) {
    points.push("Risk/Reward exceeds institutional threshold.");
  }
  if (input.setup.entry > 0) {
    points.push(
      `Trade suitable for ${input.setup.positionType.toLowerCase()} momentum.`
    );
  }
  if (
    input.institutionalScore &&
    input.institutionalScore.conviction >= DEFAULT_ORB_SCORING_CONFIG.highMin
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

export function createEmptyORBExplainability(
  warnings: string[] = []
): ORBExplainability {
  return {
    positiveReasons: [],
    negativeReasons: [],
    neutralFactors: [],
    warnings,
    summary: ["ORB explainability not available."],
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
