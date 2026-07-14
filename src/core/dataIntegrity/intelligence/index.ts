/**
 * Institutional Validation Intelligence & Insights Engine — public exports (Prompt 9F.21).
 */

export {
  DEFAULT_INSIGHTS_CONFIGURATION,
  resolveInsightsConfiguration,
} from "./InsightsConfiguration";

export type {
  InsightsStrictMode,
  InsightScoreWeights,
  InsightsConfiguration,
  InsightsConfigurationInput,
} from "./InsightsConfiguration";

export {
  registerInsightSource,
  getRegisteredInsightSources,
  collectAllInsightObservations,
  resetInsightSourceRegistrationState,
} from "./InsightsRegistry";

export type {
  InsightSourceId,
  InsightObservation,
  InsightCollector,
  InsightSourceDefinition,
} from "./InsightsRegistry";

export { PatternDetector } from "./PatternDetector";
export type { PatternKind, DetectedPattern } from "./PatternDetector";

export { CorrelationEngine } from "./CorrelationEngine";
export type { CorrelationPair, CorrelationResult } from "./CorrelationEngine";

export { RiskInsightEngine } from "./RiskInsightEngine";
export type { RiskCategory, RiskInsight } from "./RiskInsightEngine";

export { OpportunityDetector } from "./OpportunityDetector";
export type {
  OpportunityKind,
  DetectedOpportunity,
} from "./OpportunityDetector";

export { RecommendationGenerator } from "./RecommendationGenerator";
export type {
  RecommendationCategory,
  IntelligentRecommendation,
} from "./RecommendationGenerator";

export { InsightScoring } from "./InsightScoring";
export type { InsightScoreBreakdown } from "./InsightScoring";

export { InsightsAggregator } from "./InsightsAggregator";
export type { InsightsPack } from "./InsightsAggregator";

export { InsightsAnalyzer } from "./InsightsAnalyzer";

export { InsightsMetricsTracker } from "./InsightsMetrics";
export type { InsightsOperationalMetrics } from "./InsightsMetrics";

export { InsightsAuditLogger } from "./InsightsAuditLogger";
export type {
  InsightsAuditEvent,
  InsightsAuditEntry,
} from "./InsightsAuditLogger";

export {
  createInsightSnapshotId,
  compareInsightSnapshots,
  buildSnapshotPayload,
  InsightSnapshotStore,
} from "./InsightSnapshot";

export type {
  InsightSnapshotPayload,
  InsightSnapshot,
  InsightSnapshotComparison,
} from "./InsightSnapshot";

export {
  ValidationIntelligenceEngine,
  registerValidationIntelligenceEngine,
  getValidationIntelligenceEngine,
  resetValidationIntelligenceEngine,
  registerBuiltinInsightSources,
  buildBuiltinInsightSources,
  generateInsights,
  detectPatterns,
  analyzeCorrelations,
  generateRecommendations,
  getRiskInsights,
  getInsightMetrics,
  createInsightSnapshot,
} from "./ValidationIntelligenceEngine";

export type {
  GenerateInsightsOptions,
  IntelligenceRegistrationResult,
} from "./ValidationIntelligenceEngine";
