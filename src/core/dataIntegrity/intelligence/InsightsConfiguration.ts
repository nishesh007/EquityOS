/**
 * Institutional Validation Intelligence — configuration.
 * Sensitivity, thresholds, limits, and score weights live here; no magic numbers elsewhere.
 */

export type InsightsStrictMode = "strict" | "relaxed";

export interface InsightScoreWeights {
  patternQuality: number;
  correlationStrength: number;
  riskAccuracy: number;
  opportunityValue: number;
  recommendationConfidence: number;
  evidenceQuality: number;
}

export interface InsightsConfiguration {
  mode: InsightsStrictMode;
  engineVersion: string;
  patternSensitivity: number;
  correlationThreshold: number;
  recommendationLimit: number;
  confidenceThreshold: number;
  snapshotRetention: number;
  maxAuditEntries: number;
  maxPatterns: number;
  maxCorrelations: number;
  maxRiskInsights: number;
  maxOpportunities: number;
  failureSpikeMultiplier: number;
  trustDropThreshold: number;
  integrityDriftThreshold: number;
  runtimeBottleneckMs: number;
  scoreWeights: InsightScoreWeights;
}

export const DEFAULT_INSIGHTS_CONFIGURATION: InsightsConfiguration = {
  mode: "strict",
  engineVersion: "9F.21.0",
  patternSensitivity: 0.6,
  correlationThreshold: 0.5,
  recommendationLimit: 20,
  confidenceThreshold: 0.55,
  snapshotRetention: 100,
  maxAuditEntries: 500,
  maxPatterns: 50,
  maxCorrelations: 50,
  maxRiskInsights: 30,
  maxOpportunities: 30,
  failureSpikeMultiplier: 2,
  trustDropThreshold: 10,
  integrityDriftThreshold: 8,
  runtimeBottleneckMs: 200,
  scoreWeights: {
    patternQuality: 0.25,
    correlationStrength: 0.2,
    riskAccuracy: 0.2,
    opportunityValue: 0.15,
    recommendationConfidence: 0.1,
    evidenceQuality: 0.1,
  },
};

export type InsightsConfigurationInput = Partial<
  Omit<InsightsConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<InsightScoreWeights>;
};

export function resolveInsightsConfiguration(
  input?: InsightsConfigurationInput
): InsightsConfiguration {
  const base = DEFAULT_INSIGHTS_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    patternSensitivity: clamp(
      input?.patternSensitivity ?? base.patternSensitivity,
      0,
      1
    ),
    correlationThreshold: clamp(
      input?.correlationThreshold ?? base.correlationThreshold,
      0,
      1
    ),
    confidenceThreshold: clamp(
      input?.confidenceThreshold ?? base.confidenceThreshold,
      0,
      1
    ),
    recommendationLimit: Math.max(
      1,
      input?.recommendationLimit ?? base.recommendationLimit
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
