/**
 * EMA Pullback Institutional Scoring — Sprint 11B.3P.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  EMAPullbackDetection,
  EMAPullbackStrategyInput,
} from "./EMAPullbackTypes";
import type { EMAPullbackTradeSetup } from "./EMAPullbackTradeTypes";
import { averageSectorScore } from "./EMAPullbackUtils";

export type EMAPullbackConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type EMAPullbackSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface EMAPullbackInstitutionalScore {
  conviction: number;
  grade: EMAPullbackConvictionGrade;
  signalGrade: EMAPullbackSignalGrade;
  confidence: number;
}

export interface EMAPullbackConvictionWeights {
  readonly trendStrength: number;
  readonly emaAlignment: number;
  readonly pullbackQuality: number;
  readonly volumeConfirmation: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly vwapAlignment: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface EMAPullbackScoringConfig {
  readonly weights: EMAPullbackConvictionWeights;
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

export const DEFAULT_EMA_PULLBACK_CONVICTION_WEIGHTS: EMAPullbackConvictionWeights =
  {
    trendStrength: 0.2,
    emaAlignment: 0.2,
    pullbackQuality: 0.15,
    volumeConfirmation: 0.1,
    breadth: 0.1,
    sectorStrength: 0.1,
    vwapAlignment: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_EMA_PULLBACK_SCORING_CONFIG: EMAPullbackScoringConfig = {
  weights: DEFAULT_EMA_PULLBACK_CONVICTION_WEIGHTS,
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

export function resolveEMAPullbackScoringConfig(
  partial?: Partial<EMAPullbackScoringConfig> & {
    weights?: Partial<EMAPullbackConvictionWeights>;
    signalGrade?: Partial<EMAPullbackScoringConfig["signalGrade"]>;
    signalBlend?: Partial<EMAPullbackScoringConfig["signalBlend"]>;
  }
): EMAPullbackScoringConfig {
  return {
    ...DEFAULT_EMA_PULLBACK_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_EMA_PULLBACK_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_EMA_PULLBACK_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_EMA_PULLBACK_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyEMAPullbackConvictionGrade(
  conviction: number,
  config: EMAPullbackScoringConfig = DEFAULT_EMA_PULLBACK_SCORING_CONFIG
): EMAPullbackConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyEMAPullbackSignalGrade(
  composite: number,
  config: EMAPullbackScoringConfig = DEFAULT_EMA_PULLBACK_SCORING_CONFIG
): EMAPullbackSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface EMAPullbackFactorScores {
  trendStrength: number;
  emaAlignment: number;
  pullbackQuality: number;
  volumeConfirmation: number;
  breadth: number;
  sectorStrength: number;
  vwapAlignment: number;
  riskReward: number;
  liquidity: number;
}

export function scoreEMAPullbackConvictionFactors(input: {
  detection: EMAPullbackDetection;
  setup: Pick<
    EMAPullbackTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  epInput: EMAPullbackStrategyInput;
  config?: EMAPullbackScoringConfig;
}): EMAPullbackFactorScores {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.epInput.emaPullback;

  const trendStrength = d.strongTrend
    ? clamp(d.trendQuality, 50, 100)
    : 25;
  const emaAlignment = d.detected ? clamp(d.emaAlignment, 40, 100) : 25;
  const pullbackQuality = d.controlledPullback
    ? clamp(d.pullbackQuality, 40, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeQuality, 50, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 25;

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0 && input.setup.entry > 0) {
    if (d.direction === "BUY") {
      vwapAlignment = input.setup.entry >= d.vwap ? 85 : 35;
    } else if (d.direction === "SELL") {
      vwapAlignment = input.setup.entry <= d.vwap ? 85 : 35;
    }
  }

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
    (payload.relativeVolume ?? 0) >= 0.85
      ? 80
      : 35;

  return {
    trendStrength,
    emaAlignment,
    pullbackQuality,
    volumeConfirmation,
    breadth,
    sectorStrength,
    vwapAlignment,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: EMAPullbackConvictionWeights): number {
  return (
    weights.trendStrength +
    weights.emaAlignment +
    weights.pullbackQuality +
    weights.volumeConfirmation +
    weights.breadth +
    weights.sectorStrength +
    weights.vwapAlignment +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateEMAPullbackConviction(
  factors: EMAPullbackFactorScores,
  config: EMAPullbackScoringConfig = DEFAULT_EMA_PULLBACK_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.trendStrength * w.trendStrength +
      factors.emaAlignment * w.emaAlignment +
      factors.pullbackQuality * w.pullbackQuality +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.breadth * w.breadth +
      factors.sectorStrength * w.sectorStrength +
      factors.vwapAlignment * w.vwapAlignment +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateEMAPullbackSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: EMAPullbackScoringConfig;
}): EMAPullbackSignalGrade {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_SCORING_CONFIG;
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
  return classifyEMAPullbackSignalGrade(composite, config);
}

export function buildEMAPullbackInstitutionalScore(input: {
  detection: EMAPullbackDetection;
  setup: Pick<
    EMAPullbackTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  epInput: EMAPullbackStrategyInput;
  config?: EMAPullbackScoringConfig;
}): EMAPullbackInstitutionalScore {
  try {
    const config = resolveEMAPullbackScoringConfig(input.config);
    const factors = scoreEMAPullbackConvictionFactors({ ...input, config });
    let conviction = calculateEMAPullbackConviction(factors, config);
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyEMAPullbackConvictionGrade(conviction, config),
      signalGrade: calculateEMAPullbackSignalGrade({
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
