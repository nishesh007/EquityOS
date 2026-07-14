/**
 * Execution tracer for diagnostics (read-only observation).
 */

import type { DiagnosticsConfiguration } from "./DiagnosticsConfiguration";

export interface TraceInput {
  validationRequest?: string;
  pipeline?: string;
  executedRules?: string[];
  skippedRules?: string[];
  executionTimeMs?: number;
  failures?: string[];
  warnings?: string[];
  trustScore?: number;
  integrityScore?: number;
  metadata?: Record<string, unknown>;
}

export interface DiagnosticsTrace {
  traceId: string;
  timestamp: string;
  validationRequest: string;
  pipeline: string;
  executedRules: string[];
  skippedRules: string[];
  executionTimeMs: number;
  failures: string[];
  warnings: string[];
  trustScore: number | null;
  integrityScore: number | null;
  sampled: boolean;
  metadata: Record<string, unknown>;
}

export class DiagnosticsTracer {
  private readonly traces: DiagnosticsTrace[] = [];

  constructor(private config: DiagnosticsConfiguration) {}

  setConfiguration(config: DiagnosticsConfiguration): void {
    this.config = config;
  }

  generateTrace(input: TraceInput = {}): DiagnosticsTrace {
    const sampled =
      !this.config.tracingEnabled
        ? false
        : Math.random() <= this.config.samplingRate;

    const trace: DiagnosticsTrace = {
      traceId: createTraceId(),
      timestamp: new Date().toISOString(),
      validationRequest: input.validationRequest ?? "unknown",
      pipeline: input.pipeline ?? "unknown",
      executedRules: [...(input.executedRules ?? [])],
      skippedRules: [...(input.skippedRules ?? [])],
      executionTimeMs: input.executionTimeMs ?? 0,
      failures: [...(input.failures ?? [])],
      warnings: [
        ...(input.warnings ?? []),
        ...(!this.config.tracingEnabled
          ? ["Tracing disabled by configuration."]
          : !sampled
            ? ["Trace skipped by sampling rate."]
            : []),
      ],
      trustScore: input.trustScore ?? null,
      integrityScore: input.integrityScore ?? null,
      sampled,
      metadata: { ...(input.metadata ?? {}) },
    };

    if (this.config.tracingEnabled && sampled) {
      this.traces.push(trace);
      if (this.traces.length > this.config.maxTraceHistory) {
        this.traces.splice(0, this.traces.length - this.config.maxTraceHistory);
      }
    }

    return trace;
  }

  getTraces(limit?: number): DiagnosticsTrace[] {
    if (limit === undefined) return [...this.traces];
    return this.traces.slice(-limit);
  }

  getTraceCount(): number {
    return this.traces.length;
  }

  reset(): void {
    this.traces.length = 0;
  }
}

function createTraceId(): string {
  return `trace:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
}
