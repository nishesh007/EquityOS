/**
 * In-memory operational metrics for the Opportunity Engine scheduler.
 * Does not participate in scoring, ranking, or scan selection.
 */

export interface SchedulerLastError {
  message: string;
  at: string;
}

interface SchedulerObservabilityState {
  startedAtMs: number | null;
  lastError: SchedulerLastError | null;
  retryCount: number;
  lastPersistenceWrite: string | null;
  lastSuccessfulScanAt: string | null;
}

const observability: SchedulerObservabilityState = {
  startedAtMs: null,
  lastError: null,
  retryCount: 0,
  lastPersistenceWrite: null,
  lastSuccessfulScanAt: null,
};

export function markSchedulerStarted(now = Date.now()): void {
  observability.startedAtMs = now;
}

export function markSchedulerStopped(): void {
  observability.startedAtMs = null;
}

export function recordSchedulerSuccess(at = new Date().toISOString()): void {
  observability.lastError = null;
  observability.retryCount = 0;
  observability.lastSuccessfulScanAt = at;
}

export function recordSchedulerFailure(error: unknown, at = new Date().toISOString()): void {
  observability.retryCount += 1;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown scheduler error";
  observability.lastError = { message, at };
}

export function recordPersistenceWrite(at = new Date().toISOString()): void {
  observability.lastPersistenceWrite = at;
}

export function getSchedulerObservability(now = Date.now()): {
  startedAtMs: number | null;
  schedulerUptimeSeconds: number;
  lastError: SchedulerLastError | null;
  retryCount: number;
  lastPersistenceWrite: string | null;
  lastSuccessfulScanAt: string | null;
  isStarted: boolean;
} {
  const startedAtMs = observability.startedAtMs;
  return {
    startedAtMs,
    schedulerUptimeSeconds:
      startedAtMs == null ? 0 : Math.max(0, Math.floor((now - startedAtMs) / 1000)),
    lastError: observability.lastError,
    retryCount: observability.retryCount,
    lastPersistenceWrite: observability.lastPersistenceWrite,
    lastSuccessfulScanAt: observability.lastSuccessfulScanAt,
    isStarted: startedAtMs != null,
  };
}

export function resetSchedulerObservabilityForTests(): void {
  observability.startedAtMs = null;
  observability.lastError = null;
  observability.retryCount = 0;
  observability.lastPersistenceWrite = null;
  observability.lastSuccessfulScanAt = null;
}
