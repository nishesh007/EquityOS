/**
 * News Momentum Institutional Scoring — Sprint 11B.3K.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  NewsMomentumDetection,
  NewsMomentumStrategyInput,
} from "./NewsMomentumTypes";
import type { NewsMomentumTradeSetup } from "./NewsMomentumTradeTypes";

export type NewsMomentumConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type NewsMomentumSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface NewsMomentumInstitutionalScore {
  conviction: number;
  grade: NewsMomentumConvictionGrade;
  signalGrade: NewsMomentumSignalGrade;
  confidence: number;
}

export interface NewsMomentumConvictionWeights {
  readonly catalystStrength: number;
  readonly credibility: number;
  readonly priceAction: number;
  readonly volume: number;
  readonly sector: number;
  readonly breadth: number;
  readonly vwapAlignment: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface NewsMomentumScoringConfig {
  readonly weights: NewsMomentumConvictionWeights;
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

/** Sprint weights (sum 1.0) — normalized at scoring time. */
export const DEFAULT_NEWS_MOMENTUM_CONVICTION_WEIGHTS: NewsMomentumConvictionWeights =
  {
    catalystStrength: 0.25,
    credibility: 0.2,
    priceAction: 0.15,
    volume: 0.1,
    sector: 0.1,
    breadth: 0.05,
    vwapAlignment: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG: NewsMomentumScoringConfig = {
  weights: DEFAULT_NEWS_MOMENTUM_CONVICTION_WEIGHTS,
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

export function resolveNewsMomentumScoringConfig(
  partial?: Partial<NewsMomentumScoringConfig> & {
    weights?: Partial<NewsMomentumConvictionWeights>;
    signalGrade?: Partial<NewsMomentumScoringConfig["signalGrade"]>;
    signalBlend?: Partial<NewsMomentumScoringConfig["signalBlend"]>;
  }
): NewsMomentumScoringConfig {
  return {
    ...DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyNewsMomentumConvictionGrade(
  conviction: number,
  config: NewsMomentumScoringConfig = DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG
): NewsMomentumConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyNewsMomentumSignalGrade(
  composite: number,
  config: NewsMomentumScoringConfig = DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG
): NewsMomentumSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface NewsMomentumFactorScores {
  catalystStrength: number;
  credibility: number;
  priceAction: number;
  volume: number;
  sector: number;
  breadth: number;
  vwapAlignment: number;
  riskReward: number;
  liquidity: number;
}

export function scoreNewsMomentumConvictionFactors(input: {
  detection: NewsMomentumDetection;
  setup: Pick<
    NewsMomentumTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  nmInput: NewsMomentumStrategyInput;
  config?: NewsMomentumScoringConfig;
}): NewsMomentumFactorScores {
  const config = input.config ?? DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.nmInput.newsMomentum;

  const catalystStrength = d.detected
    ? clamp(d.catalystStrength, 40, 100)
    : 25;

  const credibility = clamp(d.credibility, 0, 100);

  const priceAction = d.priceConfirmed ? 85 : 30;

  const volume = d.volumeConfirmed ? 88 : 30;

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    if (d.direction === "BUY" && input.setup.entry >= d.vwap) vwapAlignment = 85;
    else if (d.direction === "SELL" && input.setup.entry <= d.vwap)
      vwapAlignment = 85;
    else if (d.direction === "BUY" || d.direction === "SELL") vwapAlignment = 35;
  }

  const sector = d.sectorConfirmed
    ? clamp(input.marketContext.marketStrength, 40, 100)
    : 25;

  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);

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
    catalystStrength,
    credibility,
    priceAction,
    volume,
    sector,
    breadth,
    vwapAlignment,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: NewsMomentumConvictionWeights): number {
  return (
    weights.catalystStrength +
    weights.credibility +
    weights.priceAction +
    weights.volume +
    weights.sector +
    weights.breadth +
    weights.vwapAlignment +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateNewsMomentumConviction(
  factors: NewsMomentumFactorScores,
  config: NewsMomentumScoringConfig = DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.catalystStrength * w.catalystStrength +
      factors.credibility * w.credibility +
      factors.priceAction * w.priceAction +
      factors.volume * w.volume +
      factors.sector * w.sector +
      factors.breadth * w.breadth +
      factors.vwapAlignment * w.vwapAlignment +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateNewsMomentumSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: NewsMomentumScoringConfig;
}): NewsMomentumSignalGrade {
  const config = input.config ?? DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG;
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
  return classifyNewsMomentumSignalGrade(composite, config);
}

export function buildNewsMomentumInstitutionalScore(input: {
  detection: NewsMomentumDetection;
  setup: Pick<
    NewsMomentumTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  nmInput: NewsMomentumStrategyInput;
  config?: NewsMomentumScoringConfig;
}): NewsMomentumInstitutionalScore {
  try {
    const config = resolveNewsMomentumScoringConfig(input.config);
    const factors = scoreNewsMomentumConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateNewsMomentumConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifyNewsMomentumConvictionGrade(conviction, config),
      signalGrade: calculateNewsMomentumSignalGrade({
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
