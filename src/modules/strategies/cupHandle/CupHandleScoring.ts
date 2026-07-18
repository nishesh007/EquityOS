/**
 * Cup & Handle Institutional Scoring — Sprint 11B.3Q.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  CupHandleDetection,
  CupHandleStrategyInput,
} from "./CupHandleTypes";
import type { CupHandleTradeSetup } from "./CupHandleTradeTypes";

export type CupHandleConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type CupHandleSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface CupHandleInstitutionalScore {
  conviction: number;
  grade: CupHandleConvictionGrade;
  signalGrade: CupHandleSignalGrade;
  confidence: number;
}

export interface CupHandleConvictionWeights {
  readonly patternIntegrity: number;
  readonly breakoutStrength: number;
  readonly institutionalParticipation: number;
  readonly volumeConfirmation: number;
  readonly relativeStrength: number;
  readonly breadth: number;
  readonly marketRegime: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface CupHandleScoringConfig {
  readonly weights: CupHandleConvictionWeights;
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

export const DEFAULT_CUP_HANDLE_CONVICTION_WEIGHTS: CupHandleConvictionWeights =
  {
    patternIntegrity: 0.2,
    breakoutStrength: 0.2,
    institutionalParticipation: 0.15,
    volumeConfirmation: 0.15,
    relativeStrength: 0.1,
    breadth: 0.05,
    marketRegime: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_CUP_HANDLE_SCORING_CONFIG: CupHandleScoringConfig = {
  weights: DEFAULT_CUP_HANDLE_CONVICTION_WEIGHTS,
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

export function resolveCupHandleScoringConfig(
  partial?: Partial<CupHandleScoringConfig> & {
    weights?: Partial<CupHandleConvictionWeights>;
    signalGrade?: Partial<CupHandleScoringConfig["signalGrade"]>;
    signalBlend?: Partial<CupHandleScoringConfig["signalBlend"]>;
  }
): CupHandleScoringConfig {
  return {
    ...DEFAULT_CUP_HANDLE_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_CUP_HANDLE_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_CUP_HANDLE_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_CUP_HANDLE_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyCupHandleConvictionGrade(
  conviction: number,
  config: CupHandleScoringConfig = DEFAULT_CUP_HANDLE_SCORING_CONFIG
): CupHandleConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyCupHandleSignalGrade(
  composite: number,
  config: CupHandleScoringConfig = DEFAULT_CUP_HANDLE_SCORING_CONFIG
): CupHandleSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface CupHandleFactorScores {
  patternIntegrity: number;
  breakoutStrength: number;
  institutionalParticipation: number;
  volumeConfirmation: number;
  relativeStrength: number;
  breadth: number;
  marketRegime: number;
  riskReward: number;
  liquidity: number;
}

export function scoreCupHandleConvictionFactors(input: {
  detection: CupHandleDetection;
  setup: Pick<
    CupHandleTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  chInput: CupHandleStrategyInput;
  config?: CupHandleScoringConfig;
}): CupHandleFactorScores {
  const config = input.config ?? DEFAULT_CUP_HANDLE_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.chInput.cupHandle;

  const patternIntegrity = d.detected
    ? clamp((d.cupQuality + d.handleQuality) / 2, 40, 100)
    : 25;
  const breakoutStrength = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 50, 100)
    : 25;
  const institutionalParticipation =
    d.volumeConfirmed && d.handleValid ? 85 : d.volumeConfirmed ? 70 : 30;
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
    breakoutStrength,
    institutionalParticipation,
    volumeConfirmation,
    relativeStrength,
    breadth,
    marketRegime,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: CupHandleConvictionWeights): number {
  return (
    weights.patternIntegrity +
    weights.breakoutStrength +
    weights.institutionalParticipation +
    weights.volumeConfirmation +
    weights.relativeStrength +
    weights.breadth +
    weights.marketRegime +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateCupHandleConviction(
  factors: CupHandleFactorScores,
  config: CupHandleScoringConfig = DEFAULT_CUP_HANDLE_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.patternIntegrity * w.patternIntegrity +
      factors.breakoutStrength * w.breakoutStrength +
      factors.institutionalParticipation * w.institutionalParticipation +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.relativeStrength * w.relativeStrength +
      factors.breadth * w.breadth +
      factors.marketRegime * w.marketRegime +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateCupHandleSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: CupHandleScoringConfig;
}): CupHandleSignalGrade {
  const config = input.config ?? DEFAULT_CUP_HANDLE_SCORING_CONFIG;
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
  return classifyCupHandleSignalGrade(composite, config);
}

export function buildCupHandleInstitutionalScore(input: {
  detection: CupHandleDetection;
  setup: Pick<
    CupHandleTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  chInput: CupHandleStrategyInput;
  config?: CupHandleScoringConfig;
}): CupHandleInstitutionalScore {
  try {
    const config = resolveCupHandleScoringConfig(input.config);
    const factors = scoreCupHandleConvictionFactors({ ...input, config });
    let conviction = calculateCupHandleConviction(factors, config);
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyCupHandleConvictionGrade(conviction, config),
      signalGrade: calculateCupHandleSignalGrade({
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
