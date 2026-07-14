/**
 * Institutional Validation Developer Tools & Diagnostics Engine — public exports (Prompt 9F.16).
 */

export {
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  resolveDiagnosticsConfiguration,
} from "./DiagnosticsConfiguration";

export type {
  DiagnosticsMode,
  DiagnosticsEnvironment,
  DiagnosticsStrictMode,
  DiagnosticsReportType,
  DiagnosticsConfiguration,
  DiagnosticsConfigurationInput,
  DiagnosticsHealthWeights,
} from "./DiagnosticsConfiguration";

export {
  registerDiagnosticsSource,
  getRegisteredDiagnosticsSources,
  collectAllDiagnosticsProbes,
  resetDiagnosticsSourceRegistrationState,
} from "./DiagnosticsRegistry";

export type {
  DiagnosticsSourceId,
  DiagnosticsProbe,
  DiagnosticsCollector,
  DiagnosticsSourceDefinition,
} from "./DiagnosticsRegistry";

export { DiagnosticsInspector } from "./DiagnosticsInspector";
export type {
  EngineInspectionRow,
  ModuleInspectionResult,
} from "./DiagnosticsInspector";

export { DiagnosticsRuleInspector } from "./DiagnosticsRuleInspector";
export type {
  RuleInspectionInput,
  RuleInspectionRow,
  RuleInspectionResult,
} from "./DiagnosticsRuleInspector";

export { DiagnosticsPipelineInspector } from "./DiagnosticsPipelineInspector";
export type {
  PipelineInspectionInput,
  PipelineInspectionRow,
  PipelineInspectionResult,
} from "./DiagnosticsPipelineInspector";

export { DiagnosticsProfiler } from "./DiagnosticsProfiler";
export type { ProfileSample, ProfileResult } from "./DiagnosticsProfiler";

export { DiagnosticsTracer } from "./DiagnosticsTracer";
export type { TraceInput, DiagnosticsTrace } from "./DiagnosticsTracer";

export { DiagnosticsHealthChecker } from "./DiagnosticsHealthChecker";
export type {
  DiagnosticsHealthBreakdown,
  DiagnosticsHealthResult,
} from "./DiagnosticsHealthChecker";

export {
  createDiagnosticsSnapshotId,
  compareDiagnosticsSnapshots,
  DiagnosticsSnapshotStore,
  buildSnapshotPayload,
} from "./DiagnosticsSnapshot";

export type {
  DiagnosticsSnapshotPayload,
  DiagnosticsSnapshot,
  DiagnosticsSnapshotComparison,
} from "./DiagnosticsSnapshot";

export { DiagnosticsMetricsTracker } from "./DiagnosticsMetrics";
export type { DiagnosticsOperationalMetrics } from "./DiagnosticsMetrics";

export { DiagnosticsAuditLogger } from "./DiagnosticsAuditLogger";
export type { DiagnosticsAuditEntry } from "./DiagnosticsAuditLogger";

export { DiagnosticsReportBuilder } from "./DiagnosticsReportBuilder";
export type { DiagnosticsReport } from "./DiagnosticsReportBuilder";

export {
  ValidationDiagnosticsEngine,
  registerValidationDiagnosticsEngine,
  getValidationDiagnosticsEngine,
  resetValidationDiagnosticsEngine,
  registerBuiltinDiagnosticsSources,
  buildBuiltinDiagnosticsSources,
  runDiagnostics,
  inspectRules,
  inspectPipeline,
  generateTrace,
  profileValidation,
  getDiagnosticsHealth,
  createDiagnosticsSnapshot,
  generateDiagnosticsReport,
} from "./ValidationDiagnosticsEngine";

export type {
  RunDiagnosticsOptions,
  DiagnosticsRunResult,
  DiagnosticsRegistrationResult,
} from "./ValidationDiagnosticsEngine";
