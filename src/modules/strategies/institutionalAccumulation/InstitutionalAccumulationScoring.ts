/**
 * Institutional Accumulation Institutional Scoring — Sprint 11B.3H.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./InstitutionalAccumulationUtils";
import type {
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationStrategyInput,
} from "./InstitutionalAccumulationTypes";
import type { InstitutionalAccumulationTradeSetup } from "./InstitutionalAccumulationTradeTypes";

export type InstitutionalAccumulationConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type InstitutionalAccumulationSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface InstitutionalAccumulationInstitutionalScore {
  conviction: number;
  grade: InstitutionalAccumulationConvictionGrade;
  signalGrade: InstitutionalAccumulationSignalGrade;
  confidence: number;
}

export interface InstitutionalAccumulationConvictionWeights {
  readonly institutionalFootprint: number;
  readonly volumeConfirmation: number;
  readonly priceAction: number;
  readonly demandZoneQuality: number;
  readonly sectorStrength: number;
  readonly breadth: number;
  readonly vwapAlignment: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface InstitutionalAccumulationScoringConfig {
  readonly weights: InstitutionalAccumulationConvictionWeights;
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

export const DEFAULT_INSTITUTIONAL_ACCUMULATION_CONVICTION_WEIGHTS: InstitutionalAccumulationConvictionWeights =
  {
    institutionalFootprint: 0.25,
    volumeConfirmation: 0.2,
    priceAction: 0.15,
    demandZoneQuality: 0.1,
    sectorStrength: 0.1,
    breadth: 0.05,
    vwapAlignment: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG: InstitutionalAccumulationScoringConfig =
  {
    weights: DEFAULT_INSTITUTIONAL_ACCUMULATION_CONVICTION_WEIGHTS,
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

export function resolveInstitutionalAccumulationScoringConfig(
  partial?: Partial<InstitutionalAccumulationScoringConfig> & {
    weights?: Partial<InstitutionalAccumulationConvictionWeights>;
    signalGrade?: Partial<
      InstitutionalAccumulationScoringConfig["signalGrade"]
    >;
    signalBlend?: Partial<
      InstitutionalAccumulationScoringConfig["signalBlend"]
    >;
  }
): InstitutionalAccumulationScoringConfig {
  return {
    ...DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyInstitutionalAccumulationConvictionGrade(
  conviction: number,
  config: InstitutionalAccumulationScoringConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG
): InstitutionalAccumulationConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyInstitutionalAccumulationSignalGrade(
  composite: number,
  config: InstitutionalAccumulationScoringConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG
): InstitutionalAccumulationSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface InstitutionalAccumulationFactorScores {
  institutionalFootprint: number;
  volumeConfirmation: number;
  priceAction: number;
  demandZoneQuality: number;
  sectorStrength: number;
  breadth: number;
  vwapAlignment: number;
  riskReward: number;
  liquidity: number;
}

export function scoreInstitutionalAccumulationConvictionFactors(input: {
  detection: InstitutionalAccumulationDetection;
  setup: Pick<
    InstitutionalAccumulationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  accumulationInput: InstitutionalAccumulationStrategyInput;
  config?: InstitutionalAccumulationScoringConfig;
}): InstitutionalAccumulationFactorScores {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG;
  const d = input.detection;
  const ctx = input.marketContext;
  const payload = input.accumulationInput.institutionalAccumulation;

  const institutionalFootprint =
    d.detected && d.pattern !== "none"
      ? clamp(d.accumulationScore, 40, 100)
      : 25;

  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeQuality, 40, 100)
    : 30;

  const priceAction =
    d.detected && d.higherLows ? clamp(d.confidence, 40, 100) : 25;

  const demandZoneQuality =
    d.demandZoneLow > 0 && d.pattern === "demand_zone_defense"
      ? 88
      : d.demandZoneLow > 0
        ? 70
        : 30;

  const breadth = d.breadthConfirmed
    ? clamp(ctx.marketBreadth.score, 0, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(ctx), 0, 100)
    : 25;

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    if (d.direction === "BUY" && input.setup.entry >= d.vwap) vwapAlignment = 85;
    else if (d.direction === "SELL" && input.setup.entry <= d.vwap)
      vwapAlignment = 85;
    else if (d.direction === "BUY" || d.direction === "SELL") vwapAlignment = 35;
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
    payload.relativeVolume >= 1
      ? 80
      : 35;

  return {
    institutionalFootprint,
    volumeConfirmation,
    priceAction,
    demandZoneQuality,
    sectorStrength,
    breadth,
    vwapAlignment,
    riskReward,
    liquidity,
  };
}

function weightSum(
  weights: InstitutionalAccumulationConvictionWeights
): number {
  return (
    weights.institutionalFootprint +
    weights.volumeConfirmation +
    weights.priceAction +
    weights.demandZoneQuality +
    weights.sectorStrength +
    weights.breadth +
    weights.vwapAlignment +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateInstitutionalAccumulationConviction(
  factors: InstitutionalAccumulationFactorScores,
  config: InstitutionalAccumulationScoringConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.institutionalFootprint * w.institutionalFootprint +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.priceAction * w.priceAction +
      factors.demandZoneQuality * w.demandZoneQuality +
      factors.sectorStrength * w.sectorStrength +
      factors.breadth * w.breadth +
      factors.vwapAlignment * w.vwapAlignment +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateInstitutionalAccumulationSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: InstitutionalAccumulationScoringConfig;
}): InstitutionalAccumulationSignalGrade {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG;
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
  return classifyInstitutionalAccumulationSignalGrade(composite, config);
}

export function buildInstitutionalAccumulationInstitutionalScore(input: {
  detection: InstitutionalAccumulationDetection;
  setup: Pick<
    InstitutionalAccumulationTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  accumulationInput: InstitutionalAccumulationStrategyInput;
  config?: InstitutionalAccumulationScoringConfig;
}): InstitutionalAccumulationInstitutionalScore {
  try {
    const config = resolveInstitutionalAccumulationScoringConfig(input.config);
    const factors = scoreInstitutionalAccumulationConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateInstitutionalAccumulationConviction(
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
      grade: classifyInstitutionalAccumulationConvictionGrade(
        conviction,
        config
      ),
      signalGrade: calculateInstitutionalAccumulationSignalGrade({
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
