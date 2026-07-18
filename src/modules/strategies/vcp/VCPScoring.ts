/**
 * VCP Institutional Scoring — Sprint 11B.3L.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { VCPDetection, VCPStrategyInput } from "./VCPTypes";
import type { VCPTradeSetup } from "./VCPTradeTypes";

export type VCPConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type VCPSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface VCPInstitutionalScore {
  conviction: number;
  grade: VCPConvictionGrade;
  signalGrade: VCPSignalGrade;
  confidence: number;
}

export interface VCPConvictionWeights {
  readonly patternIntegrity: number;
  readonly supplyDryUp: number;
  readonly breakoutStrength: number;
  readonly volumeConfirmation: number;
  readonly sectorLeadership: number;
  readonly breadth: number;
  readonly marketRegime: number;
  readonly riskReward: number;
  readonly dataQuality: number;
}

export interface VCPScoringConfig {
  readonly weights: VCPConvictionWeights;
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

export const DEFAULT_VCP_CONVICTION_WEIGHTS: VCPConvictionWeights = {
  patternIntegrity: 0.2,
  supplyDryUp: 0.2,
  breakoutStrength: 0.15,
  volumeConfirmation: 0.15,
  sectorLeadership: 0.1,
  breadth: 0.05,
  marketRegime: 0.05,
  riskReward: 0.05,
  dataQuality: 0.05,
};

export const DEFAULT_VCP_SCORING_CONFIG: VCPScoringConfig = {
  weights: DEFAULT_VCP_CONVICTION_WEIGHTS,
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

export function resolveVCPScoringConfig(
  partial?: Partial<VCPScoringConfig> & {
    weights?: Partial<VCPConvictionWeights>;
    signalGrade?: Partial<VCPScoringConfig["signalGrade"]>;
    signalBlend?: Partial<VCPScoringConfig["signalBlend"]>;
  }
): VCPScoringConfig {
  return {
    ...DEFAULT_VCP_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_VCP_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_VCP_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
    signalBlend: {
      ...DEFAULT_VCP_SCORING_CONFIG.signalBlend,
      ...partial?.signalBlend,
    },
  };
}

export function classifyVCPConvictionGrade(
  conviction: number,
  config: VCPScoringConfig = DEFAULT_VCP_SCORING_CONFIG
): VCPConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyVCPSignalGrade(
  composite: number,
  config: VCPScoringConfig = DEFAULT_VCP_SCORING_CONFIG
): VCPSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface VCPFactorScores {
  patternIntegrity: number;
  supplyDryUp: number;
  breakoutStrength: number;
  volumeConfirmation: number;
  sectorLeadership: number;
  breadth: number;
  marketRegime: number;
  riskReward: number;
  dataQuality: number;
}

export function scoreVCPConvictionFactors(input: {
  detection: VCPDetection;
  setup: Pick<
    VCPTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  vcpInput: VCPStrategyInput;
  config?: VCPScoringConfig;
}): VCPFactorScores {
  const config = input.config ?? DEFAULT_VCP_SCORING_CONFIG;
  const d = input.detection;
  const payload = input.vcpInput.vcp;

  const patternIntegrity = d.detected
    ? clamp(d.patternQuality, 30, 100)
    : 25;

  const supplyDryUp = d.volumeDryUp
    ? clamp(d.volumeDryUpScore, 50, 100)
    : 25;

  const breakoutStrength = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 50, 100)
    : 25;

  const volumeConfirmation =
    payload.relativeVolume !== null &&
    Number.isFinite(payload.relativeVolume) &&
    payload.relativeVolume >= 1.2
      ? clamp(60 + payload.relativeVolume * 15, 0, 100)
      : d.breakoutConfirmed
        ? 55
        : 25;

  const sectorLeadership = d.sectorConfirmed
    ? clamp(input.marketContext.marketStrength, 40, 100)
    : 25;

  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);

  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.confidence, 40, 100)
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

  const dataQuality =
    payload.candlesDaily.length >= 30 &&
    payload.ema150 !== null &&
    payload.ema200 !== null &&
    payload.atr !== null
      ? 88
      : 40;

  return {
    patternIntegrity,
    supplyDryUp,
    breakoutStrength,
    volumeConfirmation,
    sectorLeadership,
    breadth,
    marketRegime,
    riskReward,
    dataQuality,
  };
}

function weightSum(weights: VCPConvictionWeights): number {
  return (
    weights.patternIntegrity +
    weights.supplyDryUp +
    weights.breakoutStrength +
    weights.volumeConfirmation +
    weights.sectorLeadership +
    weights.breadth +
    weights.marketRegime +
    weights.riskReward +
    weights.dataQuality
  );
}

export function calculateVCPConviction(
  factors: VCPFactorScores,
  config: VCPScoringConfig = DEFAULT_VCP_SCORING_CONFIG
): number {
  const w = config.weights;
  const total = Math.max(weightSum(w), 0.0001);
  const composite =
    (factors.patternIntegrity * w.patternIntegrity +
      factors.supplyDryUp * w.supplyDryUp +
      factors.breakoutStrength * w.breakoutStrength +
      factors.volumeConfirmation * w.volumeConfirmation +
      factors.sectorLeadership * w.sectorLeadership +
      factors.breadth * w.breadth +
      factors.marketRegime * w.marketRegime +
      factors.riskReward * w.riskReward +
      factors.dataQuality * w.dataQuality) /
    total;
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function calculateVCPSignalGrade(input: {
  conviction: number;
  qualityScore: number;
  riskReward: number;
  marketStrength: number;
  config?: VCPScoringConfig;
}): VCPSignalGrade {
  const config = input.config ?? DEFAULT_VCP_SCORING_CONFIG;
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
  return classifyVCPSignalGrade(composite, config);
}

export function buildVCPInstitutionalScore(input: {
  detection: VCPDetection;
  setup: Pick<
    VCPTradeSetup,
    "entry" | "riskReward" | "qualityScore" | "warnings"
  >;
  marketContext: InstitutionalMarketContext;
  vcpInput: VCPStrategyInput;
  config?: VCPScoringConfig;
}): VCPInstitutionalScore {
  try {
    const config = resolveVCPScoringConfig(input.config);
    const factors = scoreVCPConvictionFactors({
      ...input,
      config,
    });
    let conviction = calculateVCPConviction(factors, config);

    if (input.setup.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.setup.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }

    return {
      conviction,
      grade: classifyVCPConvictionGrade(conviction, config),
      signalGrade: calculateVCPSignalGrade({
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
