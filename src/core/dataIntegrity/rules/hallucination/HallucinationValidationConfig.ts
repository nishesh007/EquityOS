/**
 * Institutional AI Hallucination Detection — configuration.
 * All thresholds are configurable; no hardcoded magic numbers in rules.
 */

export type HallucinationMode = "strict" | "relaxed";

export interface HallucinationValidationConfig {
  mode: HallucinationMode;
  /**
   * Minimum Hallucination Risk Score (0–100).
   * Higher = lower hallucination risk.
   * Below this threshold → reject (High Hallucination Risk).
   */
  minHallucinationScore: number;
  /** Minimum evidence support score / coverage required. */
  evidenceThreshold: number;
  /** Confidence must not exceed this without strong evidence. */
  confidenceThreshold: number;
  /** Inflated confidence above this is rejected when evidence is weak. */
  inflatedConfidenceThreshold: number;
  /** Minimum historical consistency score. */
  historicalConsistencyThreshold: number;
  /** Maximum allowed numeric deviation (%) vs validated evidence. */
  maxNumericDeviationPercent: number;
  /** Minimum reasoning quality component score. */
  minReasoningQuality: number;
  /** Minimum fact accuracy component score. */
  minFactAccuracy: number;
  /** Reject when unsupported claim count exceeds this. */
  maxUnsupportedClaims: number;
  /** Reject when contradiction count exceeds this. */
  maxContradictions: number;
  /** Required AI output sections in strict mode. */
  requiredSections: string[];
  scoreWeights: {
    factAccuracy: number;
    evidenceSupport: number;
    reasoningQuality: number;
    numericalAccuracy: number;
    historicalConsistency: number;
    marketContext: number;
  };
  scoreBands: {
    institutionalGrade: number;
    excellent: number;
    acceptable: number;
  };
}

export const DEFAULT_HALLUCINATION_VALIDATION_CONFIG: HallucinationValidationConfig =
  {
    mode: "strict",
    minHallucinationScore: 80,
    evidenceThreshold: 60,
    confidenceThreshold: 85,
    inflatedConfidenceThreshold: 95,
    historicalConsistencyThreshold: 50,
    maxNumericDeviationPercent: 5,
    minReasoningQuality: 50,
    minFactAccuracy: 55,
    maxUnsupportedClaims: 0,
    maxContradictions: 0,
    requiredSections: [
      "summary",
      "keyFindings",
      "bullCase",
      "bearCase",
      "risks",
      "catalysts",
      "conclusion",
      "recommendation",
    ],
    scoreWeights: {
      factAccuracy: 0.3,
      evidenceSupport: 0.2,
      reasoningQuality: 0.2,
      numericalAccuracy: 0.15,
      historicalConsistency: 0.1,
      marketContext: 0.05,
    },
    scoreBands: {
      institutionalGrade: 95,
      excellent: 90,
      acceptable: 80,
    },
  };

export type HallucinationValidationConfigInput =
  Partial<HallucinationValidationConfig> & {
    scoreWeights?: Partial<HallucinationValidationConfig["scoreWeights"]>;
    scoreBands?: Partial<HallucinationValidationConfig["scoreBands"]>;
    requiredSections?: string[];
  };

export function resolveHallucinationConfig(
  input?: HallucinationValidationConfigInput
): HallucinationValidationConfig {
  return {
    ...DEFAULT_HALLUCINATION_VALIDATION_CONFIG,
    ...input,
    scoreWeights: {
      ...DEFAULT_HALLUCINATION_VALIDATION_CONFIG.scoreWeights,
      ...(input?.scoreWeights ?? {}),
    },
    scoreBands: {
      ...DEFAULT_HALLUCINATION_VALIDATION_CONFIG.scoreBands,
      ...(input?.scoreBands ?? {}),
    },
    requiredSections:
      input?.requiredSections ??
      DEFAULT_HALLUCINATION_VALIDATION_CONFIG.requiredSections,
  };
}

export type HallucinationScoreBand =
  | "INSTITUTIONAL_GRADE"
  | "EXCELLENT"
  | "ACCEPTABLE"
  | "HIGH_HALLUCINATION_RISK";

export function resolveHallucinationScoreBand(
  score: number,
  bands: HallucinationValidationConfig["scoreBands"] = DEFAULT_HALLUCINATION_VALIDATION_CONFIG.scoreBands
): HallucinationScoreBand {
  if (score >= bands.institutionalGrade) return "INSTITUTIONAL_GRADE";
  if (score >= bands.excellent) return "EXCELLENT";
  if (score >= bands.acceptable) return "ACCEPTABLE";
  return "HIGH_HALLUCINATION_RISK";
}
