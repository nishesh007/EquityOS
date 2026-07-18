/**
 * Graham Institutional Scoring — Sprint 11B.3V.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { GrahamDetection } from "./GrahamTypes";

export type GrahamConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type GrahamSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface GrahamInstitutionalScore {
  conviction: number;
  grade: GrahamConvictionGrade;
  signalGrade: GrahamSignalGrade;
  confidence: number;
}

export interface GrahamConvictionWeights {
  readonly marginOfSafety: number;
  readonly financialStability: number;
  readonly intrinsicValueConfidence: number;
  readonly cashFlow: number;
  readonly debtProfile: number;
  readonly governance: number;
  readonly earningsStability: number;
}

export interface GrahamScoringConfig {
  readonly weights: GrahamConvictionWeights;
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

export const DEFAULT_GRAHAM_CONVICTION_WEIGHTS: GrahamConvictionWeights = {
  marginOfSafety: 0.25,
  financialStability: 0.2,
  intrinsicValueConfidence: 0.15,
  cashFlow: 0.1,
  debtProfile: 0.1,
  governance: 0.1,
  earningsStability: 0.1,
};

export const DEFAULT_GRAHAM_SCORING_CONFIG: GrahamScoringConfig = {
  weights: DEFAULT_GRAHAM_CONVICTION_WEIGHTS,
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

export function resolveGrahamScoringConfig(
  partial?: Partial<GrahamScoringConfig> & {
    weights?: Partial<GrahamConvictionWeights>;
    signalGrade?: Partial<GrahamScoringConfig["signalGrade"]>;
  }
): GrahamScoringConfig {
  return {
    ...DEFAULT_GRAHAM_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_GRAHAM_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_GRAHAM_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
  };
}

export function classifyGrahamConvictionGrade(
  conviction: number,
  config: GrahamScoringConfig = DEFAULT_GRAHAM_SCORING_CONFIG
): GrahamConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyGrahamSignalGrade(
  composite: number,
  config: GrahamScoringConfig = DEFAULT_GRAHAM_SCORING_CONFIG
): GrahamSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface GrahamFactorScores {
  marginOfSafety: number;
  financialStability: number;
  intrinsicValueConfidence: number;
  cashFlow: number;
  debtProfile: number;
  governance: number;
  earningsStability: number;
}

export function scoreGrahamConvictionFactors(input: {
  detection: GrahamDetection;
  governanceScore: number;
  config?: GrahamScoringConfig;
}): GrahamFactorScores {
  const d = input.detection;
  return {
    marginOfSafety: clamp(d.marginSafety.score, 0, 100),
    financialStability: clamp(d.financial.score, 0, 100),
    intrinsicValueConfidence: clamp(d.intrinsic.confidence, 0, 100),
    cashFlow: clamp(d.financial.cashFlowQuality, 0, 100),
    debtProfile: clamp(d.balanceSheet.leverageScore, 0, 100),
    governance: clamp(input.governanceScore, 0, 100),
    earningsStability: clamp(d.financial.earningsStability, 0, 100),
  };
}

export function calculateGrahamConviction(
  factors: GrahamFactorScores,
  config: GrahamScoringConfig = DEFAULT_GRAHAM_SCORING_CONFIG
): number {
  const w = config.weights;
  const total =
    w.marginOfSafety +
    w.financialStability +
    w.intrinsicValueConfidence +
    w.cashFlow +
    w.debtProfile +
    w.governance +
    w.earningsStability;
  const composite =
    (factors.marginOfSafety * w.marginOfSafety +
      factors.financialStability * w.financialStability +
      factors.intrinsicValueConfidence * w.intrinsicValueConfidence +
      factors.cashFlow * w.cashFlow +
      factors.debtProfile * w.debtProfile +
      factors.governance * w.governance +
      factors.earningsStability * w.earningsStability) /
    Math.max(total, 0.0001);
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function buildGrahamInstitutionalScore(input: {
  detection: GrahamDetection;
  governanceScore: number;
  qualityScore: number;
  warnings?: string[];
  config?: GrahamScoringConfig;
}): GrahamInstitutionalScore {
  try {
    const config = resolveGrahamScoringConfig(input.config);
    const factors = scoreGrahamConvictionFactors({
      detection: input.detection,
      governanceScore: input.governanceScore,
      config,
    });
    let conviction = calculateGrahamConviction(factors, config);
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
      grade: classifyGrahamConvictionGrade(conviction, config),
      signalGrade: classifyGrahamSignalGrade(composite, config),
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
