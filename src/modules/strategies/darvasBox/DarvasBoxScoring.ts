/**
 * Darvas Box Institutional Scoring — Sprint 11B.3N.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  DarvasBoxDetection,
  DarvasBoxStrategyInput,
} from "./DarvasBoxTypes";
import type { DarvasBoxTradeSetup } from "./DarvasBoxTradeTypes";

export type DarvasBoxConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type DarvasBoxSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface DarvasBoxInstitutionalScore {
  conviction: number;
  grade: DarvasBoxConvictionGrade;
  signalGrade: DarvasBoxSignalGrade;
  confidence: number;
}

export interface DarvasBoxConvictionWeights {
  readonly breakoutStrength: number;
  readonly volumeConfirmation: number;
  readonly patternIntegrity: number;
  readonly relativeStrength: number;
  readonly institutionalParticipation: number;
  readonly breadth: number;
  readonly vwapAlignment: number;
  readonly riskReward: number;
  readonly liquidity: number;
}

export interface DarvasBoxScoringConfig {
  readonly weights: DarvasBoxConvictionWeights;
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

export const DEFAULT_DARVAS_BOX_CONVICTION_WEIGHTS: DarvasBoxConvictionWeights =
  {
    breakoutStrength: 0.2,
    volumeConfirmation: 0.2,
    patternIntegrity: 0.15,
    relativeStrength: 0.1,
    institutionalParticipation: 0.1,
    breadth: 0.1,
    vwapAlignment: 0.05,
    riskReward: 0.05,
    liquidity: 0.05,
  };

export const DEFAULT_DARVAS_BOX_SCORING_CONFIG: DarvasBoxScoringConfig = {
  weights: DEFAULT_DARVAS_BOX_CONVICTION_WEIGHTS,
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

export function resolveDarvasBoxScoringConfig(
  partial?: Partial<DarvasBoxScoringConfig> & {
    weights?: Partial<DarvasBoxConvictionWeights>;
    signalGrade?: Partial<DarvasBoxScoringConfig["signalGrade"]>;
    signalBlend?: Partial<DarvasBoxScoringConfig["signalBlend"]>;
  }
): DarvasBoxScoringConfig {
  return {
    ...DEFAULT_DARVAS_BOX_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_DARVAS_BOX_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_DARVAS_BOX_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_DARVAS_BOX_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyDarvasBoxConvictionGrade(
  conviction: number,
  config: DarvasBoxScoringConfig = DEFAULT_DARVAS_BOX_SCORING_CONFIG
): DarvasBoxConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyDarvasBoxSignalGrade(
  composite: number,
  config: DarvasBoxScoringConfig = DEFAULT_DARVAS_BOX_SCORING_CONFIG
): DarvasBoxSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface DarvasBoxFactorScores {
  breakoutStrength: number;
  volumeConfirmation: number;
  patternIntegrity: number;
  relativeStrength: number;
  institutionalParticipation: number;
  breadth: number;
  vwapAlignment: number;
  riskReward: number;
  liquidity: number;
}

export function scoreDarvasBoxConvictionFactors(input: {
  detection: DarvasBoxDetection;
  setup: Pick<
    DarvasBoxTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  dbInput: DarvasBoxStrategyInput;
  config?: DarvasBoxScoringConfig;
}): DarvasBoxFactorScores {
  const config = input.config ?? DEFAULT_DARVAS_BOX_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.dbInput.darvasBox;

  const breakoutStrength = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 50, 100)
    : 25;

  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 50, 100)
    : 25;

  const patternIntegrity = d.detected
    ? clamp(d.boxQuality, 40, 100)
    : 25;

  const relativeStrength = d.rsConfirmed
    ? clamp(payload.relativeStrength ?? 60, 40, 100)
    : 25;

  const institutionalParticipation =
    d.volumeConfirmed && d.failedBreakoutAttempts >= 1 ? 85 : d.volumeConfirmed ? 70 : 30;

  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);

  let vwapAlignment = 40;
  if (d.detected && Number.isFinite(d.vwap) && d.vwap > 0) {
    vwapAlignment = input.setup.entry >= d.vwap ? 85 : 35;
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
    breakoutStrength,
    volumeConfirmation,
    patternIntegrity,
    relativeStrength,
    institutionalParticipation,
    breadth,
    vwapAlignment,
    riskReward,
    liquidity,
  };
}

function weightSum(weights: DarvasBoxConvictionWeights): number {
  return (
    weights.breakoutStrength +
    weights.volumeConfirmation +
    weights.patternIntegrity +
    weights.relativeStrength +
    weights.institutionalParticipation +
    weights.breadth +
    weights.vwapAlignment +
    weights.riskReward +
    weights.liquidity
  );
}

export function calculateDarvasBoxConviction(
  factors: DarvasBoxFactorScores,
  config: DarvasBoxScoringConfig = DEFAULT_DARVAS_BOX_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.breakoutStrength * w.breakoutStrength +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.patternIntegrity * w.patternIntegrity +
      factors.relativeStrength * w.relativeStrength +
      factors.institutionalParticipation * w.institutionalParticipation +
      factors.breadth * w.breadth +
      factors.vwapAlignment * w.vwapAlignment +
      factors.riskReward * w.riskReward +
      factors.liquidity * w.liquidity) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateDarvasBoxSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: DarvasBoxScoringConfig;
}): DarvasBoxSignalGrade {
  const config = input.config ?? DEFAULT_DARVAS_BOX_SCORING_CONFIG;
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
  return classifyDarvasBoxSignalGrade(composite, config);
}

export function buildDarvasBoxInstitutionalScore(input: {
  detection: DarvasBoxDetection;
  setup: Pick<
    DarvasBoxTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  dbInput: DarvasBoxStrategyInput;
  config?: DarvasBoxScoringConfig;
}): DarvasBoxInstitutionalScore {
  try {
    const config = resolveDarvasBoxScoringConfig(input.config);
    const factors = scoreDarvasBoxConvictionFactors({ ...input, config });
    let conviction = calculateDarvasBoxConviction(factors, config);
    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    return {
      conviction,
      grade: classifyDarvasBoxConvictionGrade(conviction, config),
      signalGrade: calculateDarvasBoxSignalGrade({
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
