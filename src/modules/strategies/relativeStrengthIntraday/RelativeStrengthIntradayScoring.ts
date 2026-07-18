/**
 * Relative Strength Intraday Institutional Scoring — Sprint 11B.3G.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./RelativeStrengthIntradayUtils";
import type {
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayStrategyInput,
} from "./RelativeStrengthIntradayTypes";
import type { RelativeStrengthIntradayTradeSetup } from "./RelativeStrengthIntradayTradeTypes";

export type RelativeStrengthIntradayConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type RelativeStrengthIntradaySignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface RelativeStrengthIntradayInstitutionalScore {
  conviction: number;
  grade: RelativeStrengthIntradayConvictionGrade;
  signalGrade: RelativeStrengthIntradaySignalGrade;
  confidence: number;
}

export interface RelativeStrengthIntradayConvictionWeights {
  readonly leadership: number;
  readonly market: number;
  readonly sector: number;
  readonly trend: number;
  readonly vwap: number;
  readonly volume: number;
  readonly breadth: number;
  readonly riskReward: number;
  readonly liquidity: number;
  readonly dataQuality: number;
}

export interface RelativeStrengthIntradayScoringConfig {
  readonly weights: RelativeStrengthIntradayConvictionWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly averageMin: number;
  readonly minimumRiskReward: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly missingFactorPenalty: number;
  readonly signalGrade: {
    readonly aPlusMin: number;
    readonly aMin: number;
    readonly bPlusMin: number;
    readonly bMin: number;
    readonly cMin: number;
    readonly dMin: number;
  };
  readonly signalBlend: {
    readonly conviction: number;
    readonly quality: number;
    readonly risk: number;
    readonly market: number;
  };
}

/** Sprint weights (sum 1.10) — normalized at scoring time. */
export const DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONVICTION_WEIGHTS: RelativeStrengthIntradayConvictionWeights =
  {
    leadership: 0.25,
    market: 0.15,
    sector: 0.15,
    trend: 0.1,
    vwap: 0.1,
    volume: 0.1,
    breadth: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
    dataQuality: 0.1,
  };

export const DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG: RelativeStrengthIntradayScoringConfig =
  {
    weights: DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONVICTION_WEIGHTS,
    exceptionalMin: 95,
    highMin: 85,
    goodMin: 70,
    averageMin: 55,
    minimumRiskReward: 2,
    scoreFloor: 0,
    scoreCeiling: 100,
    missingFactorPenalty: 12,
    signalGrade: {
      aPlusMin: 92,
      aMin: 85,
      bPlusMin: 78,
      bMin: 70,
      cMin: 60,
      dMin: 50,
    },
    signalBlend: {
      conviction: 0.4,
      quality: 0.3,
      risk: 0.15,
      market: 0.15,
    },
  };

export function resolveRelativeStrengthIntradayScoringConfig(
  partial?: Partial<RelativeStrengthIntradayScoringConfig> & {
    weights?: Partial<RelativeStrengthIntradayConvictionWeights>;
    signalGrade?: Partial<
      RelativeStrengthIntradayScoringConfig["signalGrade"]
    >;
    signalBlend?: Partial<
      RelativeStrengthIntradayScoringConfig["signalBlend"]
    >;
  }
): RelativeStrengthIntradayScoringConfig {
  return {
    ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyRelativeStrengthIntradayConvictionGrade(
  conviction: number,
  config: RelativeStrengthIntradayScoringConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG
): RelativeStrengthIntradayConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyRelativeStrengthIntradaySignalGrade(
  composite: number,
  config: RelativeStrengthIntradayScoringConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG
): RelativeStrengthIntradaySignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface RelativeStrengthIntradayFactorScores {
  leadership: number;
  market: number;
  sector: number;
  trend: number;
  vwap: number;
  volume: number;
  breadth: number;
  riskReward: number;
  liquidity: number;
  dataQuality: number;
}

export function scoreRelativeStrengthIntradayConvictionFactors(input: {
  detection: RelativeStrengthIntradayDetection;
  setup: Pick<
    RelativeStrengthIntradayTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthIntradayStrategyInput;
  config?: RelativeStrengthIntradayScoringConfig;
}): RelativeStrengthIntradayFactorScores {
  const config = input.config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.rsInput.relativeStrengthIntraday;
  let dataQuality = 85;

  const leadership =
    d.detected && d.outperformsBenchmark && d.outperformsSector
      ? clamp(d.relativeStrengthScore, 40, 100)
      : 25;

  const trend = d.strongTrend ? clamp(d.confidence, 40, 100) : 25;
  const volume = d.volumeConfirmed ? 88 : 30;

  let vwap = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    if (d.direction === "BUY" && input.setup.entry >= d.vwap) vwap = 85;
    else if (d.direction === "SELL" && input.setup.entry <= d.vwap) vwap = 85;
    else if (d.direction === "BUY" || d.direction === "SELL") vwap = 35;
  }

  const breadth = d.breadthConfirmed
    ? clamp(ctx.marketBreadth.score, 0, 100)
    : 25;
  const sector = d.sectorConfirmed
    ? clamp(averageSectorScore(ctx), 0, 100)
    : 25;
  const market = d.marketConfirmed
    ? clamp(ctx.confidence, 0, 100)
    : 25;

  const riskReward =
    input.setup.entry > 0
      ? clamp(
          (input.setup.riskReward / Math.max(config.minimumRiskReward, 0.1)) *
            70,
          0,
          100
        )
      : 15;

  const liquidity =
    payload.relativeVolume === null ||
    !Number.isFinite(payload.relativeVolume) ||
    payload.relativeVolume >= 1
      ? 80
      : 35;

  if (payload.stockRelativeStrength === null) {
    dataQuality -= config.missingFactorPenalty * 0.4;
  }
  if (payload.sectorRelativeStrength === null) {
    dataQuality -= config.missingFactorPenalty * 0.3;
  }
  if (payload.benchmarkRelativeStrength === null) {
    dataQuality -= config.missingFactorPenalty * 0.3;
  }
  if (payload.atr === null) {
    dataQuality -= config.missingFactorPenalty * 0.2;
  }
  if (ctx.warnings.length > 0) {
    dataQuality -= Math.min(ctx.warnings.length * 4, 20);
  }
  dataQuality = clamp(dataQuality, 0, 100);

  return {
    leadership,
    market,
    sector,
    trend,
    vwap,
    volume,
    breadth,
    riskReward,
    liquidity,
    dataQuality,
  };
}

function weightSum(
  weights: RelativeStrengthIntradayConvictionWeights
): number {
  return (
    weights.leadership +
    weights.market +
    weights.sector +
    weights.trend +
    weights.vwap +
    weights.volume +
    weights.breadth +
    weights.riskReward +
    weights.liquidity +
    weights.dataQuality
  );
}

export function calculateRelativeStrengthIntradayConviction(
  factors: RelativeStrengthIntradayFactorScores,
  config: RelativeStrengthIntradayScoringConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.leadership * w.leadership +
      factors.market * w.market +
      factors.sector * w.sector +
      factors.trend * w.trend +
      factors.vwap * w.vwap +
      factors.volume * w.volume +
      factors.breadth * w.breadth +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity +
      factors.dataQuality * w.dataQuality) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateRelativeStrengthIntradaySignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: RelativeStrengthIntradayScoringConfig;
}): RelativeStrengthIntradaySignalGrade {
  const config = input.config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG;
  const blend = config.signalBlend;
  const riskComponent = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 75,
    0,
    100
  );
  const composite = clamp(
    round(
      input.conviction * blend.conviction +
        input.qualityScore * blend.quality +
        riskComponent * blend.risk +
        clamp(input.marketStrength, 0, 100) * blend.market,
      1
    ),
    0,
    100
  );
  return classifyRelativeStrengthIntradaySignalGrade(composite, config);
}

export function buildRelativeStrengthIntradayInstitutionalScore(input: {
  detection: RelativeStrengthIntradayDetection;
  setup: Pick<
    RelativeStrengthIntradayTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthIntradayStrategyInput;
  config?: RelativeStrengthIntradayScoringConfig;
}): RelativeStrengthIntradayInstitutionalScore {
  try {
    const config = resolveRelativeStrengthIntradayScoringConfig(input.config);
    const factors = scoreRelativeStrengthIntradayConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateRelativeStrengthIntradayConviction(
      factors,
      config
    );

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifyRelativeStrengthIntradayConvictionGrade(
        conviction,
        config
      ),
      signalGrade: calculateRelativeStrengthIntradaySignalGrade({
        conviction,
        qualityScore: input.setup.qualityScore,
        riskReward: input.setup.riskReward,
        marketStrength: input.marketContext.marketStrength,
        config,
      }),
      confidence: clamp(round(input.detection.confidence, 1), 0, 100),
    };
  } catch {
    return {
      conviction: 20,
      grade: "Weak",
      signalGrade: "F",
      confidence: clamp(input.detection.confidence || 0, 0, 100),
    };
  }
}
