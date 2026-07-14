/**
 * Institutional Validation Knowledge Graph — public exports (Prompt 9F.23).
 */

export {
  DEFAULT_KNOWLEDGE_CONFIGURATION,
  resolveKnowledgeConfiguration,
} from "./KnowledgeConfiguration";

export type {
  KnowledgeStrictMode,
  KnowledgeScoreWeights,
  KnowledgeRelationshipType,
  KnowledgeConfiguration,
  KnowledgeConfigurationInput,
} from "./KnowledgeConfiguration";

export {
  createKnowledgeNodeId,
  cloneKnowledgeNode,
} from "./KnowledgeNode";

export type { KnowledgeNodeKind, KnowledgeNode } from "./KnowledgeNode";

export {
  createKnowledgeEdgeId,
  cloneKnowledgeEdge,
} from "./KnowledgeEdge";

export type { KnowledgeEdge } from "./KnowledgeEdge";

export {
  registerKnowledgeSource,
  getRegisteredKnowledgeSources,
  collectAllKnowledgeFacts,
  resetKnowledgeSourceRegistrationState,
} from "./KnowledgeRegistry";

export type {
  KnowledgeSourceId,
  KnowledgeFactBundle,
  KnowledgeCollector,
  KnowledgeSourceDefinition,
} from "./KnowledgeRegistry";

export { KnowledgeGraph } from "./KnowledgeGraph";
export type {
  KnowledgeScoreBreakdown,
  KnowledgeGraphStats,
} from "./KnowledgeGraph";

export { DependencyGraph } from "./DependencyGraph";
export type {
  DependencyTreeNode,
  DependencyAnalysisResult,
} from "./DependencyGraph";

export { RelationshipAnalyzer } from "./RelationshipAnalyzer";
export type {
  RelationshipMatch,
  RelationshipAnalysisResult,
} from "./RelationshipAnalyzer";

export { ImpactAnalyzer } from "./ImpactAnalyzer";
export type {
  ImpactScope,
  ImpactHit,
  ImpactAnalysisResult,
} from "./ImpactAnalyzer";

export { KnowledgeQueries } from "./KnowledgeQueries";
export type {
  KnowledgeQueryKind,
  KnowledgeQuery,
  KnowledgeQueryResult,
  NodeGraphModel,
  DependencyTreeModel,
  HierarchyViewModel,
  ForceGraphModel,
  TimelineViewModel,
  NetworkGraphModel,
  VisualizationModels,
} from "./KnowledgeQueries";

export { KnowledgeMetricsTracker } from "./KnowledgeMetrics";
export type { KnowledgeOperationalMetrics } from "./KnowledgeMetrics";

export { KnowledgeAuditLogger } from "./KnowledgeAuditLogger";
export type {
  KnowledgeAuditEvent,
  KnowledgeAuditEntry,
} from "./KnowledgeAuditLogger";

export {
  createKnowledgeSnapshotId,
  compareKnowledgeSnapshots,
  buildKnowledgeSnapshotPayload,
  KnowledgeSnapshotStore,
} from "./KnowledgeSnapshot";

export type {
  KnowledgeSnapshotPayload,
  KnowledgeSnapshot,
  KnowledgeSnapshotComparison,
} from "./KnowledgeSnapshot";

export {
  ValidationKnowledgeGraph,
  registerValidationKnowledgeGraph,
  getValidationKnowledgeGraph,
  resetValidationKnowledgeGraph,
  registerBuiltinKnowledgeSources,
  buildBuiltinKnowledgeSources,
  buildKnowledgeGraph,
  queryGraph,
  analyzeDependencies,
  analyzeImpact,
  findRelationships,
  getKnowledgeMetrics,
  createKnowledgeSnapshot,
} from "./ValidationKnowledgeGraph";

export type {
  BuildKnowledgeGraphOptions,
  KnowledgeBuildResult,
  KnowledgeRegistrationResult,
} from "./ValidationKnowledgeGraph";
