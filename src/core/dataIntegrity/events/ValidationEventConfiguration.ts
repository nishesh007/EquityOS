/**
 * Validation Event Bus configuration — no magic numbers elsewhere.
 */

import type { ValidationEventSeverity } from "./ValidationEventTypes";

export type EventDispatchMode =
  | "SEQUENTIAL"
  | "PARALLEL"
  | "ASYNC"
  | "PRIORITY_QUEUE"
  | "BUFFERED"
  | "IMMEDIATE";

export interface ValidationEventConfiguration {
  engineVersion: string;
  queueSize: number;
  replayBufferSize: number;
  /** Retention period for history in milliseconds. */
  retentionPeriodMs: number;
  /** Max retained history entries (in addition to time retention). */
  maxHistoryEntries: number;
  dispatchMode: EventDispatchMode;
  retryCount: number;
  retryDelayMs: number;
  timeoutMs: number;
  maxAuditEntries: number;
  maxSubscribers: number;
  /** Drop oldest when queue overflows if true; otherwise reject publish. */
  dropOnOverflow: boolean;
  healthCheckIntervalMs: number;
  severityPriority: Record<ValidationEventSeverity, number>;
}

export const DEFAULT_VALIDATION_EVENT_CONFIGURATION: ValidationEventConfiguration =
  {
    engineVersion: "9F.13.0",
    queueSize: 1_000,
    replayBufferSize: 500,
    retentionPeriodMs: 24 * 60 * 60 * 1000,
    maxHistoryEntries: 5_000,
    dispatchMode: "PARALLEL",
    retryCount: 2,
    retryDelayMs: 10,
    timeoutMs: 5_000,
    maxAuditEntries: 1_000,
    maxSubscribers: 500,
    dropOnOverflow: true,
    healthCheckIntervalMs: 30_000,
    severityPriority: {
      CRITICAL: 100,
      ERROR: 80,
      WARNING: 50,
      INFO: 10,
    },
  };

export type ValidationEventConfigurationInput = Partial<
  Omit<ValidationEventConfiguration, "severityPriority">
> & {
  severityPriority?: Partial<ValidationEventConfiguration["severityPriority"]>;
};

export function resolveValidationEventConfiguration(
  input?: ValidationEventConfigurationInput
): ValidationEventConfiguration {
  return {
    ...DEFAULT_VALIDATION_EVENT_CONFIGURATION,
    ...input,
    severityPriority: {
      ...DEFAULT_VALIDATION_EVENT_CONFIGURATION.severityPriority,
      ...(input?.severityPriority ?? {}),
    },
  };
}
