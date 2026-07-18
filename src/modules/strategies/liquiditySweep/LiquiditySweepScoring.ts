/**
 * Liquidity Sweep Institutional Scoring — Sprint 11B.3E.
 * Conviction (0–100) and signal letter grades. Config-driven weights only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./LiquiditySweepUtils";
import type {
  LiquiditySweepDetection,
  LiquiditySweepStrategyInput,
} from "./LiquiditySweepTypes";
import type { LiquiditySweepTradeSetup } from "./LiquiditySweepTradeTypes";

export type LiquiditySweepConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type LiquiditySweepSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface LiquiditySweepInstitutionalScore {
  conviction: number;
  grade: LiquiditySweepConvictionGrade;
  signalGrade: LiquiditySweepSignalGrade;
  confidence: number;
}

export interface LiquiditySweepConvictionWeights {
  readonly liquidityGrab: number;
  readonly volumeSpike: number;
  readonly structureQuality: number;
  readonly marketContext: number;
  readonly breadth: number;
  readonly sector: number;
  readonly riskReward: number;
  readonly atr: number;
  readonly liquidity: number;
  readonly dataQuality: number;
}

export interface LiquiditySweepScoringConfig {
  readonly weights: LiquiditySweepConvictionWeights;
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
export const DEFAULT_LIQUIDITY_SWEEP_CONVICTION_WEIGHTS: LiquiditySweepConvictionWeights =
  {
    liquidityGrab: 0.2,
    volumeSpike: 0.15,
    structureQuality: 0.15,
    marketContext: 0.1,
    breadth: 0.1,
    sector: 0.1,
    riskReward: 0.1,
    atr: 0.05,
    liquidity: 0.05,
    dataQuality: 0.1,
  };

export const DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG: LiquiditySweepScoringConfig =
  {
    weights: DEFAULT_LIQUIDITY_SWEEP_CONVICTION_WEIGHTS,
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

export function resolveLiquiditySweepScoringConfig(
  partial?: Partial<LiquiditySweepScoringConfig> & {
    weights?: Partial<LiquiditySweepConvictionWeights>;
    signalGrade?: Partial<LiquiditySweepScoringConfig["signalGrade"]>;
    signalBlend?: Partial<LiquiditySweepScoringConfig["signalBlend"]>;
  }
): LiquiditySweepScoringConfig {
  return {
    ...DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyLiquiditySweepConvictionGrade(
  conviction: number,
  config: LiquiditySweepScoringConfig = DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG
): LiquiditySweepConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyLiquiditySweepSignalGrade(
  composite: number,
  config: LiquiditySweepScoringConfig = DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG
): LiquiditySweepSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface LiquiditySweepFactorScores {
  liquidityGrab: number;
  volumeSpike: number;
  structureQuality: number;
  marketContext: number;
  breadth: number;
  sector: number;
  riskReward: number;
  atr: number;
  liquidity: number;
  dataQuality: number;
}

export function scoreLiquiditySweepConvictionFactors(input: {
  detection: LiquiditySweepDetection;
  setup: Pick<
    LiquiditySweepTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  lsInput: LiquiditySweepStrategyInput;
  config?: LiquiditySweepScoringConfig;
}): LiquiditySweepFactorScores {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.lsInput.liquiditySweep;
  let dataQuality = 85;

  const liquidityGrab = d.detected
    ? clamp(
        50 +
          Math.min(d.sweepDistance / Math.max(d.liquidityLevel * 0.001, 0.01), 30) +
          (d.sweepType === "liquidity_grab" || d.sweepType === "stop_hunt"
            ? 15
            : 8),
        40,
        100
      )
    : 20;

  const volumeSpike = d.volumeSpike
    ? 90
    : d.relativeVolumeConfirmed
      ? 60
      : 30;

  const structureQuality = d.reversalConfirmed
    ? clamp(d.confidence, 0, 100)
    : 30;

  const marketContext = d.marketConfirmed
    ? clamp(ctx.confidence, 0, 100)
    : 25;

  const breadth = d.breadthConfirmed
    ? clamp(ctx.marketBreadth.score, 0, 100)
    : 25;

  const sector = d.sectorConfirmed
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

  let atr = 50;
  const atrValue = payload.atr ?? input.lsInput.atr ?? null;
  if (atrValue === null || !Number.isFinite(atrValue) || atrValue <= 0) {
    atr = 35;
    dataQuality -= config.missingFactorPenalty * 0.5;
  } else if (input.setup.entry > 0) {
    const atrPct = atrValue / input.setup.entry;
    atr = atrPct > 0.001 && atrPct < 0.05 ? 80 : 55;
  }

  const liquidity =
    payload.relativeVolume === null ||
    !Number.isFinite(payload.relativeVolume) ||
    payload.relativeVolume >= 0.85
      ? 80
      : 35;

  if (payload.relativeVolume === null) {
    dataQuality -= config.missingFactorPenalty * 0.4;
  }
  if (!Number.isFinite(payload.vwap) || payload.vwap <= 0) {
    dataQuality -= config.missingFactorPenalty * 0.3;
  }
  if (ctx.warnings.length > 0) {
    dataQuality -= Math.min(ctx.warnings.length * 4, 20);
  }
  dataQuality = clamp(dataQuality, 0, 100);

  return {
    liquidityGrab,
    volumeSpike,
    structureQuality,
    marketContext,
    breadth,
    sector,
    riskReward,
    atr,
    liquidity,
    dataQuality,
  };
}

function weightSum(weights: LiquiditySweepConvictionWeights): number {
  return (
    weights.liquidityGrab +
    weights.volumeSpike +
    weights.structureQuality +
    weights.marketContext +
    weights.breadth +
    weights.sector +
    weights.riskReward +
    weights.atr +
    weights.liquidity +
    weights.dataQuality
  );
}

export function calculateLiquiditySweepConviction(
  factors: LiquiditySweepFactorScores,
  config: LiquiditySweepScoringConfig = DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.liquidityGrab * w.liquidityGrab +
      factors.volumeSpike * w.volumeSpike +
      factors.structureQuality * w.structureQuality +
      factors.marketContext * w.marketContext +
      factors.breadth * w.breadth +
      factors.sector * w.sector +
      factors.riskReward * w.riskReward +
      factors.atr * w.atr +
      factors.liquidity * w.liquidity +
      factors.dataQuality * w.dataQuality) /
    total;

  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateLiquiditySweepSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: LiquiditySweepScoringConfig;
}): LiquiditySweepSignalGrade {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_SCORING_CONFIG;
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
  return classifyLiquiditySweepSignalGrade(composite, config);
}

export function buildLiquiditySweepInstitutionalScore(input: {
  detection: LiquiditySweepDetection;
  setup: Pick<
    LiquiditySweepTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  lsInput: LiquiditySweepStrategyInput;
  config?: LiquiditySweepScoringConfig;
}): LiquiditySweepInstitutionalScore {
  try {
    const config = resolveLiquiditySweepScoringConfig(input.config);
    const factors = scoreLiquiditySweepConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateLiquiditySweepConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    const grade = classifyLiquiditySweepConvictionGrade(conviction, config);
    const signalGrade = calculateLiquiditySweepSignalGrade({
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
