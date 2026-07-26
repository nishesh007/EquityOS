import { describe, expect, it } from "vitest";
import {
  STRATEGY_TEMPLATES,
  buildComparisonHighlight,
  buildDeploymentReadiness,
  calculateScores,
  createDefaultBuildingBlocks,
  createInitialBuilderState,
  createStrategyFromParts,
  exportStrategies,
  filterLibrary,
  generateImprovements,
  generateStrategies,
  isDuplicateName,
  simulatePerformance,
  validateBuildingBlocks,
} from "./index";

describe("AI Strategy Builder", () => {
  it("loads all built-in templates", () => {
    expect(STRATEGY_TEMPLATES).toHaveLength(10);
    expect(STRATEGY_TEMPLATES.map((t) => t.name)).toContain("Swing Breakout");
    expect(STRATEGY_TEMPLATES.map((t) => t.name)).toContain("Low Volatility");
  });

  it("generates complete strategy rules from blocks", () => {
    const [strategy] = generateStrategies({
      blocks: createDefaultBuildingBlocks(),
      nameHint: "Test Momentum",
    });
    expect(strategy).toBeDefined();
    expect(strategy!.rules.entry.length).toBeGreaterThan(0);
    expect(strategy!.rules.exit.length).toBeGreaterThan(0);
    expect(strategy!.rules.stopLossPct).toBeGreaterThan(0);
    expect(strategy!.rules.targetPct).toBeGreaterThan(0);
    expect(strategy!.performance.tradeCount).toBeGreaterThan(0);
    expect(strategy!.scores.grade).toMatch(/^(A\+|A|B|C|D)$/);
    expect(strategy!.improvements.length).toBeGreaterThan(0);
    expect(strategy!.deployment.items.length).toBeGreaterThanOrEqual(9);
  });

  it("generates from templates", () => {
    const [s] = generateStrategies({ templateId: "mean-reversion" });
    expect(s!.templateId).toBe("mean-reversion");
    expect(s!.blocks.marketRegime).toBe("Sideways");
  });

  it("validates building blocks", () => {
    const empty = createDefaultBuildingBlocks();
    empty.technicalIndicators = [];
    empty.fundamentalFilters = [];
    empty.momentumFilters = [];
    empty.valuationFilters = [];
    expect(validateBuildingBlocks(empty).valid).toBe(false);
    expect(validateBuildingBlocks(createDefaultBuildingBlocks()).valid).toBe(
      true
    );
  });

  it("calculates institutional scores and grades", () => {
    const s = createStrategyFromParts({
      name: "Score Probe",
      blocks: createDefaultBuildingBlocks(),
      source: "generated",
    });
    const perf = simulatePerformance(s);
    const scores = calculateScores(s, perf);
    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(["A+", "A", "B", "C", "D"]).toContain(scores.grade);
  });

  it("produces improvement suggestions with confidence", () => {
    const s = createStrategyFromParts({
      name: "Improve Me",
      blocks: {
        ...createDefaultBuildingBlocks(),
        volumeFilters: [],
        marketRegime: "Any",
      },
      source: "generated",
    });
    const tips = generateImprovements(s);
    expect(tips.length).toBeGreaterThan(0);
    for (const tip of tips) {
      expect(tip.confidence).toBeGreaterThanOrEqual(50);
      expect(tip.confidence).toBeLessThanOrEqual(100);
      expect(tip.title.length).toBeGreaterThan(0);
    }
  });

  it("updates deployment checklist status", () => {
    const s = createStrategyFromParts({
      name: "Deploy Probe",
      blocks: createDefaultBuildingBlocks(),
      source: "generated",
    });
    const readiness = buildDeploymentReadiness(s);
    expect(["Ready", "Needs Improvement", "Not Ready"]).toContain(
      readiness.status
    );
    expect(readiness.items.some((i) => i.id === "pf")).toBe(true);
  });

  it("compares strategies and highlights leaders", () => {
    const a = createStrategyFromParts({
      name: "Alpha",
      blocks: createDefaultBuildingBlocks(),
      source: "generated",
    });
    const b = createStrategyFromParts({
      name: "Beta",
      blocks: {
        ...createDefaultBuildingBlocks(),
        marketRegime: "Bear",
        positionSizing: "Fixed fractional 0.75% risk",
      },
      source: "generated",
    });
    const h = buildComparisonHighlight([a, b]);
    expect(h.bestReturnId).toBeTruthy();
    expect(h.highestSharpeId).toBeTruthy();
    expect(h.lowestDrawdownId).toBeTruthy();
  });

  it("filters library and detects duplicate names", () => {
    const a = createStrategyFromParts({
      name: "Unique One",
      blocks: createDefaultBuildingBlocks(),
      tags: ["swing"],
      source: "library",
    });
    const b = {
      ...createStrategyFromParts({
        name: "Other",
        blocks: createDefaultBuildingBlocks(),
        tags: ["value"],
        source: "library",
      }),
      favorite: true,
    };
    expect(isDuplicateName([a, b], "unique one")).toBe(true);
    expect(isDuplicateName([a, b], "Fresh")).toBe(false);
    const filtered = filterLibrary([a, b], {
      query: "unique",
      tag: null,
      favoritesOnly: false,
      includeArchived: false,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.name).toBe("Unique One");
  });

  it("exports strategies in supported formats", async () => {
    const s = createStrategyFromParts({
      name: "Export Me",
      blocks: createDefaultBuildingBlocks(),
      source: "generated",
    });
    for (const format of ["csv", "excel", "json", "pdf"] as const) {
      const result = await exportStrategies({ strategies: [s], format });
      expect(result.status).not.toBe("failed");
    }
    const empty = await exportStrategies({ strategies: [], format: "json" });
    expect(empty.status).toBe("failed");
  });

  it("creates initial store state with templates", () => {
    const state = createInitialBuilderState();
    expect(state.templates).toHaveLength(10);
    expect(state.activeTab).toBe("generator");
    expect(state.library).toEqual([]);
  });
});
