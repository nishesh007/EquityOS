/**
 * Breakout Retest Institutional Scoring — Sprint 11B.3I.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./BreakoutRetestUtils";
import type {
  BreakoutRetestDetection,
  BreakoutRetestStrategyInput,
} from "./BreakoutRetestTypes";
import type { BreakoutRetestTradeSetup } from "./BreakoutRetestTradeTypes";

export type BreakoutRetestConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type BreakoutRetestSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface BreakoutRetestInstitutionalScore {
  conviction: number;
  grade: BreakoutRetestConvictionGrade;
  signalGrade: BreakoutRetestSignalGrade;
  confidence: number;
}

export interface BreakoutRetestConvictionWeights {
  readonly breakoutStrength: number;
  readonly retestConfirmation: number;
  readonly volume: number;
  readonly trendAlignment: number;
  readonly vwapAlignment: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface BreakoutRetestScoringConfig {
  readonly weights: BreakoutRetestConvictionWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly averageMin: number;
  readonly minimumRiskReward: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
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

export const DEFAULT_BREAKOUT_RETEST_CONVICTION_WEIGHTS: BreakoutRetestConvictionWeights =
  {
    breakoutStrength: 0.2,
    retestConfirmation: 0.2,
    volume: 0.15,
    trendAlignment: 0.1,
    vwapAlignment: 0.1,
    breadth: 0.1,
    sectorStrength: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG: BreakoutRetestScoringConfig =
  {
    weights: DEFAULT_BREAKOUT_RETEST_CONVICTION_WEIGHTS,
    exceptionalMin: 95,
    highMin: 85,
    goodMin: 70,
    averageMin: 55,
    minimumRiskReward: 2,
    scoreFloor: 0,
    scoreCeiling: 100,
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

export function resolveBreakoutRetestScoringConfig(
  partial?: Partial<BreakoutRetestScoringConfig> & {
    weights?: Partial<BreakoutRetestConvictionWeights>;
    signalGrade?: Partial<BreakoutRetestScoringConfig["signalGrade"]>;
    signalBlend?: Partial<BreakoutRetestScoringConfig["signalBlend"]>;
  }
): BreakoutRetestScoringConfig {
  return {
    ...DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

function normalizeWeights(
  weights: BreakoutRetestConvictionWeights
): BreakoutRetestConvictionWeights {
  const total =
    weights.breakoutStrength +
    weights.retestConfirmation +
    weights.volume +
    weights.trendAlignment +
    weights.vwapAlignment +
    weights.breadth +
    weights.sectorStrength +
    weights.riskReward +
    weights.liquidity;
  if (Math.abs(total - 1) < 0.0001 || total <= 0) return weights;
  return {
    breakoutStrength: weights.breakoutStrength / total,
    retestConfirmation: weights.retestConfirmation / total,
    volume: weights.volume / total,
    trendAlignment: weights.trendAlignment / total,
    vwapAlignment: weights.vwapAlignment / total,
    breadth: weights.breadth / total,
    sectorStrength: weights.sectorStrength / total,
    riskReward: weights.riskReward / total,
    liquidity: weights.liquidity / total,
  };
}

export function classifyBreakoutRetestConvictionGrade(
  conviction: number,
  config: BreakoutRetestScoringConfig = DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG
): BreakoutRetestConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyBreakoutRetestSignalGrade(
  composite: number,
  config: BreakoutRetestScoringConfig = DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG
): BreakoutRetestSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface BreakoutRetestFactorScores {
  breakoutStrength: number;
  retestConfirmation: number;
  volume: number;
  trendAlignment: number;
  vwapAlignment: number;
  breadth: number;
  sectorStrength: number;
  riskReward: number;
  liquidity: number;
}

export function scoreBreakoutRetestConvictionFactors(input: {
  detection: BreakoutRetestDetection;
  setup: Pick<
    BreakoutRetestTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  retestInput: BreakoutRetestStrategyInput;
  config?: BreakoutRetestScoringConfig;
}): BreakoutRetestFactorScores {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.retestInput.breakoutRetest;

  const breakoutStrength = d.detected
    ? clamp(d.breakoutQuality, 40, 100)
    : 25;

  const retestConfirmation =
    d.retestHeld && d.continuationConfirmed
      ? clamp(d.retestQuality, 40, 100)
      : d.retestHeld
        ? clamp(d.retestQuality * 0.8, 30, 90)
        : 25;

  const volume = d.volumeConfirmed ? clamp(d.confidence * 0.85, 40, 100) : 30;

  const trendAlignment =
    d.detected && d.continuationConfirmed
      ? clamp(d.confidence, 40, 100)
      : 25;

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

  return {
    breakoutStrength,
    retestConfirmation,
    volume,
    trendAlignment,
    vwapAlignment,
    breadth,
    sectorStrength,
    riskReward,
    liquidity,
  };
}

export function calculateBreakoutRetestConviction(
  factors: BreakoutRetestFactorScores,
  config: BreakoutRetestScoringConfig = DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG
): number {
  const w = normalizeWeights(config.weights);
  const composite =
    factors.breakoutStrength * w.breakoutStrength +
    factors.retestConfirmation * w.retestConfirmation +
    factors.volume * w.volume +
    factors.trendAlignment * w.trendAlignment +
    factors.vwapAlignment * w.vwapAlignment +
    factors.breadth * w.breadth +
    factors.sectorStrength * w.sectorStrength +
    factors.riskReward * w.riskReward +
    factors.liquidity * w.liquidity;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateBreakoutRetestSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: BreakoutRetestScoringConfig;
}): BreakoutRetestSignalGrade {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG;
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
  return classifyBreakoutRetestSignalGrade(composite, config);
}

export function buildBreakoutRetestInstitutionalScore(input: {
  detection: BreakoutRetestDetection;
  setup: Pick<
    BreakoutRetestTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  retestInput: BreakoutRetestStrategyInput;
  config?: BreakoutRetestScoringConfig;
}): BreakoutRetestInstitutionalScore {
  try {
    const config = resolveBreakoutRetestScoringConfig(input.config);
    const factors = scoreBreakoutRetestConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateBreakoutRetestConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifyBreakoutRetestConvictionGrade(conviction, config),
      signalGrade: calculateBreakoutRetestSignalGrade({
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
