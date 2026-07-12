/**
 * Structured logging for AI platform operations.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  route?: string;
  symbol?: string | null;
  durationMs?: number;
  tokens?: number;
  estimatedCostUsd?: number;
  error?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    service: "equityos-ai",
    ...context,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
