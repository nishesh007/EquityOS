/**
 * ORB Institutional Scoring — Sprint 11B.3B.3.
 * Conviction (0–100) and signal letter grades. Config-driven weights only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./ORBUtils";
import type { ORBDetection, ORBStrategyInput } from "./ORBTypes";
import type { ORBTradeSetup } from "./ORBTradeTypes";

export type ORBConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type ORBSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface ORBInstitutionalScore {
  conviction: number;
  grade: ORBConvictionGrade;
  signalGrade: ORBSignalGrade;
  confidence: number;
}

export interface ORBConvictionWeights {
  readonly breakoutQuality: number;
  readonly volumeQuality: number;
  readonly marketRegime: number;
  readonly marketBreadth: number;
  readonly sectorStrength: number;
  readonly riskReward: number;
  readonly liquidity: number;
  readonly vwapAlignment: number;
  readonly atrQuality: number;
  readonly dataQuality: number;
}

export interface ORBScoringConfig {
  readonly weights: ORBConvictionWeights;
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

export const DEFAULT_ORB_CONVICTION_WEIGHTS: ORBConvictionWeights = {
  breakoutQuality: 0.2,
  volumeQuality: 0.15,
  marketRegime: 0.15,
  marketBreadth: 0.1,
  sectorStrength: 0.1,
  riskReward: 0.15,
  liquidity: 0.05,
  vwapAlignment: 0.05,
  atrQuality: 0.05,
  dataQuality: 0.05,
};

export const DEFAULT_ORB_SCORING_CONFIG: ORBScoringConfig = {
  weights: DEFAULT_ORB_CONVICTION_WEIGHTS,
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

export function resolveORBScoringConfig(
  partial?: Partial<ORBScoringConfig> & {
    weights?: Partial<ORBConvictionWeights>;
    signalGrade?: Partial<ORBScoringConfig["signalGrade"]>;
    signalBlend?: Partial<ORBScoringConfig["signalBlend"]>;
  }
): ORBScoringConfig {
  return {
    ...DEFAULT_ORB_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_ORB_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_ORB_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_ORB_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyORBConvictionGrade(
  conviction: number,
  config: ORBScoringConfig = DEFAULT_ORB_SCORING_CONFIG
): ORBConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyORBSignalGrade(
  composite: number,
  config: ORBScoringConfig = DEFAULT_ORB_SCORING_CONFIG
): ORBSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface ORBFactorScores {
  breakoutQuality: number;
  volumeQuality: number;
  marketRegime: number;
  marketBreadth: number;
  sectorStrength: number;
  riskReward: number;
  liquidity: number;
  vwapAlignment: number;
  atrQuality: number;
  dataQuality: number;
}

export function scoreORBConvictionFactors(input: {
  detection: ORBDetection;
  setup: Pick<
    ORBTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  orbInput: ORBStrategyInput;
  config?: ORBScoringConfig;
}): ORBFactorScores {
  const config = input.config ?? DEFAULT_ORB_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const orb = input.orbInput.orb;
  let dataQuality = 85;

  const breakoutQuality = d.detected
    ? clamp(d.confidence, 0, 100)
    : clamp(20, 0, 100);
  const volumeQuality = d.volumeConfirmed
    ? clamp(
        70 +
          (orb.relativeVolume !== null && Number.isFinite(orb.relativeVolume)
            ? Math.min(orb.relativeVolume * 10, 30)
            : 10),
        0,
        100
      )
    : 30;
  const marketRegime = d.marketConfirmed
    ? clamp(ctx.confidence, 0, 100)
    : 25;
  const marketBreadth = d.breadthConfirmed
    ? clamp(ctx.marketBreadth.score, 0, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(ctx), 0, 100)
    : 25;
  const riskReward = input.setup.entry > 0
    ? clamp(
        (input.setup.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
        0,
        100
      )
    : 15;
  const liquidity = d.liquidityConfirmed ? 80 : 30;

  let vwapAlignment = 50;
  if (orb.vwap === null || !Number.isFinite(orb.vwap)) {
    vwapAlignment = 40;
    dataQuality -= config.missingFactorPenalty * 0.5;
  } else if (d.direction === "BUY") {
    vwapAlignment = input.setup.entry >= orb.vwap ? 85 : 45;
  } else if (d.direction === "SELL") {
    vwapAlignment = input.setup.entry <= orb.vwap ? 85 : 45;
  }

  let atrQuality = 50;
  const atr = orb.atr ?? input.orbInput.atr ?? null;
  if (atr === null || !Number.isFinite(atr) || atr <= 0) {
    atrQuality = 35;
    dataQuality -= config.missingFactorPenalty * 0.5;
  } else if (input.setup.entry > 0) {
    const atrPct = atr / input.setup.entry;
    atrQuality = atrPct > 0.002 && atrPct < 0.05 ? 80 : 55;
  }

  if (orb.relativeVolume === null) {
    dataQuality -= config.missingFactorPenalty * 0.4;
  }
  if (ctx.warnings.length > 0) {
    dataQuality -= Math.min(ctx.warnings.length * 4, 20);
  }
  dataQuality = clamp(dataQuality, 0, 100);

  return {
    breakoutQuality,
    volumeQuality,
    marketRegime,
    marketBreadth,
    sectorStrength,
    riskReward,
    liquidity,
    vwapAlignment,
    atrQuality,
    dataQuality,
  };
}

export function calculateORBConviction(
  factors: ORBFactorScores,
  config: ORBScoringConfig = DEFAULT_ORB_SCORING_CONFIG
): number {
  const w = config.weights;
  const composite =
    factors.breakoutQuality * w.breakoutQuality +
    factors.volumeQuality * w.volumeQuality +
    factors.marketRegime * w.marketRegime +
    factors.marketBreadth * w.marketBreadth +
    factors.sectorStrength * w.sectorStrength +
    factors.riskReward * w.riskReward +
    factors.liquidity * w.liquidity +
    factors.vwapAlignment * w.vwapAlignment +
    factors.atrQuality * w.atrQuality +
    factors.dataQuality * w.dataQuality;

  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

/**
 * Signal grade blends conviction, trade quality, risk posture, and market context.
 */
export function calculateORBSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: ORBScoringConfig;
}): ORBSignalGrade {
  const config = input.config ?? DEFAULT_ORB_SCORING_CONFIG;
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
  return classifyORBSignalGrade(composite, config);
}

export function buildORBInstitutionalScore(input: {
  detection: ORBDetection;
  setup: Pick<
    ORBTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  orbInput: ORBStrategyInput;
  config?: ORBScoringConfig;
}): ORBInstitutionalScore {
  try {
    const config = resolveORBScoringConfig(input.config);
    const factors = scoreORBConvictionFactors({ ...input, config });
    const conviction = calculateORBConviction(factors, config);
    const grade = classifyORBConvictionGrade(conviction, config);
    const signalGrade = calculateORBSignalGrade({
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
