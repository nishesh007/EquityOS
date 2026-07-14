/**
 * Institutional Validation Learning, Feedback & Continuous Improvement Engine — public exports (Prompt 9F.29).
 */

export {
  DEFAULT_LEARNING_CONFIGURATION,
  resolveLearningConfiguration,
} from "./LearningConfiguration";

export type {
  LearningMode,
  LearningStrictMode,
  FeedbackWeightMap,
  LearningScoreWeights,
  LearningConfiguration,
  LearningConfigurationInput,
} from "./LearningConfiguration";

export {
  createLearningSourceId,
  registerLearningSource,
  getLearningSource,
  listLearningSources,
  resetLearningRegistry,
} from "./LearningRegistry";

export type {
  LearningSourceKind,
  LearningSignalKind,
  LearningSourceDefinition,
} from "./LearningRegistry";

export { FeedbackCollector } from "./FeedbackCollector";
export type {
  FeedbackSourceType,
  FeedbackSentiment,
  FeedbackRecord,
  CollectFeedbackInput,
} from "./FeedbackCollector";

export { PatternLearningEngine } from "./PatternLearningEngine";
export type {
  LearnedPatternKind,
  LearnedPattern,
  PatternLearningResult,
  PatternObservation,
} from "./PatternLearningEngine";

export { TrendLearning } from "./TrendLearning";
export type {
  TrendPoint,
  TrendLearningResult,
} from "./TrendLearning";

export { RegressionLearning } from "./RegressionLearning";
export type {
  RegressionLearningSignal,
  RegressionLearningResult,
} from "./RegressionLearning";

export { RecommendationLearning } from "./RecommendationLearning";
export type {
  RecommendationTheme,
  LearningRecommendation,
  RecommendationLearningResult,
} from "./RecommendationLearning";

export { ImprovementAnalyzer } from "./ImprovementAnalyzer";
export type {
  ImprovementCategory,
  ImprovementItem,
  ImprovementAnalysisResult,
} from "./ImprovementAnalyzer";

export { LearningPlanner } from "./LearningPlanner";
export type {
  LearningPlanItem,
  LearningPlan,
} from "./LearningPlanner";

export { LearningMetricsTracker } from "./LearningMetrics";
export type {
  LearningHealthScore,
  LearningOperationalMetrics,
} from "./LearningMetrics";

export { LearningAuditLogger } from "./LearningAuditLogger";
export type {
  LearningAuditEvent,
  LearningAuditEntry,
} from "./LearningAuditLogger";

export {
  createLearningSnapshotId,
  compareLearningSnapshots,
  buildLearningSnapshotPayload,
  LearningSnapshotStore,
} from "./LearningSnapshot";

export type {
  LearningSnapshotKind,
  LearningSnapshotPayload,
  LearningSnapshot,
  LearningSnapshotComparison,
} from "./LearningSnapshot";

export {
  ValidationLearningEngine,
  registerLearning,
  registerValidationLearningEngine,
  getValidationLearningEngine,
  resetValidationLearningEngine,
  registerBuiltinLearningSources,
  collectFeedback,
  analyzePatterns,
  generateImprovements,
  createLearningSnapshot,
  getLearningMetrics,
} from "./ValidationLearningEngine";

export type {
  AnalyzePatternsOptions,
  GenerateImprovementsOptions,
  LearningRunResult,
  LearningRegistrationResult,
} from "./ValidationLearningEngine";
