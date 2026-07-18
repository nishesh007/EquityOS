/**
 * Peter Lynch Institutional Scoring — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { PeterLynchDetection } from "./PeterLynchTypes";

export type PeterLynchConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type PeterLynchSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface PeterLynchInstitutionalScore {
  conviction: number;
  grade: PeterLynchConvictionGrade;
  signalGrade: PeterLynchSignalGrade;
  confidence: number;
}

export interface PeterLynchConvictionWeights {
  readonly growthConsistency: number;
  readonly pegQuality: number;
  readonly businessScalability: number;
  readonly financialStrength: number;
  readonly cashFlowQuality: number;
  readonly managementQuality: number;
  readonly governance: number;
  readonly institutionalOwnership: number;
}

export interface PeterLynchScoringConfig {
  readonly weights: PeterLynchConvictionWeights;
  readonly exceptionalMin: number;
  readonly highMin: number;
  readonly goodMin: number;
  readonly averageMin: number;
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
}

export const DEFAULT_PETER_LYNCH_CONVICTION_WEIGHTS: PeterLynchConvictionWeights =
  {
    growthConsistency: 0.2,
    pegQuality: 0.2,
    businessScalability: 0.15,
    financialStrength: 0.15,
    cashFlowQuality: 0.1,
    managementQuality: 0.1,
    governance: 0.05,
    institutionalOwnership: 0.05,
  };

export const DEFAULT_PETER_LYNCH_SCORING_CONFIG: PeterLynchScoringConfig = {
  weights: DEFAULT_PETER_LYNCH_CONVICTION_WEIGHTS,
  exceptionalMin: 95,
  highMin: 85,
  goodMin: 70,
  averageMin: 55,
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
};

export function resolvePeterLynchScoringConfig(
  partial?: Partial<PeterLynchScoringConfig> & {
    weights?: Partial<PeterLynchConvictionWeights>;
    signalGrade?: Partial<PeterLynchScoringConfig["signalGrade"]>;
  }
): PeterLynchScoringConfig {
  return {
    ...DEFAULT_PETER_LYNCH_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_PETER_LYNCH_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_PETER_LYNCH_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
  };
}

export function classifyPeterLynchConvictionGrade(
  conviction: number,
  config: PeterLynchScoringConfig = DEFAULT_PETER_LYNCH_SCORING_CONFIG
): PeterLynchConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyPeterLynchSignalGrade(
  composite: number,
  config: PeterLynchScoringConfig = DEFAULT_PETER_LYNCH_SCORING_CONFIG
): PeterLynchSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface PeterLynchFactorScores {
  growthConsistency: number;
  pegQuality: number;
  businessScalability: number;
  financialStrength: number;
  cashFlowQuality: number;
  managementQuality: number;
  governance: number;
  institutionalOwnership: number;
}

export function scorePeterLynchConvictionFactors(input: {
  detection: PeterLynchDetection;
  governanceScore: number;
  institutionalHolding: number;
  config?: PeterLynchScoringConfig;
}): PeterLynchFactorScores {
  const d = input.detection;
  return {
    growthConsistency: clamp(d.growth.growthConsistency, 0, 100),
    pegQuality: clamp(d.peg.score, 0, 100),
    businessScalability: clamp(d.business.scalableBusiness, 0, 100),
    financialStrength: clamp(d.financial.score, 0, 100),
    cashFlowQuality: clamp(d.financial.cashFlowQuality, 0, 100),
    managementQuality: clamp(d.business.score, 0, 100),
    governance: clamp(input.governanceScore, 0, 100),
    institutionalOwnership: clamp(input.institutionalHolding * 200, 0, 100),
  };
}

export function calculatePeterLynchConviction(
  factors: PeterLynchFactorScores,
  config: PeterLynchScoringConfig = DEFAULT_PETER_LYNCH_SCORING_CONFIG
): number {
  const w = config.weights;
  const total =
    w.growthConsistency +
    w.pegQuality +
    w.businessScalability +
    w.financialStrength +
    w.cashFlowQuality +
    w.managementQuality +
    w.governance +
    w.institutionalOwnership;
  const composite =
    (factors.growthConsistency * w.growthConsistency +
      factors.pegQuality * w.pegQuality +
      factors.businessScalability * w.businessScalability +
      factors.financialStrength * w.financialStrength +
      factors.cashFlowQuality * w.cashFlowQuality +
      factors.managementQuality * w.managementQuality +
      factors.governance * w.governance +
      factors.institutionalOwnership * w.institutionalOwnership) /
    Math.max(total, 0.0001);
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function buildPeterLynchInstitutionalScore(input: {
  detection: PeterLynchDetection;
  governanceScore: number;
  institutionalHolding: number;
  qualityScore: number;
  warnings?: string[];
  config?: PeterLynchScoringConfig;
}): PeterLynchInstitutionalScore {
  try {
    const config = resolvePeterLynchScoringConfig(input.config);
    const factors = scorePeterLynchConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
      institutionalHolding: input.institutionalHolding,
      config,
    });
    let conviction = calculatePeterLynchConviction(factors, config);
    if (input.warnings && input.warnings.length > 0) {
      conviction = clamp(
        conviction - Math.min(input.warnings.length * 2, 12),
        config.scoreFloor,
        config.scoreCeiling
      );
    }
    const composite = clamp(
      round(conviction * 0.6 + input.qualityScore * 0.4, 1),
      0,
      100
    );
    return {
      conviction,
      grade: classifyPeterLynchConvictionGrade(conviction, config),
      signalGrade: classifyPeterLynchSignalGrade(composite, config),
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
