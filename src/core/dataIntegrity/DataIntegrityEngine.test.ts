/**
 * Data Integrity Engine — comprehensive unit tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DataIntegrityEngine,
  IntegrityConfig,
  IntegrityLogger,
  IntegrityMetrics,
  IntegrityRuleRegistry,
  ValidationPipeline,
  createBuiltInRules,
  buildIntegrityResult,
  calculateIntegrityScore,
  calculateConfidence,
  getScoreBand,
  resolveStatus,
  createIssue,
  getDataIntegrityEngine,
  resetDataIntegrityEngine,
  validate,
  validateBatch,
  registerRule,
  getMetrics,
  INTEGRITY_SCORE_THRESHOLD,
  INTEGRITY_ENGINE_VERSION,
  PIPELINE_STAGE_ORDER,
  LOG_EVENTS,
} from "./index";
import type { IntegrityIssue, IntegrityRule } from "./IntegrityTypes";

function silentEngine(overrides?: ConstructorParameters<typeof DataIntegrityEngine>[0]) {
  return new DataIntegrityEngine({
    registerBuiltInRules: true,
    ...overrides,
    config: {
      loggingLevel: "silent",
      ...(overrides?.config ?? {}),
    },
  });
}

describe("IntegrityConstants / Score bands", () => {
  it("exposes score threshold of 70", () => {
    expect(INTEGRITY_SCORE_THRESHOLD).toBe(70);
  });

  it("maps score bands correctly", () => {
    expect(getScoreBand(100)).toBe("Perfect");
    expect(getScoreBand(96)).toBe("Excellent");
    expect(getScoreBand(91)).toBe("Good");
    expect(getScoreBand(85)).toBe("Acceptable");
    expect(getScoreBand(72)).toBe("Risk");
    expect(getScoreBand(69)).toBe("Rejected");
    expect(getScoreBand(0)).toBe("Rejected");
  });

  it("defines pipeline stage order", () => {
    expect(PIPELINE_STAGE_ORDER).toEqual([
      "SCHEMA",
      "NULL",
      "TYPE",
      "RANGE",
      "LOGICAL",
      "TIMESTAMP",
      "DUPLICATE",
    ]);
  });
});

describe("IntegrityResult / Score calculation", () => {
  it("starts at 100 with no issues", () => {
    expect(calculateIntegrityScore([])).toBe(100);
    expect(calculateConfidence([])).toBe(100);
  });

  it("applies severity penalties", () => {
    const issues: IntegrityIssue[] = [
      createIssue("a", "A", "NULL", "WARNING", "w"),
      createIssue("b", "B", "TYPE", "ERROR", "e"),
      createIssue("c", "C", "SCHEMA", "CRITICAL", "c"),
    ];
    // 100 - 3 - 10 - 40 = 47
    expect(calculateIntegrityScore(issues)).toBe(47);
    expect(getScoreBand(47)).toBe("Rejected");
  });

  it("rejects below threshold and on critical", () => {
    const critical = [createIssue("x", "X", "SCHEMA", "CRITICAL", "fail")];
    expect(resolveStatus(100, critical)).toBe("REJECTED");

    const warnings = [createIssue("x", "X", "NULL", "WARNING", "warn")];
    expect(resolveStatus(97, warnings)).toBe("WARNING");

    expect(resolveStatus(100, [])).toBe("APPROVED");
    expect(resolveStatus(65, [])).toBe("REJECTED");
  });

  it("buildIntegrityResult never returns bare boolean", () => {
    const result = buildIntegrityResult({
      datasetType: "STOCK_QUOTE",
      dataSource: "test",
      data: { symbol: "AAPL", price: 100 },
      errors: [],
      warnings: [],
      passedRules: ["schema.payload.exists"],
      failedRules: [],
      executionTime: 1.2,
      terminatedEarly: false,
    });

    expect(result.status).toBe("APPROVED");
    expect(result.integrityScore).toBe(100);
    expect(result.confidence).toBe(100);
    expect(result.version).toBe(INTEGRITY_ENGINE_VERSION);
    expect(result.validatedAt).toBeTruthy();
    expect(result.datasetType).toBe("STOCK_QUOTE");
    expect(result.dataSource).toBe("test");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.passedRules)).toBe(true);
    expect(Array.isArray(result.failedRules)).toBe(true);
    expect(typeof result.executionTime).toBe("number");
  });
});

describe("IntegrityConfig", () => {
  it("loads defaults without magic numbers", () => {
    const config = new IntegrityConfig();
    const snap = config.get();
    expect(snap.scoreThreshold).toBe(70);
    expect(snap.strictMode).toBe(false);
    expect(snap.environment).toBe("production");
    expect(snap.rangeLimits.rsiMax).toBe(100);
  });

  it("enables and disables rules", () => {
    const config = new IntegrityConfig();
    expect(config.isRuleEnabled("foo", true)).toBe(true);
    config.disableRule("foo");
    expect(config.isRuleEnabled("foo", true)).toBe(false);
    config.enableRule("foo");
    expect(config.isRuleEnabled("foo", false)).toBe(true);
  });

  it("supports development mode", () => {
    const config = new IntegrityConfig();
    config.setEnvironment("development");
    expect(config.get().environment).toBe("development");
    expect(config.get().loggingLevel).toBe("debug");
  });

  it("clones overrides without mutating parent", () => {
    const parent = new IntegrityConfig({ scoreThreshold: 80 });
    const child = parent.withOverrides({ scoreThreshold: 90 });
    expect(parent.get().scoreThreshold).toBe(80);
    expect(child.get().scoreThreshold).toBe(90);
  });

  it("updates range limits", () => {
    const config = new IntegrityConfig({
      rangeLimits: { peMax: 200 } as never,
    });
    expect(config.getRangeLimits().peMax).toBe(200);
    expect(config.getRangeLimits().rsiMax).toBe(100);
  });
});

describe("IntegrityRuleRegistry", () => {
  it("registers and retrieves rules dynamically", () => {
    const registry = new IntegrityRuleRegistry();
    const rule: IntegrityRule = {
      id: "custom.rule",
      name: "Custom",
      description: "desc",
      category: "SCHEMA",
      ruleLevel: "INFO",
      priority: 1,
      enabled: true,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validate: () => ({ passed: true }),
    };
    registry.registerRule(rule);
    expect(registry.hasRule("custom.rule")).toBe(true);
    expect(registry.getRule("custom.rule")?.name).toBe("Custom");
    expect(registry.size()).toBe(1);
    expect(registry.unregisterRule("custom.rule")).toBe(true);
    expect(registry.size()).toBe(0);
  });

  it("orders executable rules by stage then priority", () => {
    const registry = new IntegrityRuleRegistry();
    for (const rule of createBuiltInRules()) {
      registry.registerRule(rule);
    }
    const executable = registry.getExecutableRules("OHLC_CANDLE", (r) => r.enabled);
    const categories = executable.map((r) => r.category);
    const stageIndex = (c: string) => PIPELINE_STAGE_ORDER.indexOf(c as never);
    for (let i = 1; i < categories.length; i++) {
      expect(stageIndex(categories[i])).toBeGreaterThanOrEqual(
        stageIndex(categories[i - 1])
      );
    }
  });

  it("filters by dataset type", () => {
    const registry = new IntegrityRuleRegistry();
    for (const rule of createBuiltInRules()) {
      registry.registerRule(rule);
    }
    const newsRules = registry.getExecutableRules("NEWS", (r) => r.enabled);
    expect(newsRules.some((r) => r.id === "range.ohlc")).toBe(false);
    expect(newsRules.some((r) => r.id === "schema.payload.exists")).toBe(true);
  });
});

describe("IntegrityLogger", () => {
  it("emits structured log events", () => {
    const entries: unknown[] = [];
    const logger = new IntegrityLogger({
      level: "debug",
      retainEntries: true,
      sink: (e) => entries.push(e),
    });

    logger.logValidationStart({
      datasetType: "STOCK_QUOTE",
      dataSource: "test",
    });
    logger.logScore({
      integrityScore: 100,
      scoreBand: "Perfect",
      confidence: 100,
    });
    logger.logValidationEnd({
      datasetType: "STOCK_QUOTE",
      dataSource: "test",
      executionTime: 1,
      status: "APPROVED",
    });

    expect(logger.getEntries().length).toBeGreaterThanOrEqual(3);
    expect(logger.getEntries()[0].event).toBe(LOG_EVENTS.VALIDATION_START);
    expect(logger.getEntries()[0].service).toBe("equityos-data-integrity");
    expect(entries.length).toBeGreaterThan(0);
  });

  it("respects silent log level", () => {
    const logger = new IntegrityLogger({ level: "silent", retainEntries: true });
    logger.info("should not appear");
    expect(logger.getEntries()).toHaveLength(0);
  });
});

describe("IntegrityMetrics", () => {
  it("tracks validated / rejected / averages / rates", () => {
    const metrics = new IntegrityMetrics();
    const approved = buildIntegrityResult({
      datasetType: "STOCK_QUOTE",
      dataSource: "t",
      data: {},
      errors: [],
      warnings: [],
      passedRules: [],
      failedRules: [],
      executionTime: 10,
      terminatedEarly: false,
    });
    const rejected = buildIntegrityResult({
      datasetType: "STOCK_QUOTE",
      dataSource: "t",
      data: {},
      errors: [createIssue("c", "C", "SCHEMA", "CRITICAL", "fail")],
      warnings: [createIssue("w", "W", "NULL", "WARNING", "warn")],
      passedRules: [],
      failedRules: ["c"],
      executionTime: 20,
      terminatedEarly: true,
    });

    metrics.record(approved);
    metrics.record(rejected);
    const snap = metrics.getMetrics();

    expect(snap.datasetsValidated).toBe(2);
    expect(snap.datasetsApproved).toBe(1);
    expect(snap.datasetsRejected).toBe(1);
    expect(snap.successRate).toBe(50);
    expect(snap.failureRate).toBe(50);
    expect(snap.criticalErrors).toBe(1);
    expect(snap.warningCount).toBe(1);
    expect(snap.averageExecutionTime).toBe(15);
    expect(snap.averageIntegrityScore).toBeGreaterThan(0);
    expect(snap.lastValidatedAt).toBeTruthy();

    metrics.reset();
    expect(metrics.getMetrics().datasetsValidated).toBe(0);
  });
});

describe("Schema validation", () => {
  const engine = () => silentEngine();

  it("rejects null payload", async () => {
    const result = await engine().validate({
      data: null,
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
    });
    expect(result.status).toBe("REJECTED");
    expect(result.terminatedEarly).toBe(true);
    expect(result.failedRules).toContain("schema.payload.exists");
    expect(result.integrityScore).toBeLessThan(70);
  });

  it("rejects unexpected primitive schema", async () => {
    const result = await engine().validate({
      data: "corrupt",
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
    });
    expect(result.status).toBe("REJECTED");
    expect(result.failedRules).toContain("schema.structure.valid");
  });

  it("approves valid quote object", async () => {
    const result = await engine().validate({
      data: {
        symbol: "AAPL",
        exchange: "NASDAQ",
        price: 190.5,
        timestamp: "2024-06-03T14:30:00.000Z",
      },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.status).toBe("APPROVED");
    expect(result.integrityScore).toBeGreaterThanOrEqual(70);
  });
});

describe("Null validation", () => {
  it("detects null symbol", async () => {
    const result = await silentEngine().validate({
      data: { symbol: null, price: 10, timestamp: "2024-06-03T14:00:00Z" },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("null.symbol");
    expect(result.errors.some((e) => e.message.includes("Null symbol"))).toBe(
      true
    );
  });

  it("detects null OHLC values", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        open: 10,
        high: null,
        low: 9,
        close: 10,
        timestamp: "2024-06-03T14:00:00Z",
      },
      datasetType: "OHLC_CANDLE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("null.ohlc");
  });

  it("detects null volume", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        price: 10,
        volume: null,
        timestamp: "2024-06-03T14:00:00Z",
      },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("null.volume");
  });
});

describe("Type validation", () => {
  it("rejects NaN", async () => {
    const result = await silentEngine().validate({
      data: { symbol: "AAPL", price: Number.NaN, timestamp: "2024-06-03T14:00:00Z" },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("type.primitives");
    expect(result.errors.some((e) => e.message.includes("NaN"))).toBe(true);
  });

  it("rejects Infinity", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        price: Number.POSITIVE_INFINITY,
        timestamp: "2024-06-03T14:00:00Z",
      },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("type.primitives");
  });
});

describe("Range validation", () => {
  it("rejects High < Low", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        open: 10,
        high: 9,
        low: 11,
        close: 10,
        volume: 1000,
        timestamp: "2024-06-03T14:00:00Z",
      },
      datasetType: "OHLC_CANDLE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.status).toBe("REJECTED");
    expect(result.terminatedEarly).toBe(true);
    expect(result.failedRules).toContain("range.ohlc");
  });

  it("rejects negative volume", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        open: 10,
        high: 11,
        low: 9,
        close: 10.5,
        volume: -1,
        timestamp: "2024-06-03T14:00:00Z",
      },
      datasetType: "OHLC_CANDLE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("range.volume.non_negative");
  });

  it("rejects RSI > 100", async () => {
    const result = await silentEngine().validate({
      data: { symbol: "AAPL", rsi: 105 },
      datasetType: "TECHNICAL_INDICATOR",
      dataSource: "unit",
    });
    expect(result.failedRules).toContain("range.indicators");
  });

  it("rejects negative market cap", async () => {
    const result = await silentEngine().validate({
      data: { symbol: "AAPL", marketCap: -1000 },
      datasetType: "FUNDAMENTAL_DATA",
      dataSource: "unit",
    });
    expect(result.failedRules).toContain("range.fundamentals");
  });

  it("uses configurable PE limits", async () => {
    const engine = silentEngine({
      config: {
        loggingLevel: "silent",
        rangeLimits: {
          rsiMax: 100,
          rsiMin: 0,
          adxMax: 100,
          adxMin: 0,
          peMax: 50,
          peMin: 0,
          pbMax: 100,
          pbMin: 0,
          dividendYieldMax: 100,
          dividendYieldMin: 0,
          marketCapMax: 1e15,
          marketCapMin: 0,
          atrMin: 0,
        },
      },
    });
    const result = await engine.validate({
      data: { symbol: "AAPL", pe: 80 },
      datasetType: "FUNDAMENTAL_DATA",
      dataSource: "unit",
    });
    expect(result.failedRules).toContain("range.fundamentals");
  });
});

describe("Logical validation", () => {
  it("validates delivery volume <= total volume", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        price: 10,
        volume: 100,
        deliveryVolume: 150,
        timestamp: "2024-06-03T14:00:00Z",
      },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("logical.delivery_volume");
  });

  it("validates dividend date order", async () => {
    const result = await silentEngine().validate({
      data: {
        symbol: "AAPL",
        type: "DIVIDEND",
        amount: 0.5,
        exDate: "2024-06-10",
        payDate: "2024-06-01",
      },
      datasetType: "DIVIDEND",
      dataSource: "unit",
    });
    expect(result.failedRules).toContain("logical.corporate_action");
  });

  it("validates split ratio positivity", async () => {
    const result = await silentEngine().validate({
      data: { symbol: "AAPL", type: "SPLIT", ratio: -2 },
      datasetType: "SPLIT",
      dataSource: "unit",
    });
    expect(result.failedRules).toContain("logical.corporate_action");
  });
});

describe("Timestamp validation", () => {
  it("rejects future timestamps", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const result = await silentEngine().validate({
      data: { symbol: "AAPL", price: 10, timestamp: future },
      datasetType: "STOCK_QUOTE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("timestamp.not_future");
  });

  it("detects duplicate timestamps", async () => {
    const result = await silentEngine().validate({
      data: [
        {
          open: 1,
          high: 2,
          low: 1,
          close: 1.5,
          volume: 10,
          timestamp: "2024-06-03T14:00:00Z",
        },
        {
          open: 1.5,
          high: 2.5,
          low: 1.4,
          close: 2,
          volume: 12,
          timestamp: "2024-06-03T14:00:00Z",
        },
      ],
      datasetType: "OHLC_CANDLE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("timestamp.no_duplicates");
  });
});

describe("Duplicate validation", () => {
  it("removes duplicate candles safely", async () => {
    const candle = {
      symbol: "AAPL",
      open: 10,
      high: 11,
      low: 9,
      close: 10.5,
      volume: 1000,
      timestamp: "2024-06-03T14:00:00Z",
    };
    const result = await silentEngine().validate({
      data: [candle, { ...candle }],
      datasetType: "OHLC_CANDLE",
      dataSource: "unit",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).toContain("duplicate.records");
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[]).length).toBe(1);
  });
});

describe("Critical failures terminate early", () => {
  it("stops pipeline on CRITICAL schema failure", async () => {
    const engine = silentEngine();
    const result = await engine.validate({
      data: null,
      datasetType: "AI_OUTPUT",
      dataSource: "unit",
    });
    expect(result.terminatedEarly).toBe(true);
    expect(result.status).toBe("REJECTED");
    // Later rules should not all run after critical schema failure
    expect(result.failedRules[0]).toBe("schema.payload.exists");
  });
});

describe("DataIntegrityEngine public APIs", () => {
  beforeEach(() => {
    resetDataIntegrityEngine();
  });

  it("validate() returns full result model", async () => {
    const engine = silentEngine();
    const result = await engine.validate({
      data: {
        symbol: "MSFT",
        exchange: "NASDAQ",
        price: 400,
        timestamp: "2024-06-03T15:00:00Z",
      },
      datasetType: "STOCK_QUOTE",
      dataSource: "polygon",
      metadata: { allowWeekend: true },
    });
    expect(result.integrityScore).toBeGreaterThanOrEqual(70);
    expect(result.dataSource).toBe("polygon");
    expect(result.version).toBe(INTEGRITY_ENGINE_VERSION);
  });

  it("validateBatch() runs in parallel", async () => {
    const engine = silentEngine();
    const results = await engine.validateBatch({
      parallel: true,
      items: [
        {
          data: { symbol: "A", price: 1, timestamp: "2024-06-03T14:00:00Z" },
          datasetType: "STOCK_QUOTE",
          metadata: { allowWeekend: true },
        },
        {
          data: null,
          datasetType: "STOCK_QUOTE",
        },
        {
          data: { symbol: "B", price: 2, timestamp: "2024-06-03T14:00:00Z" },
          datasetType: "STOCK_QUOTE",
          metadata: { allowWeekend: true },
        },
      ],
    });
    expect(results).toHaveLength(3);
    expect(results[1].status).toBe("REJECTED");
  });

  it("validateBatch() sequential mode works", async () => {
    const engine = silentEngine();
    const results = await engine.validateBatch({
      parallel: false,
      items: [
        {
          data: { headline: "News", timestamp: "2024-06-03T14:00:00Z" },
          datasetType: "NEWS",
        },
      ],
    });
    expect(results).toHaveLength(1);
  });

  it("registerRule() adds dynamic rules", async () => {
    const engine = silentEngine({ registerBuiltInRules: false });
    engine.registerRule({
      id: "custom.always_fail",
      name: "Always Fail",
      description: "test",
      category: "SCHEMA",
      ruleLevel: "ERROR",
      priority: 1,
      enabled: true,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validate: () => ({ passed: false, message: "custom fail" }),
    });
    const result = await engine.validate({
      data: { ok: true },
      datasetType: "RESEARCH_REPORT",
      dataSource: "unit",
    });
    expect(result.failedRules).toContain("custom.always_fail");
  });

  it("calculateIntegrityScore() is exposed", () => {
    const engine = silentEngine();
    const score = engine.calculateIntegrityScore([
      createIssue("a", "A", "NULL", "ERROR", "e"),
    ]);
    expect(score).toBe(90);
  });

  it("getMetrics() reflects validations", async () => {
    const engine = silentEngine();
    await engine.validate({
      data: { symbol: "X", price: 1, timestamp: "2024-06-03T14:00:00Z" },
      datasetType: "STOCK_QUOTE",
      metadata: { allowWeekend: true },
    });
    await engine.validate({ data: null, datasetType: "NEWS" });
    const m = engine.getMetrics();
    expect(m.datasetsValidated).toBe(2);
    expect(m.datasetsRejected).toBe(1);
    expect(m.successRate).toBe(50);
  });

  it("disableRule prevents execution", async () => {
    const engine = silentEngine();
    engine.disableRule("null.symbol");
    const result = await engine.validate({
      data: { symbol: null, price: 10, timestamp: "2024-06-03T14:00:00Z" },
      datasetType: "STOCK_QUOTE",
      metadata: { allowWeekend: true },
    });
    expect(result.failedRules).not.toContain("null.symbol");
  });

  it("module-level convenience APIs work", async () => {
    resetDataIntegrityEngine();
    getDataIntegrityEngine({ config: { loggingLevel: "silent" } });
    const result = await validate({
      data: { title: "R", content: "body" },
      datasetType: "RESEARCH_REPORT",
      dataSource: "unit",
    });
    expect(result.status).toBeDefined();
    expect(typeof calculateIntegrityScore([])).toBe("number");
    registerRule({
      id: "mod.rule",
      name: "Mod",
      description: "d",
      category: "SCHEMA",
      ruleLevel: "INFO",
      priority: 99,
      enabled: true,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validate: () => ({ passed: true }),
    });
    const batch = await validateBatch({
      items: [{ data: {}, datasetType: "AI_OUTPUT" }],
    });
    expect(batch).toHaveLength(1);
    expect(getMetrics().datasetsValidated).toBeGreaterThan(0);
  });

  it("never crashes on rule throw", async () => {
    const engine = silentEngine({ registerBuiltInRules: false });
    engine.registerRule({
      id: "boom",
      name: "Boom",
      description: "throws",
      category: "SCHEMA",
      ruleLevel: "ERROR",
      priority: 1,
      enabled: true,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validate: () => {
        throw new Error("boom");
      },
    });
    const result = await engine.validate({
      data: { a: 1 },
      datasetType: "BACKTEST_DATASET",
    });
    expect(result.failedRules).toContain("boom");
    expect(result.errors[0].message).toContain("Rule execution error");
  });
});

describe("ValidationPipeline isolation", () => {
  it("runs asynchronously", async () => {
    const registry = new IntegrityRuleRegistry();
    for (const rule of createBuiltInRules()) {
      registry.registerRule(rule);
    }
    const pipeline = new ValidationPipeline();
    const logger = new IntegrityLogger({ level: "silent" });
    const config = new IntegrityConfig({ loggingLevel: "silent" });

    const result = await pipeline.run({
      data: {
        symbol: "IBM",
        open: 100,
        high: 105,
        low: 99,
        close: 103,
        volume: 5000,
        timestamp: "2024-06-03T16:00:00Z",
      },
      datasetType: "OHLC_CANDLE",
      dataSource: "unit",
      config,
      metadata: { allowWeekend: true },
      registry,
      logger,
    });

    expect(result.integrityScore).toBeGreaterThanOrEqual(70);
    expect(result.status).not.toBe("REJECTED");
  });
});
