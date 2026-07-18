/**
 * Magic Formula Institutional Scoring — Sprint 11B.3X.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { MagicFormulaDetection } from "./MagicFormulaTypes";

export type MagicFormulaConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type MagicFormulaSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface MagicFormulaInstitutionalScore {
  conviction: number;
  grade: MagicFormulaConvictionGrade;
  signalGrade: MagicFormulaSignalGrade;
  confidence: number;
}

export interface MagicFormulaConvictionWeights {
  readonly compositeRank: number;
  readonly rocQuality: number;
  readonly earningsYield: number;
  readonly financialStrength: number;
  readonly cashFlowQuality: number;
  readonly governance: number;
  readonly institutionalOwnership: number;
}

export interface MagicFormulaScoringConfig {
  readonly weights: MagicFormulaConvictionWeights;
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

export const DEFAULT_MAGIC_FORMULA_CONVICTION_WEIGHTS: MagicFormulaConvictionWeights =
  {
    compositeRank: 0.25,
    rocQuality: 0.2,
    earningsYield: 0.2,
    financialStrength: 0.15,
    cashFlowQuality: 0.1,
    governance: 0.05,
    institutionalOwnership: 0.05,
  };

export const DEFAULT_MAGIC_FORMULA_SCORING_CONFIG: MagicFormulaScoringConfig = {
  weights: DEFAULT_MAGIC_FORMULA_CONVICTION_WEIGHTS,
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

export function resolveMagicFormulaScoringConfig(
  partial?: Partial<MagicFormulaScoringConfig> & {
    weights?: Partial<MagicFormulaConvictionWeights>;
    signalGrade?: Partial<MagicFormulaScoringConfig["signalGrade"]>;
  }
): MagicFormulaScoringConfig {
  return {
    ...DEFAULT_MAGIC_FORMULA_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_MAGIC_FORMULA_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_MAGIC_FORMULA_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
  };
}

export function classifyMagicFormulaConvictionGrade(
  conviction: number,
  config: MagicFormulaScoringConfig = DEFAULT_MAGIC_FORMULA_SCORING_CONFIG
): MagicFormulaConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyMagicFormulaSignalGrade(
  composite: number,
  config: MagicFormulaScoringConfig = DEFAULT_MAGIC_FORMULA_SCORING_CONFIG
): MagicFormulaSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface MagicFormulaFactorScores {
  compositeRank: number;
  rocQuality: number;
  earningsYield: number;
  financialStrength: number;
  cashFlowQuality: number;
  governance: number;
  institutionalOwnership: number;
}

export function scoreMagicFormulaConvictionFactors(input: {
  detection: MagicFormulaDetection;
  governanceScore: number;
  institutionalHolding: number;
}): MagicFormulaFactorScores {
  const d = input.detection;
  return {
    compositeRank: clamp(d.ranking.score, 0, 100),
    rocQuality: clamp(d.roc.score, 0, 100),
    earningsYield: clamp(d.earningsYield.score, 0, 100),
    financialStrength: clamp(d.financial.score, 0, 100),
    cashFlowQuality: clamp(d.financial.cashFlowQuality, 0, 100),
    governance: clamp(input.governanceScore, 0, 100),
    institutionalOwnership: clamp(input.institutionalHolding * 200, 0, 100),
  };
}

export function calculateMagicFormulaConviction(
  factors: MagicFormulaFactorScores,
  config: MagicFormulaScoringConfig = DEFAULT_MAGIC_FORMULA_SCORING_CONFIG
): number {
  const w = config.weights;
  const total =
    w.compositeRank +
    w.rocQuality +
    w.earningsYield +
    w.financialStrength +
    w.cashFlowQuality +
    w.governance +
    w.institutionalOwnership;
  const composite =
    (factors.compositeRank * w.compositeRank +
      factors.rocQuality * w.rocQuality +
      factors.earningsYield * w.earningsYield +
      factors.financialStrength * w.financialStrength +
      factors.cashFlowQuality * w.cashFlowQuality +
      factors.governance * w.governance +
      factors.institutionalOwnership * w.institutionalOwnership) /
    Math.max(total, 0.0001);
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function buildMagicFormulaInstitutionalScore(input: {
  detection: MagicFormulaDetection;
  governanceScore: number;
  institutionalHolding: number;
  qualityScore: number;
  warnings?: string[];
  config?: MagicFormulaScoringConfig;
}): MagicFormulaInstitutionalScore {
  try {
    const config = resolveMagicFormulaScoringConfig(input.config);
    const factors = scoreMagicFormulaConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
      institutionalHolding: input.institutionalHolding,
    });
    let conviction = calculateMagicFormulaConviction(factors, config);
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
      grade: classifyMagicFormulaConvictionGrade(conviction, config),
      signalGrade: classifyMagicFormulaSignalGrade(composite, config),
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
