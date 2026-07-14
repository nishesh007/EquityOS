/**
 * Institutional Validation Learning — configuration.
 * Mode, feedback weighting, sensitivity, retention, and score weights live here.
 */

export type LearningMode =
  | "passive"
  | "active"
  | "institutional"
  | "research";

export type LearningStrictMode = "strict" | "relaxed";

export interface FeedbackWeightMap {
  manual: number;
  analyst: number;
  reviewer: number;
  compliance: number;
  operational: number;
  system: number;
}

export interface LearningScoreWeights {
  patternCoverage: number;
  feedbackCoverage: number;
  trendDetection: number;
  recommendationQuality: number;
  regressionLearning: number;
  auditCompleteness: number;
}

export interface LearningConfiguration {
  mode: LearningStrictMode;
  engineVersion: string;
  learningMode: LearningMode;
  patternSensitivity: number;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxFeedbackRecords: number;
  maxPatterns: number;
  maxImprovements: number;
  institutionalMode: boolean;
  advisoryOnly: boolean;
  feedbackWeights: FeedbackWeightMap;
  scoreWeights: LearningScoreWeights;
}

export const DEFAULT_LEARNING_CONFIGURATION: LearningConfiguration = {
  mode: "strict",
  engineVersion: "9F.29.0",
  learningMode: "institutional",
  patternSensitivity: 0.55,
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxFeedbackRecords: 2_000,
  maxPatterns: 500,
  maxImprovements: 500,
  institutionalMode: true,
  advisoryOnly: true,
  feedbackWeights: {
    manual: 1,
    analyst: 1.2,
    reviewer: 1.3,
    compliance: 1.5,
    operational: 1.1,
    system: 0.8,
  },
  scoreWeights: {
    patternCoverage: 0.25,
    feedbackCoverage: 0.2,
    trendDetection: 0.2,
    recommendationQuality: 0.15,
    regressionLearning: 0.1,
    auditCompleteness: 0.1,
  },
};

export type LearningConfigurationInput = Partial<
  Omit<LearningConfiguration, "scoreWeights" | "feedbackWeights">
> & {
  scoreWeights?: Partial<LearningScoreWeights>;
  feedbackWeights?: Partial<FeedbackWeightMap>;
};

export function resolveLearningConfiguration(
  input?: LearningConfigurationInput
): LearningConfiguration {
  const base = DEFAULT_LEARNING_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    feedbackWeights: {
      ...base.feedbackWeights,
      ...input?.feedbackWeights,
    },
    patternSensitivity: clamp(
      input?.patternSensitivity ?? base.patternSensitivity,
      0.05,
      1
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxFeedbackRecords: Math.max(
      1,
      input?.maxFeedbackRecords ?? base.maxFeedbackRecords
    ),
    maxPatterns: Math.max(1, input?.maxPatterns ?? base.maxPatterns),
    maxImprovements: Math.max(
      1,
      input?.maxImprovements ?? base.maxImprovements
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
