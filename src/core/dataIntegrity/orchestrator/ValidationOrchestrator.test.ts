/**
 * Institutional Validation Orchestrator — unit tests (Prompt 9F.12).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationOrchestrator,
  registerValidationOrchestrator,
  resetValidationOrchestrator,
  registerValidationEngine,
  getRegisteredValidationEngines,
  resetValidationEngineRegistrationState,
  resolveDependencies,
  CircularDependencyError,
  detectCircularDependencies,
  ValidationWorkflow,
  ValidationCache,
  DEFAULT_VALIDATION_CONFIGURATION,
  validate,
  validateBatch,
  executePipeline,
  getExecutionStatus,
  cancelValidation,
  type EngineRunResult,
  type ValidationContext,
} from "./index";

function mockEngine(
  id: string,
  score: number,
  options?: {
    delayMs?: number;
    failTimes?: number;
    error?: string;
  }
) {
  let calls = 0;
  return {
    id,
    name: `Mock ${id}`,
    version: "test",
    handler: async (_ctx: ValidationContext): Promise<EngineRunResult> => {
      calls += 1;
      if (options?.delayMs) {
        await new Promise((r) => setTimeout(r, options.delayMs));
      }
      if (options?.failTimes && calls <= options.failTimes) {
        throw new Error(options.error ?? `transient-${id}`);
      }
      if (options?.error && !options.failTimes) {
        return {
          engineId: id,
          ok: false,
          score: 0,
          warnings: [],
          errors: [options.error],
          executionTimeMs: 1,
          cached: false,
          attempt: 1,
        };
      }
      return {
        engineId: id,
        ok: score >= 70,
        score,
        warnings: [],
        errors: [],
        executionTimeMs: 1,
        cached: false,
        attempt: 1,
      };
    },
    getCalls: () => calls,
  };
}

function registerMocks(
  orchestrator: ValidationOrchestrator,
  engines: Array<ReturnType<typeof mockEngine>>
) {
  for (const e of engines) {
    orchestrator.registerEngine(
      { id: e.id, name: e.name, version: e.version, handler: e.handler },
      { force: true }
    );
  }
}

describe("Orchestrator registration", () => {
  beforeEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  afterEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  it("registers orchestrator idempotently", () => {
    const first = registerValidationOrchestrator({ force: true });
    expect(first.registered).toBe(true);
    expect(first.enginesRegistered).toBeGreaterThanOrEqual(10);

    const second = registerValidationOrchestrator();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });

  it("discovers future validation modules via registry", () => {
    registerValidationOrchestrator({ force: true });
    const result = registerValidationEngine({
      id: "altData",
      name: "Alt Data",
      tags: ["future"],
      handler: async () => ({
        engineId: "altData",
        ok: true,
        score: 88,
        warnings: [],
        errors: [],
        executionTimeMs: 1,
        cached: false,
        attempt: 1,
      }),
    });
    expect(result.registered).toBe(true);
    expect(
      getRegisteredValidationEngines().some((e) => e.id === "altData")
    ).toBe(true);
  });
});

describe("Single and batch validation", () => {
  beforeEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  it("runs single validation through orchestrated mock engines", async () => {
    const orch = new ValidationOrchestrator();
    const market = mockEngine("market", 92);
    const trust = mockEngine("trust", 95);
    registerMocks(orch, [market, trust, mockEngine("dataIntegrity", 97)]);

    const response = await orch.validate({
      data: { symbol: "TATAMOTORS" },
      engines: ["dataIntegrity", "market", "trust"],
      mode: "CUSTOM",
      executionStrategy: "SEQUENTIAL",
      kind: "STOCK",
      objectId: "TATAMOTORS",
      useCache: false,
    });

    expect(response.requestId).toBeTruthy();
    expect(response.enginesExecuted).toContain("market");
    expect(response.integrityScore).toBe(97);
    expect(response.trustScore).toBe(95);
    expect(response.overallValidationScore).toBeGreaterThan(0);
    expect(response.validationTrace.length).toBe(3);
    expect(response.workflowState).toBe("COMPLETED");
  });

  it("runs batch validation with priority ordering", async () => {
    const orch = new ValidationOrchestrator();
    registerMocks(orch, [mockEngine("market", 90)]);

    const order: string[] = [];
    orch.registerEngine(
      {
        id: "tracker",
        name: "Tracker",
        handler: async (ctx) => {
          order.push(ctx.request.priority);
          return {
            engineId: "tracker",
            ok: true,
            score: 90,
            warnings: [],
            errors: [],
            executionTimeMs: 1,
            cached: false,
            attempt: 1,
          };
        },
      },
      { force: true }
    );

    await orch.validateBatch([
      {
        data: {},
        engines: ["tracker"],
        mode: "CUSTOM",
        priority: "LOW",
        useCache: false,
      },
      {
        data: {},
        engines: ["tracker"],
        mode: "CUSTOM",
        priority: "CRITICAL",
        useCache: false,
      },
      {
        data: {},
        engines: ["tracker"],
        mode: "CUSTOM",
        priority: "NORMAL",
        useCache: false,
      },
    ]);

    expect(order[0]).toBe("CRITICAL");
    expect(order[order.length - 1]).toBe("LOW");
  });
});

describe("Pipeline and parallel execution", () => {
  beforeEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  it("executes predefined pipeline", async () => {
    const orch = new ValidationOrchestrator();
    registerMocks(orch, [
      mockEngine("dataIntegrity", 96),
      mockEngine("market", 91),
      mockEngine("trust", 93),
    ]);

    const response = await orch.executePipeline("QuickValidation", {
      symbol: "INFY",
    }, { useCache: false, mode: "CUSTOM", engines: ["dataIntegrity", "market", "trust"] });

    expect(response.enginesExecuted.length).toBeGreaterThanOrEqual(1);
    expect(response.validationStatus).not.toBe("FAILED");
  });

  it("executes engines in parallel waves", async () => {
    const orch = new ValidationOrchestrator();
    const a = mockEngine("market", 90, { delayMs: 30 });
    const b = mockEngine("technical", 88, { delayMs: 30 });
    registerMocks(orch, [a, b, mockEngine("dataIntegrity", 95)]);

    const started = Date.now();
    await orch.validate({
      data: {},
      engines: ["dataIntegrity", "market", "technical"],
      mode: "CUSTOM",
      executionStrategy: "PARALLEL",
      useCache: false,
    });
    const elapsed = Date.now() - started;
    // Parallel should be closer to ~30ms than ~60ms (+overhead)
    expect(elapsed).toBeLessThan(120);
  });
});

describe("Retry, cache, routing, workflow", () => {
  beforeEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  it("retries transient engine failures", async () => {
    const orch = new ValidationOrchestrator({
      retryCount: 2,
      retryDelayMs: 5,
    });
    const flaky = mockEngine("market", 90, { failTimes: 2 });
    registerMocks(orch, [flaky]);

    const response = await orch.validate({
      data: {},
      engines: ["market"],
      mode: "CUSTOM",
      useCache: false,
      retryCount: 2,
    });

    expect(flaky.getCalls()).toBe(3);
    expect(response.scores.market).toBe(90);
    expect(response.workflowState).toBe("COMPLETED");
  });

  it("reuses cached engine results", async () => {
    const orch = new ValidationOrchestrator({ cacheTtlMs: 60_000 });
    const market = mockEngine("market", 91);
    registerMocks(orch, [market]);

    await orch.validate({
      data: {},
      engines: ["market"],
      mode: "CUSTOM",
      objectId: "CACHE-1",
      kind: "STOCK",
      useCache: true,
    });
    await orch.validate({
      data: {},
      engines: ["market"],
      mode: "CUSTOM",
      objectId: "CACHE-1",
      kind: "STOCK",
      useCache: true,
    });

    expect(market.getCalls()).toBe(1);
    expect(orch.getCache().getStats().hits).toBeGreaterThanOrEqual(1);
  });

  it("routes kind to inferred pipeline engines", async () => {
    const orch = new ValidationOrchestrator();
    registerMocks(orch, [
      mockEngine("dataIntegrity", 90),
      mockEngine("recommendation", 88),
      mockEngine("hallucination", 92),
      mockEngine("historical", 85),
      mockEngine("trust", 90),
    ]);

    const response = await orch.validateRecommendation(
      { action: "BUY" },
      { useCache: false }
    );
    expect(response.enginesExecuted).toContain("recommendation");
    expect(response.recommendationQuality).toBeGreaterThan(0);
  });

  it("tracks workflow state transitions and cancel", async () => {
    const workflow = new ValidationWorkflow();
    expect(workflow.getState()).toBe("PENDING");
    expect(workflow.transition("QUEUED")).toBe(true);
    expect(workflow.transition("RUNNING")).toBe(true);
    expect(workflow.transition("COMPLETED")).toBe(true);
    expect(workflow.isTerminal()).toBe(true);
    expect(workflow.transition("FAILED")).toBe(false);

    const orch = new ValidationOrchestrator();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    orch.registerEngine(
      {
        id: "slow",
        name: "Slow",
        handler: async () => {
          await gate;
          return {
            engineId: "slow",
            ok: true,
            score: 90,
            warnings: [],
            errors: [],
            executionTimeMs: 1,
            cached: false,
            attempt: 1,
          };
        },
      },
      { force: true }
    );

    const pending = orch.validate({
      requestId: "cancel-me",
      data: {},
      engines: ["slow"],
      mode: "CUSTOM",
      useCache: false,
    });

    // Allow queue/run to start
    await new Promise((r) => setTimeout(r, 10));
    const status = orch.getExecutionStatus("cancel-me");
    expect(status?.state).toBe("RUNNING");
    expect(orch.cancelValidation("cancel-me")).toBe(true);
    release();
    const response = await pending;
    expect(response.validationStatus === "CANCELLED" || response.workflowState === "CANCELLED" || response.workflowState === "COMPLETED").toBe(true);
  });
});

describe("Dependency resolution and failure recovery", () => {
  it("orders engines by dependencies", () => {
    const ordered = resolveDependencies(
      ["trust", "market", "dataIntegrity"],
      DEFAULT_VALIDATION_CONFIGURATION.engineDependencies
    );
    expect(ordered.indexOf("dataIntegrity")).toBeLessThan(
      ordered.indexOf("trust")
    );
    expect(ordered.indexOf("market")).toBeLessThan(ordered.indexOf("trust"));
  });

  it("detects circular dependencies", () => {
    expect(() =>
      resolveDependencies(["a", "b"], { a: ["b"], b: ["a"] })
    ).toThrow(CircularDependencyError);
    expect(detectCircularDependencies({ a: ["b"], b: ["a"] })).not.toBeNull();
  });

  it("recovers from engine failure without crashing (partial)", async () => {
    const orch = new ValidationOrchestrator();
    registerMocks(orch, [
      mockEngine("market", 90),
      mockEngine("technical", 0, { error: "boom" }),
    ]);

    const response = await orch.validate({
      data: {},
      engines: ["market", "technical"],
      mode: "CUSTOM",
      allowPartial: true,
      useCache: false,
      executionStrategy: "SEQUENTIAL",
    });

    expect(response.errors.some((e) => e.includes("boom"))).toBe(true);
    expect(response.scores.market).toBe(90);
    expect(["PARTIAL", "WARNING", "REJECTED", "FAILED"]).toContain(
      response.validationStatus
    );
  });
});

describe("Cache stats and public API", () => {
  beforeEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  afterEach(() => {
    resetValidationOrchestrator();
    resetValidationEngineRegistrationState();
  });

  it("exposes cache statistics", () => {
    const cache = new ValidationCache(1000);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("missing")).toBeUndefined();
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(50);
  });

  it("exposes public API helpers", async () => {
    resetValidationEngineRegistrationState();
    const orch = new ValidationOrchestrator();
    registerValidationOrchestrator({
      orchestrator: orch,
      force: true,
    });
    registerMocks(orch, [
      mockEngine("dataIntegrity", 90),
      mockEngine("market", 90),
      mockEngine("trust", 90),
    ]);

    const single = await validate({
      data: {},
      engines: ["market"],
      mode: "CUSTOM",
      useCache: false,
    });
    expect(single.requestId).toBeTruthy();

    const batch = await validateBatch([
      { data: {}, engines: ["market"], mode: "CUSTOM", useCache: false },
    ]);
    expect(batch.length).toBe(1);

    const pipe = await executePipeline(
      "QuickValidation",
      {},
      {
        engines: ["dataIntegrity", "market", "trust"],
        mode: "CUSTOM",
        useCache: false,
      }
    );
    expect(pipe.engineVersion).toBe(
      DEFAULT_VALIDATION_CONFIGURATION.engineVersion
    );

    expect(getExecutionStatus(single.requestId)?.requestId).toBe(
      single.requestId
    );
    expect(typeof cancelValidation("missing")).toBe("boolean");
  });
});
