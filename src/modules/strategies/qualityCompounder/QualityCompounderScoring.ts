/**
 * Quality Compounder Institutional Scoring — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderDetection } from "./QualityCompounderTypes";

export type QualityCompounderConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type QualityCompounderSignalGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "F";

export interface QualityCompounderInstitutionalScore {
  conviction: number;
  grade: QualityCompounderConvictionGrade;
  signalGrade: QualityCompounderSignalGrade;
  confidence: number;
}

export interface QualityCompounderConvictionWeights {
  readonly businessPredictability: number;
  readonly moatStrength: number;
  readonly capitalAllocation: number;
  readonly financialStrength: number;
  readonly managementQuality: number;
  readonly cashFlowQuality: number;
  readonly governance: number;
  readonly institutionalOwnership: number;
}

export interface QualityCompounderScoringConfig {
  readonly weights: QualityCompounderConvictionWeights;
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

export const DEFAULT_QUALITY_COMPOUNDER_CONVICTION_WEIGHTS: QualityCompounderConvictionWeights =
  {
    businessPredictability: 0.2,
    moatStrength: 0.2,
    capitalAllocation: 0.15,
    financialStrength: 0.15,
    managementQuality: 0.1,
    cashFlowQuality: 0.1,
    governance: 0.05,
    institutionalOwnership: 0.05,
  };

export const DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG: QualityCompounderScoringConfig =
  {
    weights: DEFAULT_QUALITY_COMPOUNDER_CONVICTION_WEIGHTS,
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

export function resolveQualityCompounderScoringConfig(
  partial?: Partial<QualityCompounderScoringConfig> & {
    weights?: Partial<QualityCompounderConvictionWeights>;
    signalGrade?: Partial<QualityCompounderScoringConfig["signalGrade"]>;
  }
): QualityCompounderScoringConfig {
  return {
    ...DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
  };
}

export function classifyQualityCompounderConvictionGrade(
  conviction: number,
  config: QualityCompounderScoringConfig = DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG
): QualityCompounderConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyQualityCompounderSignalGrade(
  composite: number,
  config: QualityCompounderScoringConfig = DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG
): QualityCompounderSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface QualityCompounderFactorScores {
  businessPredictability: number;
  moatStrength: number;
  capitalAllocation: number;
  financialStrength: number;
  managementQuality: number;
  cashFlowQuality: number;
  governance: number;
  institutionalOwnership: number;
}

export function scoreQualityCompounderConvictionFactors(input: {
  detection: QualityCompounderDetection;
  governanceScore: number;
  institutionalHolding: number;
}): QualityCompounderFactorScores {
  const d = input.detection;
  return {
    businessPredictability: clamp(d.business.predictability, 0, 100),
    moatStrength: clamp(d.moat.score, 0, 100),
    capitalAllocation: clamp(d.capital.score, 0, 100),
    financialStrength: clamp(d.financial.score, 0, 100),
    managementQuality: clamp(d.management.score, 0, 100),
    cashFlowQuality: clamp(d.financial.cashFlowQuality, 0, 100),
    governance: clamp(input.governanceScore, 0, 100),
    institutionalOwnership: clamp(input.institutionalHolding * 200, 0, 100),
  };
}

export function calculateQualityCompounderConviction(
  factors: QualityCompounderFactorScores,
  config: QualityCompounderScoringConfig = DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG
): number {
  const w = config.weights;
  const total =
    w.businessPredictability +
    w.moatStrength +
    w.capitalAllocation +
    w.financialStrength +
    w.managementQuality +
    w.cashFlowQuality +
    w.governance +
    w.institutionalOwnership;
  const composite =
    (factors.businessPredictability * w.businessPredictability +
      factors.moatStrength * w.moatStrength +
      factors.capitalAllocation * w.capitalAllocation +
      factors.financialStrength * w.financialStrength +
      factors.managementQuality * w.managementQuality +
      factors.cashFlowQuality * w.cashFlowQuality +
      factors.governance * w.governance +
      factors.institutionalOwnership * w.institutionalOwnership) /
    Math.max(total, 0.0001);
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function buildQualityCompounderInstitutionalScore(input: {
  detection: QualityCompounderDetection;
  governanceScore: number;
  institutionalHolding: number;
  qualityScore: number;
  warnings?: string[];
  config?: QualityCompounderScoringConfig;
}): QualityCompounderInstitutionalScore {
  try {
    const config = resolveQualityCompounderScoringConfig(input.config);
    const factors = scoreQualityCompounderConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
      institutionalHolding: input.institutionalHolding,
    });
    let conviction = calculateQualityCompounderConviction(factors, config);
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
      grade: classifyQualityCompounderConvictionGrade(conviction, config),
      signalGrade: classifyQualityCompounderSignalGrade(composite, config),
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
