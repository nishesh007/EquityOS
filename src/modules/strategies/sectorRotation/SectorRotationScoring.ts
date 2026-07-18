/**
 * Sector Rotation Institutional Scoring — Sprint 11B.3J.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./SectorRotationUtils";
import type {
  SectorRotationDetection,
  SectorRotationStrategyInput,
} from "./SectorRotationTypes";
import type { SectorRotationTradeSetup } from "./SectorRotationTradeTypes";

export type SectorRotationConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type SectorRotationSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface SectorRotationInstitutionalScore {
  conviction: number;
  grade: SectorRotationConvictionGrade;
  signalGrade: SectorRotationSignalGrade;
  confidence: number;
}

export interface SectorRotationConvictionWeights {
  readonly capitalRotation: number;
  readonly sectorLeadership: number;
  readonly stockLeadership: number;
  readonly breadth: number;
  readonly volume: number;
  readonly vwapAlignment: number;
  readonly trendQuality: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface SectorRotationScoringConfig {
  readonly weights: SectorRotationConvictionWeights;
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
export const DEFAULT_SECTOR_ROTATION_CONVICTION_WEIGHTS: SectorRotationConvictionWeights =
  {
    capitalRotation: 0.2,
    sectorLeadership: 0.2,
    stockLeadership: 0.15,
    breadth: 0.1,
    volume: 0.1,
    vwapAlignment: 0.1,
    trendQuality: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_SECTOR_ROTATION_SCORING_CONFIG: SectorRotationScoringConfig =
  {
    weights: DEFAULT_SECTOR_ROTATION_CONVICTION_WEIGHTS,
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

export function resolveSectorRotationScoringConfig(
  partial?: Partial<SectorRotationScoringConfig> & {
    weights?: Partial<SectorRotationConvictionWeights>;
    signalGrade?: Partial<SectorRotationScoringConfig["signalGrade"]>;
    signalBlend?: Partial<SectorRotationScoringConfig["signalBlend"]>;
  }
): SectorRotationScoringConfig {
  return {
    ...DEFAULT_SECTOR_ROTATION_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_SECTOR_ROTATION_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_SECTOR_ROTATION_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_SECTOR_ROTATION_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifySectorRotationConvictionGrade(
  conviction: number,
  config: SectorRotationScoringConfig = DEFAULT_SECTOR_ROTATION_SCORING_CONFIG
): SectorRotationConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifySectorRotationSignalGrade(
  composite: number,
  config: SectorRotationScoringConfig = DEFAULT_SECTOR_ROTATION_SCORING_CONFIG
): SectorRotationSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface SectorRotationFactorScores {
  capitalRotation: number;
  sectorLeadership: number;
  stockLeadership: number;
  breadth: number;
  volume: number;
  vwapAlignment: number;
  trendQuality: number;
  riskReward: number;
  liquidity: number;
}

export function scoreSectorRotationConvictionFactors(input: {
  detection: SectorRotationDetection;
  setup: Pick<
    SectorRotationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  srInput: SectorRotationStrategyInput;
  config?: SectorRotationScoringConfig;
}): SectorRotationFactorScores {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.srInput.sectorRotation;

  const capitalRotation =
    d.detected && d.sectorOutperformsBenchmark
      ? clamp(d.sectorRelativeStrength, 40, 100)
      : 25;

  const sectorLeadership = d.sectorConfirmed
    ? clamp(d.sectorRelativeStrength, 40, 100)
    : 25;

  const stockLeadership =
    d.detected && d.stockOutperformsSector
      ? clamp(d.stockRelativeStrength, 40, 100)
      : 25;

  const trendQuality =
    d.detected && d.direction !== "NONE"
      ? clamp(d.confidence, 40, 100)
      : 25;

  const volume = d.volumeConfirmed ? 88 : 30;

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    if (d.direction === "BUY" && input.setup.entry >= d.vwap) vwapAlignment = 85;
    else if (d.direction === "SELL" && input.setup.entry <= d.vwap)
      vwapAlignment = 85;
    else if (d.direction === "BUY" || d.direction === "SELL") vwapAlignment = 35;
  }

  const breadth = d.breadthConfirmed
    ? clamp(d.sectorBreadth, 0, 100)
    : clamp(ctx.marketBreadth?.score ?? 25, 0, 100);

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

  if (!d.sectorConfirmed) {
    void averageSectorScore(ctx);
  }

  return {
    capitalRotation,
    sectorLeadership,
    stockLeadership,
    breadth,
    volume,
    vwapAlignment,
    trendQuality,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: SectorRotationConvictionWeights): number {
  return (
    weights.capitalRotation +
    weights.sectorLeadership +
    weights.stockLeadership +
    weights.breadth +
    weights.volume +
    weights.vwapAlignment +
    weights.trendQuality +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateSectorRotationConviction(
  factors: SectorRotationFactorScores,
  config: SectorRotationScoringConfig = DEFAULT_SECTOR_ROTATION_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.capitalRotation * w.capitalRotation +
      factors.sectorLeadership * w.sectorLeadership +
      factors.stockLeadership * w.stockLeadership +
      factors.breadth * w.breadth +
      factors.volume * w.volume +
      factors.vwapAlignment * w.vwapAlignment +
      factors.trendQuality * w.trendQuality +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateSectorRotationSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: SectorRotationScoringConfig;
}): SectorRotationSignalGrade {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_SCORING_CONFIG;
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
  return classifySectorRotationSignalGrade(composite, config);
}

export function buildSectorRotationInstitutionalScore(input: {
  detection: SectorRotationDetection;
  setup: Pick<
    SectorRotationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  srInput: SectorRotationStrategyInput;
  config?: SectorRotationScoringConfig;
}): SectorRotationInstitutionalScore {
  try {
    const config = resolveSectorRotationScoringConfig(input.config);
    const factors = scoreSectorRotationConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateSectorRotationConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifySectorRotationConvictionGrade(conviction, config),
      signalGrade: calculateSectorRotationSignalGrade({
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
