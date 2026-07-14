/**
 * Advanced Rule Engine — unit tests (Prompt 9F.2).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RuleEngine,
  RuleFactory,
  RuleDependencyResolver,
  CircularDependencyError,
  MissingDependencyError,
  RuleScheduler,
  RuleCache,
  RuleVersionManager,
  RuleAuditLogger,
  RulePerformanceTracker,
  PRIORITY_BAND_RANK,
} from "./index";
import type { CreateRuleInput } from "./RuleTypes";

function rule(
  partial: Partial<CreateRuleInput> & Pick<CreateRuleInput, "id" | "name">
): CreateRuleInput {
  return {
    validate: () => ({ passed: true }),
    ...partial,
  };
}

describe("Rule registration", () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  it("registerRule / findRule / listRules", () => {
    engine.registerRule(
      rule({ id: "r1", name: "One", category: "PRICE", tags: ["core"] })
    );
    expect(engine.findRule("r1")?.name).toBe("One");
    expect(engine.listRules()).toHaveLength(1);
    expect(engine.listRules({ category: "PRICE" })).toHaveLength(1);
    expect(engine.listRules({ tag: "core" })).toHaveLength(1);
  });

  it("registerRules / removeRule / enable / disable", () => {
    engine.registerRules([
      rule({ id: "a", name: "A" }),
      rule({ id: "b", name: "B" }),
    ]);
    expect(engine.size()).toBe(2);
    engine.disableRule("a");
    expect(engine.findRule("a")?.enabled).toBe(false);
    engine.enableRule("a");
    expect(engine.findRule("a")?.enabled).toBe(true);
    expect(engine.removeRule("b")).toBe(true);
    expect(engine.size()).toBe(1);
  });

  it("updateRule patches metadata and version", () => {
    engine.registerRule(rule({ id: "u", name: "U", version: "1.0.0" }));
    engine.updateRule("u", { name: "Updated", version: "1.1.0" });
    expect(engine.findRule("u")?.name).toBe("Updated");
    expect(engine.findRule("u")?.version).toBe("1.1.0");
  });
});

describe("Priority", () => {
  it("orders CRITICAL before LOW", async () => {
    const engine = new RuleEngine();
    const order: string[] = [];
    engine.registerRules([
      rule({
        id: "low",
        name: "Low",
        priority: "LOW",
        validate: () => {
          order.push("low");
          return { passed: true };
        },
      }),
      rule({
        id: "crit",
        name: "Crit",
        priority: "CRITICAL",
        validate: () => {
          order.push("crit");
          return { passed: true };
        },
      }),
      rule({
        id: "med",
        name: "Med",
        priority: "MEDIUM",
        validate: () => {
          order.push("med");
          return { passed: true };
        },
      }),
    ]);

    await engine.executeRules({
      data: { ok: true },
      datasetType: "STOCK_QUOTE",
    });

    expect(order[0]).toBe("crit");
    expect(order.indexOf("med")).toBeLessThan(order.indexOf("low"));
    expect(PRIORITY_BAND_RANK.CRITICAL).toBeLessThan(PRIORITY_BAND_RANK.LOW);
  });
});

describe("Dependencies", () => {
  it("resolves dependency order", () => {
    const resolver = new RuleDependencyResolver();
    const a = RuleFactory.create(
      rule({ id: "a", name: "A", dependencies: ["b"] })
    );
    const b = RuleFactory.create(rule({ id: "b", name: "B" }));
    const ordered = resolver.resolve([a, b]);
    expect(ordered.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("detects circular dependencies", () => {
    const resolver = new RuleDependencyResolver();
    const a = RuleFactory.create(
      rule({ id: "a", name: "A", dependencies: ["b"] })
    );
    const b = RuleFactory.create(
      rule({ id: "b", name: "B", dependencies: ["a"] })
    );
    expect(() => resolver.resolve([a, b])).toThrow(CircularDependencyError);
  });

  it("detects missing dependencies", () => {
    const resolver = new RuleDependencyResolver();
    const a = RuleFactory.create(
      rule({ id: "a", name: "A", dependencies: ["missing"] })
    );
    expect(() => resolver.resolve([a])).toThrow(MissingDependencyError);
  });

  it("executes dependencies before dependents", async () => {
    const engine = new RuleEngine();
    const order: string[] = [];
    engine.registerRules([
      rule({
        id: "child",
        name: "Child",
        dependencies: ["parent"],
        validate: () => {
          order.push("child");
          return { passed: true };
        },
      }),
      rule({
        id: "parent",
        name: "Parent",
        validate: () => {
          order.push("parent");
          return { passed: true };
        },
      }),
    ]);
    await engine.executeRules({
      data: {},
      datasetType: "OHLC_CANDLE",
    });
    expect(order).toEqual(["parent", "child"]);
  });
});

describe("Parallel execution", () => {
  it("runs parallel rules in the same wave", async () => {
    const engine = new RuleEngine();
    let concurrent = 0;
    let maxConcurrent = 0;

    const make = (id: string): CreateRuleInput => ({
      id,
      name: id,
      priority: "HIGH",
      executionMode: "PARALLEL",
      validate: async () => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 30));
        concurrent -= 1;
        return { passed: true };
      },
    });

    engine.registerRules([make("p1"), make("p2"), make("p3")]);
    const result = await engine.executeRules({
      data: {},
      datasetType: "STOCK_QUOTE",
    });

    expect(result.passedRules).toHaveLength(3);
    expect(maxConcurrent).toBeGreaterThan(1);
  });
});

describe("Conditional execution", () => {
  it("skips when condition is false", async () => {
    const engine = new RuleEngine();
    engine.registerRule({
      id: "cond",
      name: "Cond",
      executionMode: "CONDITIONAL",
      condition: (ctx) => ctx.metadata?.run === true,
      validate: () => ({ passed: true }),
    });

    const skipped = await engine.executeRules({
      data: {},
      datasetType: "NEWS",
      metadata: { run: false },
    });
    expect(skipped.skippedRules).toContain("cond");

    const ran = await engine.executeRules({
      data: {},
      datasetType: "NEWS",
      metadata: { run: true },
    });
    expect(ran.passedRules).toContain("cond");
  });
});

describe("Timeout", () => {
  it("fails gracefully on timeout", async () => {
    const engine = new RuleEngine();
    engine.registerRule({
      id: "slow",
      name: "Slow",
      timeout: 20,
      ruleLevel: "ERROR",
      validate: async () => {
        await new Promise((r) => setTimeout(r, 100));
        return { passed: true };
      },
    });

    const result = await engine.executeRules({
      data: {},
      datasetType: "AI_OUTPUT",
    });

    expect(result.timedOutRules).toContain("slow");
    expect(result.failedRules).toContain("slow");
    expect(result.terminatedEarly).toBe(false);
  });

  it("CRITICAL timeout terminates early", async () => {
    const engine = new RuleEngine();
    const order: string[] = [];
    engine.registerRules([
      {
        id: "slow-crit",
        name: "SlowCrit",
        priority: "CRITICAL",
        timeout: 15,
        ruleLevel: "CRITICAL",
        validate: async () => {
          order.push("slow-crit");
          await new Promise((r) => setTimeout(r, 80));
          return { passed: true };
        },
      },
      {
        id: "after",
        name: "After",
        priority: "LOW",
        validate: () => {
          order.push("after");
          return { passed: true };
        },
      },
    ]);

    const result = await engine.executeRules({
      data: {},
      datasetType: "STOCK_QUOTE",
    });

    expect(result.terminatedEarly).toBe(true);
    expect(order).toEqual(["slow-crit"]);
  });
});

describe("Caching", () => {
  it("caches deterministic validations", async () => {
    const engine = new RuleEngine({ cacheTtlMs: 60_000 });
    let calls = 0;
    engine.registerRule({
      id: "cached",
      name: "Cached",
      cacheKey: (ctx) => JSON.stringify(ctx.data),
      validate: () => {
        calls += 1;
        return { passed: true };
      },
    });

    const req = {
      data: { symbol: "AAPL", price: 1 },
      datasetType: "STOCK_QUOTE" as const,
    };

    await engine.executeRules(req);
    await engine.executeRules(req);

    expect(calls).toBe(1);
    expect(engine.getCacheStats().hits).toBeGreaterThanOrEqual(1);
  });

  it("respects TTL expiry", async () => {
    const cache = new RuleCache(10);
    cache.set("r", "1.0.0", "k", { passed: true });
    expect(cache.get("r", "1.0.0", "k")?.passed).toBe(true);
    await new Promise((r) => setTimeout(r, 25));
    expect(cache.get("r", "1.0.0", "k")).toBeUndefined();
  });
});

describe("Versioning", () => {
  it("tracks versions and compatible upgrades", () => {
    const versions = new RuleVersionManager();
    const r1 = RuleFactory.create(
      rule({ id: "v", name: "V", version: "1.0.0" })
    );
    versions.registerVersion(r1);
    const r2 = RuleFactory.create(
      rule({ id: "v", name: "V", version: "1.2.0" })
    );
    versions.registerVersion(r2);

    expect(versions.getVersions("v")).toHaveLength(2);
    expect(versions.getLatestVersion("v")).toBe("1.2.0");
    expect(versions.isCompatibleUpgrade("1.0.0", "1.2.0")).toBe(true);
    expect(versions.isCompatibleUpgrade("1.0.0", "2.0.0")).toBe(false);
  });

  it("rejects incompatible updateRule version bump", () => {
    const engine = new RuleEngine();
    engine.registerRule(rule({ id: "v", name: "V", version: "1.0.0" }));
    expect(() =>
      engine.updateRule("v", { version: "2.0.0" })
    ).toThrow(/Incompatible rule version/);
  });
});

describe("Audit logging", () => {
  it("records rule executions", async () => {
    const engine = new RuleEngine();
    engine.registerRule(
      rule({
        id: "audit",
        name: "Audit",
        validate: () => ({ passed: false, message: "nope" }),
      })
    );
    await engine.executeRules({
      data: {},
      datasetType: "PORTFOLIO_POSITION",
      dataSource: "unit",
    });

    const history = engine.getAuditHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].ruleId).toBe("audit");
    expect(history[0].datasetType).toBe("PORTFOLIO_POSITION");
    expect(history[0].scoreImpact).toBeGreaterThan(0);
  });

  it("RuleAuditLogger stores structured entries", () => {
    const audit = new RuleAuditLogger();
    audit.record(
      {
        ruleId: "x",
        ruleName: "X",
        status: "PASSED",
        passed: true,
        skipped: false,
        timedOut: false,
        fromCache: false,
        executionTime: 1.5,
        scoreImpact: 0,
        version: "1.0.0",
      },
      { datasetType: "NEWS", dataSource: "test" }
    );
    expect(audit.getAuditHistory(1)[0].result).toBe("PASSED");
  });
});

describe("Performance tracker", () => {
  it("tracks success / failure / timeout rates", async () => {
    const engine = new RuleEngine();
    engine.registerRules([
      rule({
        id: "ok",
        name: "Ok",
        validate: () => ({ passed: true }),
      }),
      {
        id: "fail",
        name: "Fail",
        validate: () => ({ passed: false, message: "fail" }),
      },
    ]);

    await engine.executeRules({ data: {}, datasetType: "WATCHLIST_ITEM" });
    const metrics = engine.getRuleMetrics();
    expect(metrics.length).toBe(2);
    const agg = engine.getAggregateMetrics();
    expect(agg.totalExecutions).toBe(2);
    expect(agg.successRate + agg.failureRate).toBeGreaterThan(0);
  });

  it("RulePerformanceTracker aggregates correctly", () => {
    const tracker = new RulePerformanceTracker();
    tracker.record({
      ruleId: "t",
      ruleName: "T",
      status: "PASSED",
      passed: true,
      skipped: false,
      timedOut: false,
      fromCache: false,
      executionTime: 10,
      scoreImpact: 0,
      version: "1",
    });
    tracker.record({
      ruleId: "t",
      ruleName: "T",
      status: "TIMEOUT",
      passed: false,
      skipped: false,
      timedOut: true,
      fromCache: false,
      executionTime: 50,
      scoreImpact: 10,
      version: "1",
    });
    const snap = tracker.getRuleMetrics("t")[0];
    expect(snap.timeoutRate).toBe(50);
    expect(snap.maximumRuntime).toBe(50);
  });
});

describe("Scheduler", () => {
  it("groups parallel rules into waves", () => {
    const scheduler = new RuleScheduler();
    const rules = [
      RuleFactory.create(
        rule({ id: "a", name: "A", priority: "HIGH", executionMode: "PARALLEL" })
      ),
      RuleFactory.create(
        rule({ id: "b", name: "B", priority: "HIGH", executionMode: "PARALLEL" })
      ),
      RuleFactory.create(
        rule({
          id: "c",
          name: "C",
          priority: "MEDIUM",
          executionMode: "SEQUENTIAL",
        })
      ),
    ];
    const waves = scheduler.schedule(rules);
    expect(waves[0].rules).toHaveLength(2);
    expect(waves[0].mode).toBe("PARALLEL");
    expect(waves[1].rules).toHaveLength(1);
  });
});

describe("Lazy execution", () => {
  it("skips lazy rules after a prior failure", async () => {
    const engine = new RuleEngine();
    engine.registerRules([
      {
        id: "fail-first",
        name: "FailFirst",
        priority: "CRITICAL",
        ruleLevel: "ERROR",
        validate: () => ({ passed: false, message: "fail" }),
      },
      {
        id: "lazy",
        name: "Lazy",
        priority: "LOW",
        executionMode: "LAZY",
        validate: () => ({ passed: true }),
      },
    ]);

    const result = await engine.executeRules({
      data: {},
      datasetType: "HISTORICAL_DATASET",
    });
    expect(result.skippedRules).toContain("lazy");
  });
});

describe("Batch validation", () => {
  it("validates many datasets efficiently", async () => {
    const engine = new RuleEngine();
    engine.registerRule(
      rule({
        id: "batch-rule",
        name: "Batch",
        executionMode: "BATCH",
        validate: (ctx) => ({
          passed: typeof (ctx.data as { n?: number }).n === "number",
        }),
      })
    );

    const items = Array.from({ length: 100 }, (_, i) => ({
      data: { n: i },
      datasetType: "BACKTEST_DATASET" as const,
    }));

    const results = await engine.executeRulesBatch(items, { concurrency: 20 });
    expect(results).toHaveLength(100);
    expect(results.every((r) => r.passedRules.includes("batch-rule"))).toBe(
      true
    );
  });
});

describe("Events", () => {
  it("emits lifecycle events for success and failure", async () => {
    const engine = new RuleEngine();
    const types: string[] = [];
    engine.on((e) => types.push(e.type));
    engine.registerRules([
      rule({ id: "ok", name: "Ok" }),
      {
        id: "bad",
        name: "Bad",
        validate: () => ({ passed: false, message: "bad" }),
      },
    ]);
    await engine.executeRules({ data: {}, datasetType: "NEWS" });
    expect(types).toContain("RuleStarted");
    expect(types).toContain("RuleCompleted");
    expect(types).toContain("RuleFailed");
    expect(types).toContain("ValidationCompleted");
  });
});

describe("Error handling", () => {
  it("never crashes when a rule throws", async () => {
    const engine = new RuleEngine();
    engine.registerRules([
      {
        id: "boom",
        name: "Boom",
        ruleLevel: "ERROR",
        validate: () => {
          throw new Error("explode");
        },
      },
      rule({ id: "next", name: "Next" }),
    ]);
    const result = await engine.executeRules({
      data: {},
      datasetType: "RESEARCH_REPORT",
    });
    expect(result.failedRules).toContain("boom");
    expect(result.passedRules).toContain("next");
  });
});

describe("RuleFactory custom API", () => {
  it("creates rules without modifying RuleEngine", () => {
    const created = RuleFactory.createRule({
      id: "custom",
      name: "Custom",
      category: "CUSTOM",
      validate: () => ({ passed: true }),
    });
    expect(created.id).toBe("custom");
    const integrity = RuleFactory.toIntegrityRule(created.toDefinition());
    expect(integrity.id).toBe("custom");
    expect(integrity.category).toBe("SCHEMA");
  });
});
