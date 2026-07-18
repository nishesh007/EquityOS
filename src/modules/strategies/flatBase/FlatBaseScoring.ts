/**
 * Flat Base Institutional Scoring — Sprint 11B.3R.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  FlatBaseDetection,
  FlatBaseStrategyInput,
} from "./FlatBaseTypes";
import type { FlatBaseTradeSetup } from "./FlatBaseTradeTypes";

export type FlatBaseConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type FlatBaseSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface FlatBaseInstitutionalScore {
  conviction: number;
  grade: FlatBaseConvictionGrade;
  signalGrade: FlatBaseSignalGrade;
  confidence: number;
}

export interface FlatBaseConvictionWeights {
  readonly patternIntegrity: number;
  readonly institutionalBuying: number;
  readonly breakoutStrength: number;
  readonly volumeConfirmation: number;
  readonly relativeStrength: number;
  readonly breadth: number;
  readonly marketRegime: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface FlatBaseScoringConfig {
  readonly weights: FlatBaseConvictionWeights;
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

export const DEFAULT_FLAT_BASE_CONVICTION_WEIGHTS: FlatBaseConvictionWeights = {
  patternIntegrity: 0.2,
  institutionalBuying: 0.2,
  breakoutStrength: 0.15,
  volumeConfirmation: 0.15,
  relativeStrength: 0.1,
  breadth: 0.05,
  marketRegime: 0.05,
  riskReward: 0.05,
  liquidity: 0.05,
};

export const DEFAULT_FLAT_BASE_SCORING_CONFIG: FlatBaseScoringConfig = {
  weights: DEFAULT_FLAT_BASE_CONVICTION_WEIGHTS,
  exceptionalMin: 95,
  highMin: 85,
  goodMin: 70,
  averageMin: 55,
  minimumRiskReward: 2.5,
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

export function resolveFlatBaseScoringConfig(
  partial?: Partial<FlatBaseScoringConfig> & {
    weights?: Partial<FlatBaseConvictionWeights>;
    signalGrade?: Partial<FlatBaseScoringConfig["signalGrade"]>;
    signalBlend?: Partial<FlatBaseScoringConfig["signalBlend"]>;
  }
): FlatBaseScoringConfig {
  return {
    ...DEFAULT_FLAT_BASE_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_FLAT_BASE_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_FLAT_BASE_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_FLAT_BASE_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyFlatBaseConvictionGrade(
  conviction: number,
  config: FlatBaseScoringConfig = DEFAULT_FLAT_BASE_SCORING_CONFIG
): FlatBaseConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyFlatBaseSignalGrade(
  composite: number,
  config: FlatBaseScoringConfig = DEFAULT_FLAT_BASE_SCORING_CONFIG
): FlatBaseSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface FlatBaseFactorScores {
  patternIntegrity: number;
  institutionalBuying: number;
  breakoutStrength: number;
  volumeConfirmation: number;
  relativeStrength: number;
  breadth: number;
  marketRegime: number;
  riskReward: number;
  liquidity: number;
}

export function scoreFlatBaseConvictionFactors(input: {
  detection: FlatBaseDetection;
  setup: Pick<
    FlatBaseTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  fbInput: FlatBaseStrategyInput;
  config?: FlatBaseScoringConfig;
}): FlatBaseFactorScores {
  const config = input.config ?? DEFAULT_FLAT_BASE_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.fbInput.flatBase;

  const patternIntegrity = d.detected
    ? clamp(d.baseQuality, 40, 100)
    : 25;
  const institutionalBuying =
    d.volumeConfirmed && d.baseValid ? 85 : d.volumeConfirmed ? 70 : 30;
  const breakoutStrength = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 50, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 50, 100)
    : 25;
  const relativeStrength = d.rsConfirmed
    ? clamp(payload.relativeStrength ?? 60, 40, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);
  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.confidence, 0, 100)
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
    (payload.relativeVolume ?? 0) >= 1
      ? 80
      : 35;

  return {
    patternIntegrity,
    institutionalBuying,
    breakoutStrength,
    volumeConfirmation,
    relativeStrength,
    breadth,
    marketRegime,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: FlatBaseConvictionWeights): number {
  return (
    weights.patternIntegrity +
    weights.institutionalBuying +
    weights.breakoutStrength +
    weights.volumeConfirmation +
    weights.relativeStrength +
    weights.breadth +
    weights.marketRegime +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateFlatBaseConviction(
  factors: FlatBaseFactorScores,
  config: FlatBaseScoringConfig = DEFAULT_FLAT_BASE_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.patternIntegrity * w.patternIntegrity +
      factors.institutionalBuying * w.institutionalBuying +
      factors.breakoutStrength * w.breakoutStrength +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.relativeStrength * w.relativeStrength +
      factors.breadth * w.breadth +
      factors.marketRegime * w.marketRegime +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateFlatBaseSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: FlatBaseScoringConfig;
}): FlatBaseSignalGrade {
  const config = input.config ?? DEFAULT_FLAT_BASE_SCORING_CONFIG;
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
  return classifyFlatBaseSignalGrade(composite, config);
}

export function buildFlatBaseInstitutionalScore(input: {
  detection: FlatBaseDetection;
  setup: Pick<
    FlatBaseTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  fbInput: FlatBaseStrategyInput;
  config?: FlatBaseScoringConfig;
}): FlatBaseInstitutionalScore {
  try {
    const config = resolveFlatBaseScoringConfig(input.config);
    const factors = scoreFlatBaseConvictionFactors({ ...input, config });
    let conviction = calculateFlatBaseConviction(factors, config);
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyFlatBaseConvictionGrade(conviction, config),
      signalGrade: calculateFlatBaseSignalGrade({
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
