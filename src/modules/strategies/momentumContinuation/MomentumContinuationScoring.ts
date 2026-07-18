/**
 * Momentum Continuation Institutional Scoring — Sprint 11B.3F.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./MomentumContinuationUtils";
import type {
  MomentumContinuationDetection,
  MomentumContinuationStrategyInput,
} from "./MomentumContinuationTypes";
import type { MomentumContinuationTradeSetup } from "./MomentumContinuationTradeTypes";

export type MomentumContinuationConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type MomentumContinuationSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface MomentumContinuationInstitutionalScore {
  conviction: number;
  grade: MomentumContinuationConvictionGrade;
  signalGrade: MomentumContinuationSignalGrade;
  confidence: number;
}

export interface MomentumContinuationConvictionWeights {
  readonly momentumStrength: number;
  readonly trendQuality: number;
  readonly volume: number;
  readonly adx: number;
  readonly vwapAlignment: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly riskReward: number;
  readonly liquidity: number;
  readonly dataQuality: number;
}

export interface MomentumContinuationScoringConfig {
  readonly weights: MomentumContinuationConvictionWeights;
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
export const DEFAULT_MOMENTUM_CONTINUATION_CONVICTION_WEIGHTS: MomentumContinuationConvictionWeights =
  {
    momentumStrength: 0.2,
    trendQuality: 0.15,
    volume: 0.15,
    adx: 0.1,
    vwapAlignment: 0.1,
    breadth: 0.1,
    sectorStrength: 0.1,
    riskReward: 0.05,
    liquidity: 0.05,
    dataQuality: 0.1,
  };

export const DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG: MomentumContinuationScoringConfig =
  {
    weights: DEFAULT_MOMENTUM_CONTINUATION_CONVICTION_WEIGHTS,
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

export function resolveMomentumContinuationScoringConfig(
  partial?: Partial<MomentumContinuationScoringConfig> & {
    weights?: Partial<MomentumContinuationConvictionWeights>;
    signalGrade?: Partial<MomentumContinuationScoringConfig["signalGrade"]>;
    signalBlend?: Partial<MomentumContinuationScoringConfig["signalBlend"]>;
  }
): MomentumContinuationScoringConfig {
  return {
    ...DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyMomentumContinuationConvictionGrade(
  conviction: number,
  config: MomentumContinuationScoringConfig = DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG
): MomentumContinuationConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyMomentumContinuationSignalGrade(
  composite: number,
  config: MomentumContinuationScoringConfig = DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG
): MomentumContinuationSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface MomentumContinuationFactorScores {
  momentumStrength: number;
  trendQuality: number;
  volume: number;
  adx: number;
  vwapAlignment: number;
  breadth: number;
  sectorStrength: number;
  riskReward: number;
  liquidity: number;
  dataQuality: number;
}

export function scoreMomentumContinuationConvictionFactors(input: {
  detection: MomentumContinuationDetection;
  setup: Pick<
    MomentumContinuationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  mcInput: MomentumContinuationStrategyInput;
  config?: MomentumContinuationScoringConfig;
}): MomentumContinuationFactorScores {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.mcInput.momentumContinuation;
  let dataQuality = 85;

  const momentumStrength = d.momentumResumption
    ? clamp(d.confidence, 40, 100)
    : 25;
  const trendQuality = d.strongTrend ? clamp(d.trendStrength, 0, 100) : 25;
  const volume = d.volumeConfirmed ? 88 : 30;
  const adx = d.adx > 0 ? clamp(50 + (d.adx - 20) * 2, 0, 100) : 30;

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    if (d.direction === "BUY" && input.setup.entry >= d.vwap) vwapAlignment = 85;
    else if (d.direction === "SELL" && input.setup.entry <= d.vwap)
      vwapAlignment = 85;
    else if (d.direction === "BUY" || d.direction === "SELL") vwapAlignment = 35;
  }

  const breadth = d.breadthConfirmed
    ? clamp(ctx.marketBreadth.score, 0, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(ctx), 0, 100)
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

  if (payload.relativeVolume === null) {
    dataQuality -= config.missingFactorPenalty * 0.4;
  }
  if (payload.adx === null || payload.adx === undefined) {
    dataQuality -= config.missingFactorPenalty * 0.4;
  }
  if (payload.atr === null) {
    dataQuality -= config.missingFactorPenalty * 0.3;
  }
  if (ctx.warnings.length > 0) {
    dataQuality -= Math.min(ctx.warnings.length * 4, 20);
  }
  dataQuality = clamp(dataQuality, 0, 100);

  return {
    momentumStrength,
    trendQuality,
    volume,
    adx,
    vwapAlignment,
    breadth,
    sectorStrength,
    riskReward,
    liquidity,
    dataQuality,
  };
}

function weightSum(weights: MomentumContinuationConvictionWeights): number {
  return (
    weights.momentumStrength +
    weights.trendQuality +
    weights.volume +
    weights.adx +
    weights.vwapAlignment +
    weights.breadth +
    weights.sectorStrength +
    weights.riskReward +
    weights.liquidity +
    weights.dataQuality
  );
}

export function calculateMomentumContinuationConviction(
  factors: MomentumContinuationFactorScores,
  config: MomentumContinuationScoringConfig = DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.momentumStrength * w.momentumStrength +
      factors.trendQuality * w.trendQuality +
      factors.volume * w.volume +
      factors.adx * w.adx +
      factors.vwapAlignment * w.vwapAlignment +
      factors.breadth * w.breadth +
      factors.sectorStrength * w.sectorStrength +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity +
      factors.dataQuality * w.dataQuality) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateMomentumContinuationSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: MomentumContinuationScoringConfig;
}): MomentumContinuationSignalGrade {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG;
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
  return classifyMomentumContinuationSignalGrade(composite, config);
}

export function buildMomentumContinuationInstitutionalScore(input: {
  detection: MomentumContinuationDetection;
  setup: Pick<
    MomentumContinuationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  mcInput: MomentumContinuationStrategyInput;
  config?: MomentumContinuationScoringConfig;
}): MomentumContinuationInstitutionalScore {
  try {
    const config = resolveMomentumContinuationScoringConfig(input.config);
    const factors = scoreMomentumContinuationConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateMomentumContinuationConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifyMomentumContinuationConvictionGrade(conviction, config),
      signalGrade: calculateMomentumContinuationSignalGrade({
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
