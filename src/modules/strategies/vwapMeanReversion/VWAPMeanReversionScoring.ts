/**
 * VWAP Mean Reversion Institutional Scoring — Sprint 11B.3D.3.
 * Conviction (0–100) and signal letter grades. Config-driven weights only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./VWAPMeanReversionUtils";
import type {
  VWAPMeanReversionDetection,
  VWAPMeanReversionStrategyInput,
} from "./VWAPMeanReversionTypes";
import type { VWAPMeanReversionTradeSetup } from "./VWAPMeanReversionTradeTypes";

export type VWAPMeanReversionConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type VWAPMeanReversionSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface VWAPMeanReversionInstitutionalScore {
  conviction: number;
  grade: VWAPMeanReversionConvictionGrade;
  signalGrade: VWAPMeanReversionSignalGrade;
  confidence: number;
}

export interface VWAPMeanReversionConvictionWeights {
  readonly vwapDeviation: number;
  readonly reversalStrength: number;
  readonly volumeStability: number;
  readonly marketRegime: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly riskReward: number;
  readonly atrEnvironment: number;
  readonly liquidity: number;
  readonly dataQuality: number;
}

export interface VWAPMeanReversionScoringConfig {
  readonly weights: VWAPMeanReversionConvictionWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly averageMin: number;
  readonly minimumRiskReward: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly missingFactorPenalty: number;
  readonly elevatedVixThreshold: number;
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
export const DEFAULT_VWAP_MEAN_REVERSION_CONVICTION_WEIGHTS: VWAPMeanReversionConvictionWeights =
  {
    vwapDeviation: 0.2,
    reversalStrength: 0.2,
    volumeStability: 0.15,
    marketRegime: 0.1,
    breadth: 0.1,
    sectorStrength: 0.1,
    riskReward: 0.1,
    atrEnvironment: 0.05,
    liquidity: 0.05,
    dataQuality: 0.05,
  };

export const DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG: VWAPMeanReversionScoringConfig =
  {
    weights: DEFAULT_VWAP_MEAN_REVERSION_CONVICTION_WEIGHTS,
    exceptionalMin: 95,
    highMin: 85,
    goodMin: 70,
    averageMin: 55,
    minimumRiskReward: 2,
    scoreFloor: 0,
    scoreCeiling: 100,
    missingFactorPenalty: 12,
    elevatedVixThreshold: 20,
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

export function resolveVWAPMeanReversionScoringConfig(
  partial?: Partial<VWAPMeanReversionScoringConfig> & {
    weights?: Partial<VWAPMeanReversionConvictionWeights>;
    signalGrade?: Partial<VWAPMeanReversionScoringConfig["signalGrade"]>;
    signalBlend?: Partial<VWAPMeanReversionScoringConfig["signalBlend"]>;
  }
): VWAPMeanReversionScoringConfig {
  return {
    ...DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyVWAPMeanReversionConvictionGrade(
  conviction: number,
  config: VWAPMeanReversionScoringConfig = DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG
): VWAPMeanReversionConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyVWAPMeanReversionSignalGrade(
  composite: number,
  config: VWAPMeanReversionScoringConfig = DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG
): VWAPMeanReversionSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface VWAPMeanReversionFactorScores {
  vwapDeviation: number;
  reversalStrength: number;
  volumeStability: number;
  marketRegime: number;
  breadth: number;
  sectorStrength: number;
  riskReward: number;
  atrEnvironment: number;
  liquidity: number;
  dataQuality: number;
}

export function scoreVWAPMeanReversionConvictionFactors(input: {
  detection: VWAPMeanReversionDetection;
  setup: Pick<
    VWAPMeanReversionTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  mrInput: VWAPMeanReversionStrategyInput;
  config?: VWAPMeanReversionScoringConfig;
}): VWAPMeanReversionFactorScores {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.mrInput.vwapMeanReversion;
  let dataQuality = 85;

  const absDev = Math.abs(d.deviation);
  const vwapDeviation = d.detected
    ? clamp(((absDev - 1.5) / 1) * 40 + 55, 40, 100)
    : 20;

  const reversalStrength = d.reversalConfirmed
    ? clamp(d.confidence, 0, 100)
    : 30;

  const volumeStability = d.volumeStable ? 85 : 35;

  const marketRegime = d.marketConfirmed
    ? clamp(ctx.confidence, 0, 100)
    : 25;

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

  const volScore = ctx.volatility?.score ?? 50;
  const liquidity =
    volScore <= 55 &&
    (payload.relativeVolume === null ||
      !Number.isFinite(payload.relativeVolume) ||
      payload.relativeVolume >= 0.7)
      ? 80
      : 35;

  let atrEnvironment = 50;
  const atr = payload.atr ?? input.mrInput.atr ?? null;
  if (atr === null || !Number.isFinite(atr) || atr <= 0) {
    atrEnvironment = 35;
    dataQuality -= config.missingFactorPenalty * 0.5;
  } else if (input.setup.entry > 0) {
    const atrPct = atr / input.setup.entry;
    atrEnvironment = atrPct > 0.001 && atrPct < 0.04 ? 80 : 55;
  }

  if (payload.relativeVolume === null) {
    dataQuality -= config.missingFactorPenalty * 0.4;
  }
  if (!Number.isFinite(payload.vwap) || payload.vwap <= 0) {
    dataQuality -= config.missingFactorPenalty * 0.5;
  }
  if (ctx.warnings.length > 0) {
    dataQuality -= Math.min(ctx.warnings.length * 4, 20);
  }
  dataQuality = clamp(dataQuality, 0, 100);

  return {
    vwapDeviation,
    reversalStrength,
    volumeStability,
    marketRegime,
    breadth,
    sectorStrength,
    riskReward,
    atrEnvironment,
    liquidity,
    dataQuality,
  };
}

function weightSum(weights: VWAPMeanReversionConvictionWeights): number {
  return (
    weights.vwapDeviation +
    weights.reversalStrength +
    weights.volumeStability +
    weights.marketRegime +
    weights.breadth +
    weights.sectorStrength +
    weights.riskReward +
    weights.atrEnvironment +
    weights.liquidity +
    weights.dataQuality
  );
}

export function calculateVWAPMeanReversionConviction(
  factors: VWAPMeanReversionFactorScores,
  config: VWAPMeanReversionScoringConfig = DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.vwapDeviation * w.vwapDeviation +
      factors.reversalStrength * w.reversalStrength +
      factors.volumeStability * w.volumeStability +
      factors.marketRegime * w.marketRegime +
      factors.breadth * w.breadth +
      factors.sectorStrength * w.sectorStrength +
      factors.riskReward * w.riskReward +
      factors.atrEnvironment * w.atrEnvironment +
      factors.liquidity * w.liquidity +
      factors.dataQuality * w.dataQuality) /
    total;

  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateVWAPMeanReversionSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: VWAPMeanReversionScoringConfig;
}): VWAPMeanReversionSignalGrade {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_SCORING_CONFIG;
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
  return classifyVWAPMeanReversionSignalGrade(composite, config);
}

export function buildVWAPMeanReversionInstitutionalScore(input: {
  detection: VWAPMeanReversionDetection;
  setup: Pick<
    VWAPMeanReversionTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  mrInput: VWAPMeanReversionStrategyInput;
  config?: VWAPMeanReversionScoringConfig;
}): VWAPMeanReversionInstitutionalScore {
  try {
    const config = resolveVWAPMeanReversionScoringConfig(input.config);
    const factors = scoreVWAPMeanReversionConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateVWAPMeanReversionConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    const grade = classifyVWAPMeanReversionConvictionGrade(conviction, config);
    const signalGrade = calculateVWAPMeanReversionSignalGrade({
      conviction,
      qualityScore: input.setup.qualityScore,
      riskReward: input.setup.riskReward,
      marketStrength: input.marketContext.marketStrength,
      config,
    });
    return {
      conviction,
      grade,
      signalGrade,
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
