/**
 * Distributed trace collector — trace trees, timelines, critical path.
 */

import type { TelemetryConfiguration } from "./TelemetryConfiguration";

export interface TraceSpanInput {
  name: string;
  kind?: "pipeline" | "rule" | "module" | "system";
  durationMs?: number;
  parentName?: string;
  status?: "OK" | "ERROR" | "SKIPPED";
  attributes?: Record<string, unknown>;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  kind: "pipeline" | "rule" | "module" | "system";
  startOffsetMs: number;
  durationMs: number;
  status: "OK" | "ERROR" | "SKIPPED";
  attributes: Record<string, unknown>;
}

export interface DistributedTrace {
  traceId: string;
  parentTraceId: string | null;
  childTraceIds: string[];
  pipelineTimeline: TraceSpan[];
  ruleTimeline: TraceSpan[];
  executionTree: TraceSpan[];
  criticalPath: string[];
  totalDurationMs: number;
  createdAt: string;
  depth: number;
}

export class TraceCollector {
  private traces: DistributedTrace[] = [];
  private traceCount = 0;

  constructor(private config: TelemetryConfiguration) {}

  setConfiguration(config: TelemetryConfiguration): void {
    this.config = config;
  }

  collectTrace(input: {
    spans?: TraceSpanInput[];
    parentTraceId?: string | null;
    childTraceIds?: string[];
  } = {}): {
    trace: DistributedTrace;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const traceId = createTraceId();
      const spansInput = (input.spans ?? []).slice(0, this.config.traceDepth);
      if ((input.spans?.length ?? 0) > this.config.traceDepth) {
        warnings.push(
          `Trace depth truncated to ${this.config.traceDepth} spans.`
        );
      }

      const spanIds = new Map<string, string>();
      const executionTree: TraceSpan[] = [];
      let offset = 0;

      for (let index = 0; index < spansInput.length; index++) {
        const span = spansInput[index]!;
        const spanId = `span:${index}:${Math.random().toString(36).slice(2, 6)}`;
        spanIds.set(span.name, spanId);
        const durationMs = span.durationMs ?? 0;
        executionTree.push({
          spanId,
          traceId,
          parentSpanId: null,
          name: span.name,
          kind: span.kind ?? "system",
          startOffsetMs: offset,
          durationMs,
          status: span.status ?? "OK",
          attributes: { ...(span.attributes ?? {}) },
        });
        offset += durationMs;
      }

      for (let i = 0; i < executionTree.length; i++) {
        const src = spansInput[i]!;
        const built = executionTree[i]!;
        if (src.parentName && spanIds.has(src.parentName)) {
          built.parentSpanId = spanIds.get(src.parentName)!;
        } else if (i > 0) {
          built.parentSpanId = executionTree[i - 1]!.spanId;
        }
      }

      const pipelineTimeline = executionTree.filter((s) => s.kind === "pipeline");
      const ruleTimeline = executionTree.filter((s) => s.kind === "rule");
      const criticalPath = [...executionTree]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, Math.min(5, executionTree.length))
        .map((s) => s.name);

      const totalDurationMs = executionTree.reduce(
        (s, x) => s + x.durationMs,
        0
      );

      const trace: DistributedTrace = {
        traceId,
        parentTraceId: input.parentTraceId ?? null,
        childTraceIds: [...(input.childTraceIds ?? [])],
        pipelineTimeline,
        ruleTimeline,
        executionTree,
        criticalPath,
        totalDurationMs: round2(totalDurationMs),
        createdAt: new Date().toISOString(),
        depth: executionTree.length,
      };

      this.traces.push(trace);
      this.traceCount += 1;
      if (this.traces.length > 200) {
        this.traces.splice(0, this.traces.length - 200);
      }

      return { trace, warnings, errors };
    } catch (err) {
      errors.push(`Trace collection failed: ${String(err)}`);
      return {
        trace: {
          traceId: createTraceId(),
          parentTraceId: null,
          childTraceIds: [],
          pipelineTimeline: [],
          ruleTimeline: [],
          executionTree: [],
          criticalPath: [],
          totalDurationMs: 0,
          createdAt: new Date().toISOString(),
          depth: 0,
        },
        warnings,
        errors,
      };
    }
  }

  getTraces(limit?: number): DistributedTrace[] {
    if (limit === undefined) return this.traces.map(cloneTrace);
    return this.traces.slice(-limit).map(cloneTrace);
  }

  getTraceCount(): number {
    return this.traceCount;
  }

  reset(): void {
    this.traces = [];
    this.traceCount = 0;
  }
}

function createTraceId(): string {
  return `trace:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
}

function cloneTrace(trace: DistributedTrace): DistributedTrace {
  return {
    ...trace,
    childTraceIds: [...trace.childTraceIds],
    pipelineTimeline: trace.pipelineTimeline.map((s) => ({
      ...s,
      attributes: { ...s.attributes },
    })),
    ruleTimeline: trace.ruleTimeline.map((s) => ({
      ...s,
      attributes: { ...s.attributes },
    })),
    executionTree: trace.executionTree.map((s) => ({
      ...s,
      attributes: { ...s.attributes },
    })),
    criticalPath: [...trace.criticalPath],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
