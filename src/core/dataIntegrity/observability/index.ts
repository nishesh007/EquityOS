/**
 * Institutional Validation Observability & Telemetry Engine — public exports (Prompt 9F.20).
 */

export {
  DEFAULT_TELEMETRY_CONFIGURATION,
  resolveTelemetryConfiguration,
} from "./TelemetryConfiguration";

export type {
  TelemetryStrictMode,
  TelemetryExportFormat,
  ObservabilityScoreWeights,
  TelemetryConfiguration,
  TelemetryConfigurationInput,
} from "./TelemetryConfiguration";

export {
  registerTelemetrySource,
  getRegisteredTelemetrySources,
  collectAllTelemetrySamples,
  resetTelemetrySourceRegistrationState,
} from "./TelemetryRegistry";

export type {
  TelemetrySourceId,
  TelemetrySample,
  TelemetrySourceCollector,
  TelemetrySourceDefinition,
} from "./TelemetryRegistry";

export { TelemetryCollector } from "./TelemetryCollector";
export type { TelemetryRecord } from "./TelemetryCollector";

export { MetricsCollector } from "./MetricsCollector";
export type { MetricsSnapshot } from "./MetricsCollector";

export { TraceCollector } from "./TraceCollector";
export type {
  TraceSpanInput,
  TraceSpan,
  DistributedTrace,
} from "./TraceCollector";

export { EventCollector } from "./EventCollector";
export type {
  ObservabilityEventType,
  ObservabilityEventInput,
  ObservabilityEvent,
} from "./EventCollector";

export { TelemetryAggregator } from "./TelemetryAggregator";
export type {
  ObservabilityScoreBreakdown,
  AggregatedTelemetry,
} from "./TelemetryAggregator";

export { TelemetryStorage } from "./TelemetryStorage";
export type { TelemetryStorageEntry } from "./TelemetryStorage";

export { TelemetryExporter } from "./TelemetryExporter";
export type {
  JsonTelemetryExport,
  CsvTelemetryExport,
  OpenTelemetryExport,
  PrometheusExport,
  TelemetryExportModel,
} from "./TelemetryExporter";

export { TelemetryMetricsTracker } from "./TelemetryMetrics";
export type { ObservabilityOperationalMetrics } from "./TelemetryMetrics";

export { TelemetryAuditLogger } from "./TelemetryAuditLogger";
export type {
  TelemetryAuditEvent,
  TelemetryAuditEntry,
} from "./TelemetryAuditLogger";

export {
  createTelemetrySnapshotId,
  compareTelemetrySnapshots,
  TelemetrySnapshotStore,
} from "./TelemetrySnapshot";

export type {
  TelemetrySnapshotPayload,
  TelemetrySnapshot,
  TelemetrySnapshotComparison,
} from "./TelemetrySnapshot";

export {
  ValidationObservabilityEngine,
  registerValidationObservabilityEngine,
  getValidationObservabilityEngine,
  resetValidationObservabilityEngine,
  registerBuiltinTelemetrySources,
  buildBuiltinTelemetrySources,
  collectTelemetry,
  collectMetrics,
  collectTrace,
  collectEvent,
  exportTelemetry,
  getObservabilityMetrics,
  createTelemetrySnapshot,
} from "./ValidationObservabilityEngine";

export type {
  CollectTelemetryOptions,
  TelemetryCollectionResult,
  ObservabilityRegistrationResult,
} from "./ValidationObservabilityEngine";
