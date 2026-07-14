/**
 * Institutional Data Integrity Engine — structured logger.
 */

import {
  INTEGRITY_LOGGER_SERVICE,
  LOG_EVENTS,
} from "./IntegrityConstants";
import type { IntegrityLogLevel, IntegrityResult } from "./IntegrityTypes";

export interface IntegrityLogEntry {
  ts: string;
  level: Exclude<IntegrityLogLevel, "silent">;
  event: string;
  message: string;
  service: typeof INTEGRITY_LOGGER_SERVICE;
  [key: string]: unknown;
}

export type IntegrityLogSink = (entry: IntegrityLogEntry) => void;

const LOG_LEVEL_RANK: Record<IntegrityLogLevel, number> = {
  silent: 100,
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
};

function defaultSink(entry: IntegrityLogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export class IntegrityLogger {
  private level: IntegrityLogLevel;
  private sink: IntegrityLogSink;
  private entries: IntegrityLogEntry[] = [];
  private retainEntries: boolean;

  constructor(options?: {
    level?: IntegrityLogLevel;
    sink?: IntegrityLogSink;
    /** Retain entries in-memory for tests / inspection. */
    retainEntries?: boolean;
  }) {
    this.level = options?.level ?? "info";
    this.sink = options?.sink ?? defaultSink;
    this.retainEntries = options?.retainEntries ?? false;
  }

  setLevel(level: IntegrityLogLevel): void {
    this.level = level;
  }

  setSink(sink: IntegrityLogSink): void {
    this.sink = sink;
  }

  getEntries(): readonly IntegrityLogEntry[] {
    return this.entries;
  }

  clearEntries(): void {
    this.entries = [];
  }

  private emit(
    level: Exclude<IntegrityLogLevel, "silent">,
    event: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (LOG_LEVEL_RANK[level] < LOG_LEVEL_RANK[this.level]) {
      return;
    }
    const entry: IntegrityLogEntry = {
      ts: new Date().toISOString(),
      level,
      event,
      message,
      service: INTEGRITY_LOGGER_SERVICE,
      ...context,
    };
    if (this.retainEntries) {
      this.entries.push(entry);
    }
    this.sink(entry);
  }

  logValidationStart(context: {
    datasetType: string;
    dataSource: string;
  }): void {
    this.emit("info", LOG_EVENTS.VALIDATION_START, "Validation started", context);
  }

  logValidationEnd(context: {
    datasetType: string;
    dataSource: string;
    executionTime: number;
    status: string;
  }): void {
    this.emit("info", LOG_EVENTS.VALIDATION_END, "Validation ended", context);
  }

  logRulesExecuted(context: {
    count: number;
    ruleIds: string[];
  }): void {
    this.emit("debug", LOG_EVENTS.RULES_EXECUTED, "Rules executed", context);
  }

  logFailures(context: {
    count: number;
    failures: Array<{ ruleId: string; message: string }>;
  }): void {
    if (context.count === 0) return;
    this.emit("warn", LOG_EVENTS.FAILURES, "Validation failures detected", context);
  }

  logWarnings(context: {
    count: number;
    warnings: Array<{ ruleId: string; message: string }>;
  }): void {
    if (context.count === 0) return;
    this.emit("warn", LOG_EVENTS.WARNINGS, "Validation warnings detected", context);
  }

  logScore(context: {
    integrityScore: number;
    scoreBand: string;
    confidence: number;
  }): void {
    this.emit("info", LOG_EVENTS.SCORE, "Integrity score calculated", context);
  }

  logRejected(result: IntegrityResult): void {
    this.emit("error", LOG_EVENTS.REJECTED, "Dataset rejected", {
      datasetType: result.datasetType,
      dataSource: result.dataSource,
      integrityScore: result.integrityScore,
      failedRules: result.failedRules,
      terminatedEarly: result.terminatedEarly,
    });
  }

  logApproved(result: IntegrityResult): void {
    this.emit("info", LOG_EVENTS.APPROVED, "Dataset approved", {
      datasetType: result.datasetType,
      dataSource: result.dataSource,
      integrityScore: result.integrityScore,
      status: result.status,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.emit("debug", "integrity.debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.emit("info", "integrity.info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit("warn", "integrity.warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.emit("error", "integrity.error", message, context);
  }
}
