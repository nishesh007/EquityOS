/**
 * Institutional Intelligence Pack v1 — shared types.
 * Additive layer — does not mutate Published SSOT / Quality Gate / paper schema.
 */

export type InstitutionalConfidenceBand =
  | "Very Low"
  | "Low"
  | "Medium"
  | "High"
  | "Very High";

export type InstitutionalRiskLevel =
  | "Conservative"
  | "Moderate"
  | "Aggressive"
  | "Speculative";

export interface IntelligenceFactor {
  label: string;
  score: number;
  direction: "positive" | "negative" | "neutral";
  detail?: string;
}

export interface ExplainabilityPayload {
  topPositiveFactors: IntelligenceFactor[];
  topNegativeFactors: IntelligenceFactor[];
  historicalProbability: number;
  expectedHoldingPeriodDays: number;
  expectedDrawdown: number;
  expectedMfe: number;
  expectedMae: number;
  probabilityTarget1: number;
  probabilityStopLoss: number;
}

export interface ConfidenceAssessment {
  band: InstitutionalConfidenceBand;
  confidenceScore: number;
  factors: IntelligenceFactor[];
  rationale: string[];
}
