/**
 * Buffett Institutional Scoring — Sprint 11B.3U.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { BuffettDetection } from "./BuffettTypes";
import type { BuffettInvestmentSetup } from "./BuffettTypes";

export type BuffettConvictionGrade =
  | "Exceptional"
  | "High"
  | "Good"
  | "Average"
  | "Weak";

export type BuffettSignalGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "F";

export interface BuffettInstitutionalScore {
  conviction: number;
  grade: BuffettConvictionGrade;
  signalGrade: BuffettSignalGrade;
  confidence: number;
}

export interface BuffettConvictionWeights {
  readonly moatStrength: number;
  readonly businessPredictability: number;
  readonly financialStrength: number;
  readonly managementQuality: number;
  readonly valuation: number;
  readonly cashFlowQuality: number;
  readonly governance: number;
  readonly institutionalOwnership: number;
}

export interface BuffettScoringConfig {
  readonly weights: BuffettConvictionWeights;
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

export const DEFAULT_BUFFETT_CONVICTION_WEIGHTS: BuffettConvictionWeights = {
  moatStrength: 0.2,
  businessPredictability: 0.2,
  financialStrength: 0.15,
  managementQuality: 0.15,
  valuation: 0.1,
  cashFlowQuality: 0.1,
  governance: 0.05,
  institutionalOwnership: 0.05,
};

export const DEFAULT_BUFFETT_SCORING_CONFIG: BuffettScoringConfig = {
  weights: DEFAULT_BUFFETT_CONVICTION_WEIGHTS,
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

export function resolveBuffettScoringConfig(
  partial?: Partial<BuffettScoringConfig> & {
    weights?: Partial<BuffettConvictionWeights>;
    signalGrade?: Partial<BuffettScoringConfig["signalGrade"]>;
  }
): BuffettScoringConfig {
  return {
    ...DEFAULT_BUFFETT_SCORING_CONFIG,
    ...partial,
    weights: {
      ...DEFAULT_BUFFETT_SCORING_CONFIG.weights,
      ...partial?.weights,
    },
    signalGrade: {
      ...DEFAULT_BUFFETT_SCORING_CONFIG.signalGrade,
      ...partial?.signalGrade,
    },
  };
}

export function classifyBuffettConvictionGrade(
  conviction: number,
  config: BuffettScoringConfig = DEFAULT_BUFFETT_SCORING_CONFIG
): BuffettConvictionGrade {
  if (conviction >= config.exceptionalMin) return "Exceptional";
  if (conviction >= config.highMin) return "High";
  if (conviction >= config.goodMin) return "Good";
  if (conviction >= config.averageMin) return "Average";
  return "Weak";
}

export function classifyBuffettSignalGrade(
  composite: number,
  config: BuffettScoringConfig = DEFAULT_BUFFETT_SCORING_CONFIG
): BuffettSignalGrade {
  const g = config.signalGrade;
  if (composite >= g.aPlusMin) return "A+";
  if (composite >= g.aMin) return "A";
  if (composite >= g.bPlusMin) return "B+";
  if (composite >= g.bMin) return "B";
  if (composite >= g.cMin) return "C";
  if (composite >= g.dMin) return "D";
  return "F";
}

export interface BuffettFactorScores {
  moatStrength: number;
  businessPredictability: number;
  financialStrength: number;
  managementQuality: number;
  valuation: number;
  cashFlowQuality: number;
  governance: number;
  institutionalOwnership: number;
}

export function scoreBuffettConvictionFactors(input: {
  detection: BuffettDetection;
  institutionalHolding: number;
  config?: BuffettScoringConfig;
}): BuffettFactorScores {
  const d = input.detection;
  return {
    moatStrength: clamp(d.moat.score, 0, 100),
    businessPredictability: clamp(d.business.predictability, 0, 100),
    financialStrength: clamp(d.financial.score, 0, 100),
    managementQuality: clamp(d.management.score, 0, 100),
    valuation: clamp(d.valuation.score, 0, 100),
    cashFlowQuality: clamp(d.business.cashFlowConsistency, 0, 100),
    governance: d.management.governanceRedFlags
      ? 25
      : clamp(d.management.corporateGovernance, 0, 100),
    institutionalOwnership: clamp(input.institutionalHolding * 200, 0, 100),
  };
}

export function calculateBuffettConviction(
  factors: BuffettFactorScores,
  config: BuffettScoringConfig = DEFAULT_BUFFETT_SCORING_CONFIG
): number {
  const w = config.weights;
  const total =
    w.moatStrength +
    w.businessPredictability +
    w.financialStrength +
    w.managementQuality +
    w.valuation +
    w.cashFlowQuality +
    w.governance +
    w.institutionalOwnership;
  const composite =
    (factors.moatStrength * w.moatStrength +
      factors.businessPredictability * w.businessPredictability +
      factors.financialStrength * w.financialStrength +
      factors.managementQuality * w.managementQuality +
      factors.valuation * w.valuation +
      factors.cashFlowQuality * w.cashFlowQuality +
      factors.governance * w.governance +
      factors.institutionalOwnership * w.institutionalOwnership) /
    Math.max(total, 0.0001);
  return clamp(round(composite, 1), config.scoreFloor, config.scoreCeiling);
}

export function buildBuffettInstitutionalScore(input: {
  detection: BuffettDetection;
  institutionalHolding: number;
  qualityScore: number;
  warnings?: string[];
  config?: BuffettScoringConfig;
}): BuffettInstitutionalScore {
  try {
    const config = resolveBuffettScoringConfig(input.config);
    const factors = scoreBuffettConvictionFactors({
      detection: input.detection,
      institutionalHolding: input.institutionalHolding,
      config,
    });
    let conviction = calculateBuffettConviction(factors, config);
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
      grade: classifyBuffettConvictionGrade(conviction, config),
      signalGrade: classifyBuffettSignalGrade(composite, config),
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

export type { BuffettInvestmentSetup };
