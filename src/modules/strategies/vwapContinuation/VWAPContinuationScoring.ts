/**
 * VWAP Continuation Institutional Scoring — Sprint 11B.3C.3.
 * Conviction (0–100) and signal letter grades. Config-driven weights only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./VWAPContinuationUtils";
import type {
  VWAPContinuationDetection,
  VWAPContinuationStrategyInput,
} from "./VWAPContinuationTypes";
import type { VWAPContinuationTradeSetup } from "./VWAPContinuationTradeTypes";

export type VWAPContinuationConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type VWAPContinuationSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface VWAPContinuationInstitutionalScore {
  conviction: number;
  grade: VWAPContinuationConvictionGrade;
  signalGrade: VWAPContinuationSignalGrade;
  confidence: number;
}

export interface VWAPContinuationConvictionWeights {
  readonly vwapTrend: number;
  readonly trendStructure: number;
  readonly volume: number;
  readonly marketRegime: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly riskReward: number;
  readonly atrQuality: number;
  readonly liquidity: number;
  readonly dataQuality: number;
  readonly vwapRespect: number;
}

export interface VWAPContinuationScoringConfig {
  readonly weights: VWAPContinuationConvictionWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly averageMin: number;
  readonly minimumRiskReward: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly missingFactorPenalty: number;
  readonly elevatedVixThreshold: number;
  readonly deepPullbackDistancePct: number;
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
export const DEFAULT_VWAP_CONTINUATION_CONVICTION_WEIGHTS: VWAPContinuationConvictionWeights =
  {
    vwapTrend: 0.2,
    trendStructure: 0.15,
    volume: 0.15,
    marketRegime: 0.1,
    breadth: 0.1,
    sectorStrength: 0.1,
    riskReward: 0.1,
    atrQuality: 0.05,
    liquidity: 0.05,
    dataQuality: 0.05,
    vwapRespect: 0.05,
  };

export const DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG: VWAPContinuationScoringConfig =
  {
    weights: DEFAULT_VWAP_CONTINUATION_CONVICTION_WEIGHTS,
    exceptionalMin: 95,
    highMin: 85,
    goodMin: 70,
    averageMin: 55,
    minimumRiskReward: 2,
    scoreFloor: 0,
    scoreCeiling: 100,
    missingFactorPenalty: 12,
    elevatedVixThreshold: 20,
    deepPullbackDistancePct: 0.012,
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

export function resolveVWAPContinuationScoringConfig(
  partial?: Partial<VWAPContinuationScoringConfig> & {
    weights?: Partial<VWAPContinuationConvictionWeights>;
    signalGrade?: Partial<VWAPContinuationScoringConfig["signalGrade"]>;
    signalBlend?: Partial<VWAPContinuationScoringConfig["signalBlend"]>;
  }
): VWAPContinuationScoringConfig {
  return {
    ...DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyVWAPContinuationConvictionGrade(
  conviction: number,
  config: VWAPContinuationScoringConfig = DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG
): VWAPContinuationConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyVWAPContinuationSignalGrade(
  composite: number,
  config: VWAPContinuationScoringConfig = DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG
): VWAPContinuationSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface VWAPContinuationFactorScores {
  vwapTrend: number;
  trendStructure: number;
  volume: number;
  marketRegime: number;
  breadth: number;
  sectorStrength: number;
  riskReward: number;
  atrQuality: number;
  liquidity: number;
  dataQuality: number;
  vwapRespect: number;
}

export function scoreVWAPContinuationConvictionFactors(input: {
  detection: VWAPContinuationDetection;
  setup: Pick<
    VWAPContinuationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  vwapInput: VWAPContinuationStrategyInput;
  config?: VWAPContinuationScoringConfig;
}): VWAPContinuationFactorScores {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.vwapInput.vwapContinuation;
  let dataQuality = 85;

  const vwapTrend = d.detected
    ? clamp(
        d.confidence *
          (Math.abs(d.distanceFromVWAP) > 0.0001 ? 1 : 0.75),
        0,
        100
      )
    : 20;

  const trendStructure =
    d.detected && d.pullbackDetected && d.bounceConfirmed
      ? clamp(d.confidence, 0, 100)
      : d.detected
        ? clamp(d.confidence * 0.65, 0, 100)
        : 25;

  const volume = d.volumeConfirmed
    ? clamp(
        70 +
          (payload.relativeVolume !== null &&
          Number.isFinite(payload.relativeVolume)
            ? Math.min(payload.relativeVolume * 10, 30)
            : 10),
        0,
        100
      )
    : 30;

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
    volScore <= 75 && ctx.riskMode !== "Risk Off" ? 80 : 35;

  const absDistance = Math.abs(d.distanceFromVWAP);
  let vwapRespect = 50;
  if (d.pullbackDetected && d.bounceConfirmed) {
    vwapRespect =
      absDistance <= config.deepPullbackDistancePct ? 90 : 55;
  } else if (d.detected) {
    vwapRespect = 40;
  } else {
    vwapRespect = 25;
  }

  let atrQuality = 50;
  const atr = payload.atr ?? input.vwapInput.atr ?? null;
  if (atr === null || !Number.isFinite(atr) || atr <= 0) {
    atrQuality = 35;
    dataQuality -= config.missingFactorPenalty * 0.5;
  } else if (input.setup.entry > 0) {
    const atrPct = atr / input.setup.entry;
    atrQuality = atrPct > 0.002 && atrPct < 0.05 ? 80 : 55;
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
    vwapTrend,
    trendStructure,
    volume,
    marketRegime,
    breadth,
    sectorStrength,
    riskReward,
    atrQuality,
    liquidity,
    dataQuality,
    vwapRespect,
  };
}

function weightSum(weights: VWAPContinuationConvictionWeights): number {
  return (
    weights.vwapTrend +
    weights.trendStructure +
    weights.volume +
    weights.marketRegime +
    weights.breadth +
    weights.sectorStrength +
    weights.riskReward +
    weights.atrQuality +
    weights.liquidity +
    weights.dataQuality +
    weights.vwapRespect
  );
}

export function calculateVWAPContinuationConviction(
  factors: VWAPContinuationFactorScores,
  config: VWAPContinuationScoringConfig = DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.vwapTrend * w.vwapTrend +
      factors.trendStructure * w.trendStructure +
      factors.volume * w.volume +
      factors.marketRegime * w.marketRegime +
      factors.breadth * w.breadth +
      factors.sectorStrength * w.sectorStrength +
      factors.riskReward * w.riskReward +
      factors.atrQuality * w.atrQuality +
      factors.liquidity * w.liquidity +
      factors.dataQuality * w.dataQuality +
      factors.vwapRespect * w.vwapRespect) /
    total;

  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

/**
 * Signal grade blends conviction, trade quality, risk posture, and market context.
 */
export function calculateVWAPContinuationSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: VWAPContinuationScoringConfig;
}): VWAPContinuationSignalGrade {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG;
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
  return classifyVWAPContinuationSignalGrade(composite, config);
}

export function buildVWAPContinuationInstitutionalScore(input: {
  detection: VWAPContinuationDetection;
  setup: Pick<
    VWAPContinuationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  vwapInput: VWAPContinuationStrategyInput;
  config?: VWAPContinuationScoringConfig;
}): VWAPContinuationInstitutionalScore {
  try {
    const config = resolveVWAPContinuationScoringConfig(input.config);
    const factors = scoreVWAPContinuationConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateVWAPContinuationConviction(factors, config);

    // Optional failures reduce conviction (never crash)
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    const grade = classifyVWAPContinuationConvictionGrade(conviction, config);
    const signalGrade = calculateVWAPContinuationSignalGrade({
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
