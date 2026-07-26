/**
 * Production-safe structured logging for Strategy Optimization Lab (11C.5).
 * No PII. Development may echo errors/warnings; production stays silent.
 */

export type OptimizationLogLevel = "info" | "warn" | "error";

export interface OptimizationLogEvent {
  ts: string;
  level: OptimizationLogLevel;
  event: string;
  detail?: Record<string, string | number | boolean | null | undefined>;
}

const MAX_EVENTS = 40;
const ring: OptimizationLogEvent[] = [];

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function emitDev(level: OptimizationLogLevel, message: string): void {
  if (!isDev()) return;
  const sink =
    level === "error"
      ? globalThis.console?.error
      : level === "warn"
        ? globalThis.console?.warn
        : null;
  sink?.(`[optimization] ${message}`);
}

export function logOptimization(
  level: OptimizationLogLevel,
  event: string,
  detail?: OptimizationLogEvent["detail"]
): void {
  const entry: OptimizationLogEvent = {
    ts: new Date().toISOString(),
    level,
    event,
    detail,
  };
  ring.push(entry);
  if (ring.length > MAX_EVENTS) ring.shift();

  if (level === "info") return;
  const payload = detail ? `${event} ${JSON.stringify(detail)}` : event;
  emitDev(level, payload);
}

export function getOptimizationLogSnapshot(): readonly OptimizationLogEvent[] {
  return [...ring];
}

export function clearOptimizationLog(): void {
  ring.length = 0;
}
