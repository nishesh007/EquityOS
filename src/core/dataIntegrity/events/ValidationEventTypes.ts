/**
 * Institutional Validation Event Bus — event type catalog and model.
 */

export type ValidationEventSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type ValidationEventType =
  | "ValidationStarted"
  | "ValidationCompleted"
  | "ValidationFailed"
  | "ValidationCancelled"
  | "PipelineStarted"
  | "PipelineCompleted"
  | "PipelineFailed"
  | "TrustScoreUpdated"
  | "IntegrityScoreUpdated"
  | "RecommendationValidated"
  | "TradeSetupValidated"
  | "HistoricalValidationUpdated"
  | "HallucinationDetected"
  | "CriticalFailure"
  | "WarningRaised"
  | "DashboardRefreshed"
  | "SnapshotCreated"
  | (string & {}); // Future custom events

export interface ValidationEvent<T = unknown> {
  eventId: string;
  timestamp: string;
  eventType: ValidationEventType;
  module: string;
  entityId?: string;
  validationId?: string;
  severity: ValidationEventSeverity;
  source: string;
  correlationId?: string;
  payload: T;
  executionTimeMs?: number;
  engineVersion: string;
}

export type ValidationEventInput<T = unknown> = Omit<
  ValidationEvent<T>,
  "eventId" | "timestamp" | "engineVersion" | "severity" | "source" | "module"
> & {
  eventId?: string;
  timestamp?: string;
  engineVersion?: string;
  severity?: ValidationEventSeverity;
  source?: string;
  module?: string;
};

export function createEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const BUILTIN_EVENT_TYPES: readonly ValidationEventType[] = [
  "ValidationStarted",
  "ValidationCompleted",
  "ValidationFailed",
  "ValidationCancelled",
  "PipelineStarted",
  "PipelineCompleted",
  "PipelineFailed",
  "TrustScoreUpdated",
  "IntegrityScoreUpdated",
  "RecommendationValidated",
  "TradeSetupValidated",
  "HistoricalValidationUpdated",
  "HallucinationDetected",
  "CriticalFailure",
  "WarningRaised",
  "DashboardRefreshed",
  "SnapshotCreated",
] as const;

export function defaultSeverityForType(
  type: ValidationEventType
): ValidationEventSeverity {
  switch (type) {
    case "CriticalFailure":
    case "ValidationFailed":
    case "PipelineFailed":
      return "CRITICAL";
    case "HallucinationDetected":
    case "WarningRaised":
      return "WARNING";
    case "ValidationCancelled":
      return "WARNING";
    default:
      return "INFO";
  }
}
