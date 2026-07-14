/**
 * Institutional Validation AI Explainability & Decision Trace Engine — public exports (Prompt 9F.27).
 */

export {
  DEFAULT_EXPLAINABILITY_CONFIGURATION,
  resolveExplainabilityConfiguration,
} from "./ExplainabilityConfiguration";

export type {
  ExplanationStyle,
  TraceVerbosity,
  ExplainabilityStrictMode,
  ExplainabilityScoreWeights,
  ExplainabilityConfiguration,
  ExplainabilityConfigurationInput,
} from "./ExplainabilityConfiguration";

export {
  createExplainabilitySourceId,
  registerExplainabilitySource,
  getExplainabilitySource,
  listExplainabilitySources,
  resetExplainabilityRegistry,
} from "./ExplainabilityRegistry";

export type {
  ExplainabilitySourceKind,
  ExplainabilitySourceDefinition,
} from "./ExplainabilityRegistry";

export { DecisionTraceEngine } from "./DecisionTraceEngine";
export type {
  RuleExecutionStatus,
  TraceRuleEvent,
  DecisionTraceInput,
  DecisionTrace,
} from "./DecisionTraceEngine";

export { RuleContributionAnalyzer } from "./RuleContributionAnalyzer";
export type {
  RuleContribution,
  RuleContributionReport,
} from "./RuleContributionAnalyzer";

export { ConfidenceBreakdownEngine } from "./ConfidenceBreakdownEngine";
export type {
  ConfidenceBucket,
  ConfidenceBreakdown,
} from "./ConfidenceBreakdownEngine";

export { ExecutionPathAnalyzer } from "./ExecutionPathAnalyzer";
export type { ExecutionPathAnalysis } from "./ExecutionPathAnalyzer";

export { ExplanationGenerator } from "./ExplanationGenerator";
export type { GeneratedExplanation } from "./ExplanationGenerator";

export { DecisionTreeBuilder } from "./DecisionTreeBuilder";
export type {
  DecisionTreeKind,
  DecisionTreeNode,
  DecisionTreeModel,
} from "./DecisionTreeBuilder";

export { ExplainabilityMetricsTracker } from "./ExplainabilityMetrics";
export type {
  ExplainabilityHealthScore,
  ExplainabilityOperationalMetrics,
} from "./ExplainabilityMetrics";

export { ExplainabilityAuditLogger } from "./ExplainabilityAuditLogger";
export type {
  ExplainabilityAuditEvent,
  ExplainabilityAuditEntry,
} from "./ExplainabilityAuditLogger";

export {
  createExplainabilitySnapshotId,
  compareExplainabilitySnapshots,
  buildExplainabilitySnapshotPayload,
  ExplainabilitySnapshotStore,
} from "./ExplainabilitySnapshot";

export type {
  ExplainabilitySnapshotKind,
  ExplainabilitySnapshotPayload,
  ExplainabilitySnapshot,
  ExplainabilitySnapshotComparison,
} from "./ExplainabilitySnapshot";

export {
  ValidationExplainabilityEngine,
  registerExplainability,
  registerValidationExplainabilityEngine,
  getValidationExplainabilityEngine,
  resetValidationExplainabilityEngine,
  registerBuiltinExplainabilitySources,
  traceDecision,
  generateExplanation,
  analyzeRuleContribution,
  getConfidenceBreakdown,
  createExplainabilitySnapshot,
  getExplainabilityMetrics,
} from "./ValidationExplainabilityEngine";

export type {
  TraceDecisionOptions,
  TraceDecisionResult,
  ExplainabilityRegistrationResult,
} from "./ValidationExplainabilityEngine";
