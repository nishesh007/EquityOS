/**
 * Event collector — validation/runtime lifecycle events for observability.
 */

export type ObservabilityEventType =
  | "ValidationStarted"
  | "ValidationCompleted"
  | "ValidationFailed"
  | "RuleExecuted"
  | "RuleSkipped"
  | "RetryTriggered"
  | "TimeoutOccurred"
  | "RecoveryStarted"
  | "RecoveryCompleted"
  | "DashboardUpdated"
  | "AnalyticsGenerated"
  | "ReportGenerated"
  | "PolicyChanged"
  | "OptimizationSuggested"
  | (string & {});

export interface ObservabilityEventInput {
  eventType: ObservabilityEventType;
  module?: string;
  entityId?: string;
  severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  payload?: Record<string, unknown>;
  timestamp?: string;
}

export interface ObservabilityEvent {
  eventId: string;
  eventType: ObservabilityEventType;
  module: string;
  entityId?: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  payload: Record<string, unknown>;
  timestamp: string;
}

export class EventCollector {
  private readonly events: ObservabilityEvent[] = [];
  private dropped = 0;

  constructor(private maxEvents = 5_000) {}

  setMaxEvents(n: number): void {
    this.maxEvents = n;
  }

  collectEvent(input: ObservabilityEventInput): {
    event: ObservabilityEvent | null;
    dropped: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      if (this.events.length >= this.maxEvents) {
        this.events.shift();
        this.dropped += 1;
        warnings.push("Event buffer full; oldest event dropped.");
      }
      const event: ObservabilityEvent = {
        eventId: `oevt:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        eventType: input.eventType,
        module: input.module ?? "unknown",
        entityId: input.entityId,
        severity: input.severity ?? "INFO",
        payload: { ...(input.payload ?? {}) },
        timestamp: input.timestamp ?? new Date().toISOString(),
      };
      this.events.push(event);
      return { event, dropped: warnings.length > 0, warnings, errors };
    } catch (err) {
      this.dropped += 1;
      errors.push(`Event collection failed: ${String(err)}`);
      return { event: null, dropped: true, warnings, errors };
    }
  }

  getEvents(limit?: number): ObservabilityEvent[] {
    if (limit === undefined) return this.events.map(cloneEvent);
    return this.events.slice(-limit).map(cloneEvent);
  }

  getEventCount(): number {
    return this.events.length;
  }

  getDroppedCount(): number {
    return this.dropped;
  }

  reset(): void {
    this.events.length = 0;
    this.dropped = 0;
  }
}

function cloneEvent(event: ObservabilityEvent): ObservabilityEvent {
  return { ...event, payload: { ...event.payload } };
}
