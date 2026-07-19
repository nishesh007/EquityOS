/**
 * Institutional Strategy Screener — tests (Sprint 9D.R5).
 */

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  BUILTIN_TEMPLATE_IDS,
  STRATEGY_EMPTY,
  assertNoSentinelText,
  buildStrategyFromLeaves,
  cloneStrategy,
  collectMatchedFailedRules,
  createLeafRule,
  createRuleGroup,
  createStrategy,
  deleteStrategy,
  evaluateRuleNode,
  getStrategy,
  listStrategies,
  listTemplates,
  normalizeStrategyCard,
  normalizeStrategyExplainability,
  previewStrategy,
  registerAIScreener,
  registerBuiltinTemplates,
  resetStrategyModule,
  runStrategy,
  saveTemplate,
  summarizeRules,
  updateStrategy,
  validateRuleTree,
  countRules,
  type StrategyUniverseCandidate,
} from "../index";

beforeEach(() => {
  resetStrategyModule();
});

afterEach(() => {
  resetStrategyModule();
});

const passCandidate: StrategyUniverseCandidate = {
  ticker: "RELIANCE",
  company: "Reliance Industries",
  sector: "Energy",
  metrics: {
    price_above_ema200: 1,
    rsi: 58,
    revenue_yoy: 22,
    eps_growth: 30,
    momentum: 72,
    roce: 22,
    quality_score: 80,
    trust_score: 90,
    validation_score: 85,
    ai_conviction: 88,
    opportunity_score: 80,
    pe: 22,
    dividend_yield: 1.2,
    confidence: 86,
  },
  trustScore: 90,
  validationScore: 85,
  aiConviction: 88,
  opportunityScore: 80,
};

const failCandidate: StrategyUniverseCandidate = {
  ticker: "WEAKCO",
  company: "Weak Co",
  sector: "Misc",
  metrics: {
    price_above_ema200: 0,
    rsi: 25,
    revenue_yoy: 2,
    momentum: 20,
    quality_score: 30,
    trust_score: 25,
    validation_score: 20,
    ai_conviction: 15,
  },
};

describe("Institutional Strategy Screener (9D.R5)", () => {
  describe("Library CRUD", () => {
    it("creates a strategy", () => {
      const def = buildStrategyFromLeaves("Alpha", [
        {
          id: "l1",
          category: "Momentum",
          field: "momentum",
          operator: "gte",
          value: 50,
        },
      ]);
      const result = createStrategy(def);
      expect(result.created).toBe(true);
      expect(result.definition?.id).toBe(def.id);
      expect(getStrategy(def.id)?.name).toBe("Alpha");
    });

    it("create is idempotent without force", () => {
      createStrategy({
        id: "idem-1",
        name: "First",
        description: "",
        root: createRuleGroup({
          id: "r",
          logic: "and",
          children: [],
        }),
      });
      const second = createStrategy({
        id: "idem-1",
        name: "Second",
        description: "",
        root: createRuleGroup({
          id: "r",
          logic: "and",
          children: [],
        }),
      });
      expect(second.skipped).toBe(true);
      expect(getStrategy("idem-1")?.name).toBe("First");
    });

    it("force create overwrites", () => {
      createStrategy({
        id: "force-1",
        name: "Old",
        description: "",
        root: createRuleGroup({ id: "r", logic: "and", children: [] }),
      });
      const forced = createStrategy(
        {
          id: "force-1",
          name: "New",
          description: "",
          root: createRuleGroup({ id: "r", logic: "and", children: [] }),
        },
        { force: true }
      );
      expect(forced.created).toBe(true);
      expect(getStrategy("force-1")?.name).toBe("New");
    });

    it("updates a strategy", () => {
      createStrategy({
        id: "upd-1",
        name: "Before",
        description: "d",
        root: createRuleGroup({ id: "r", logic: "and", children: [] }),
      });
      const updated = updateStrategy("upd-1", { name: "After", favorite: true });
      expect(updated?.name).toBe("After");
      expect(updated?.favorite).toBe(true);
    });

    it("deletes a strategy", () => {
      createStrategy({
        id: "del-1",
        name: "Gone",
        description: "",
        root: createRuleGroup({ id: "r", logic: "and", children: [] }),
      });
      expect(deleteStrategy("del-1")).toBe(true);
      expect(getStrategy("del-1")).toBeNull();
    });

    it("clones a strategy", () => {
      createStrategy({
        id: "clone-src",
        name: "Source",
        description: "desc",
        root: createRuleGroup({
          id: "r",
          logic: "and",
          children: [
            createLeafRule({
              id: "l",
              category: "Trust",
              field: "trust_score",
              operator: "gte",
              value: 70,
            }),
          ],
        }),
      });
      const cloned = cloneStrategy("clone-src", { id: "clone-dst" });
      expect(cloned?.id).toBe("clone-dst");
      expect(cloned?.name).toContain("Copy");
      expect(countRules(cloned!.root)).toBe(1);
    });
  });

  describe("Rule evaluation", () => {
    it("evaluates leaf rules", () => {
      const leaf = createLeafRule({
        id: "m",
        category: "Momentum",
        field: "momentum",
        operator: "gte",
        value: 60,
      });
      expect(evaluateRuleNode(leaf, { momentum: 72 })).toBe(true);
      expect(evaluateRuleNode(leaf, { momentum: 40 })).toBe(false);
    });

    it("evaluates between operator", () => {
      const leaf = createLeafRule({
        id: "rsi",
        category: "Momentum",
        field: "rsi",
        operator: "between",
        value: 50,
        valueTo: 70,
        label: "RSI 50–70",
      });
      expect(evaluateRuleNode(leaf, { rsi: 58 })).toBe(true);
      expect(evaluateRuleNode(leaf, { rsi: 80 })).toBe(false);
    });

    it("evaluates nested AND / OR / NOT", () => {
      const tree = createRuleGroup({
        id: "root",
        logic: "and",
        children: [
          createRuleGroup({
            id: "or-branch",
            logic: "or",
            children: [
              createLeafRule({
                id: "a",
                category: "Momentum",
                field: "momentum",
                operator: "gte",
                value: 70,
              }),
              createLeafRule({
                id: "b",
                category: "Growth",
                field: "revenue_yoy",
                operator: "gte",
                value: 20,
              }),
            ],
          }),
          createRuleGroup({
            id: "not-weak",
            logic: "not",
            children: [
              createLeafRule({
                id: "c",
                category: "Risk",
                field: "risk_flag",
                operator: "eq",
                value: 1,
              }),
            ],
          }),
        ],
      });
      expect(
        evaluateRuleNode(tree, { momentum: 40, revenue_yoy: 25, risk_flag: 0 })
      ).toBe(true);
      expect(
        evaluateRuleNode(tree, { momentum: 40, revenue_yoy: 5, risk_flag: 0 })
      ).toBe(false);
      expect(
        evaluateRuleNode(tree, { momentum: 80, revenue_yoy: 5, risk_flag: 1 })
      ).toBe(false);
    });

    it("collects matched and failed rule labels", () => {
      const tree = createRuleGroup({
        id: "g",
        logic: "and",
        children: [
          createLeafRule({
            id: "ok",
            category: "Trust",
            field: "trust_score",
            operator: "gte",
            value: 50,
            label: "Trust OK",
          }),
          createLeafRule({
            id: "bad",
            category: "Momentum",
            field: "momentum",
            operator: "gte",
            value: 90,
            label: "Momentum high",
          }),
        ],
      });
      const { matched, failed } = collectMatchedFailedRules(tree, {
        trust_score: 80,
        momentum: 40,
      });
      expect(matched).toContain("Trust OK");
      expect(failed).toContain("Momentum high");
    });
  });

  describe("Builtin templates", () => {
    it("registers all builtin templates", () => {
      const result = registerBuiltinTemplates();
      expect(result.registered).toBe(BUILTIN_TEMPLATE_IDS.length);
      const templates = listTemplates({ origin: "built-in" });
      expect(templates.length).toBe(BUILTIN_TEMPLATE_IDS.length);
      for (const id of BUILTIN_TEMPLATE_IDS) {
        expect(templates.some((t) => t.id === id)).toBe(true);
      }
    });

    it("builtin registration is idempotent without force", () => {
      registerBuiltinTemplates();
      const second = registerBuiltinTemplates();
      expect(second.registered).toBe(0);
      expect(listTemplates({ origin: "built-in" }).length).toBe(
        BUILTIN_TEMPLATE_IDS.length
      );
    });
  });

  describe("Templates", () => {
    it("saveTemplate and listTemplates for user templates", () => {
      const saved = saveTemplate({
        id: "user-tmpl",
        name: "My Template",
        description: "custom",
        origin: "user",
        root: createRuleGroup({
          id: "r",
          logic: "and",
          children: [
            createLeafRule({
              id: "l",
              category: "Value",
              field: "pe",
              operator: "lte",
              value: 20,
            }),
          ],
        }),
      });
      expect(saved.saved).toBe(true);
      expect(listTemplates({ origin: "user" }).some((t) => t.id === "user-tmpl")).toBe(
        true
      );
    });
  });

  describe("Builder helpers", () => {
    it("buildStrategyFromLeaves and summarizeRules", () => {
      const def = buildStrategyFromLeaves(
        "Builder Strat",
        [
          {
            id: "l1",
            category: "Quality",
            field: "quality_score",
            operator: "gte",
            value: 70,
            label: "Quality ≥ 70",
          },
        ],
        "and",
        { id: "builder-1", description: "from leaves" }
      );
      expect(countRules(def.root)).toBe(1);
      const summary = summarizeRules(def.root);
      expect(summary.some((s) => /Quality|quality_score/i.test(s))).toBe(true);
      const card = previewStrategy(def);
      expect(card.name).toBe("Builder Strat");
      expect(card.ruleCount).toBe(1);
      expect(card.empty).toBe(false);
    });

    it("validateRuleTree catches invalid NOT and missing field", () => {
      const bad = createRuleGroup({
        id: "n",
        logic: "not",
        children: [],
      });
      expect(validateRuleTree(bad).valid).toBe(false);

      const missingField = createLeafRule({
        id: "x",
        category: "Momentum",
        field: "",
        operator: "gte",
        value: 1,
      });
      expect(validateRuleTree(missingField).valid).toBe(false);
    });
  });

  describe("runStrategy", () => {
    it("matches stocks that pass rules and ranks cards", () => {
      const def = buildStrategyFromLeaves(
        "High Quality",
        [
          {
            id: "t",
            category: "Trust",
            field: "trust_score",
            operator: "gte",
            value: 70,
            label: "Trust ≥ 70",
          },
          {
            id: "q",
            category: "Quality",
            field: "quality_score",
            operator: "gte",
            value: 60,
            label: "Quality ≥ 60",
          },
        ],
        "and",
        { id: "hq-run" }
      );
      createStrategy(def);

      const result = runStrategy("hq-run", {
        universe: [passCandidate, failCandidate],
        resultLimit: 10,
      });

      expect(result.empty).toBe(false);
      expect(result.totalMatches).toBe(1);
      expect(result.cards[0].ticker).toBe("RELIANCE");
      expect(result.cards[0].institutionalScore).toBeGreaterThan(0);
      expect(Number.isFinite(result.cards[0].institutionalScore)).toBe(true);
    });

    it("returns No Matching Stocks when none pass", () => {
      const def = buildStrategyFromLeaves(
        "Impossible",
        [
          {
            id: "t",
            category: "Trust",
            field: "trust_score",
            operator: "gte",
            value: 99,
          },
        ],
        "and",
        { id: "none-pass" }
      );
      createStrategy(def);
      const result = runStrategy("none-pass", {
        universe: [failCandidate],
      });
      expect(result.empty).toBe(true);
      expect(result.emptyMessage).toBe(STRATEGY_EMPTY.noMatchingStocks);
      expect(result.explainability.length).toBe(1);
    });

    it("returns Awaiting Execution for empty universe", () => {
      const def = buildStrategyFromLeaves(
        "Empty Uni",
        [
          {
            id: "t",
            category: "Momentum",
            field: "momentum",
            operator: "gte",
            value: 1,
          },
        ],
        "and",
        { id: "await-1" }
      );
      createStrategy(def);
      const result = runStrategy("await-1", { universe: [] });
      expect(result.empty).toBe(true);
      expect(result.emptyMessage).toBe(STRATEGY_EMPTY.awaitingExecution);
    });

    it("returns No Strategies when id missing", () => {
      const result = runStrategy("does-not-exist", {
        universe: [passCandidate],
      });
      expect(result.empty).toBe(true);
      expect(result.emptyMessage).toBe(STRATEGY_EMPTY.noStrategies);
    });

    it("runs with inline definition without library entry", () => {
      const def = buildStrategyFromLeaves(
        "Inline",
        [
          {
            id: "m",
            category: "Momentum",
            field: "momentum",
            operator: "gte",
            value: 50,
          },
        ],
        "and",
        { id: "inline-1" }
      );
      const result = runStrategy(def, { universe: [passCandidate] });
      expect(result.empty).toBe(false);
      expect(result.cards[0].ticker).toBe("RELIANCE");
    });

    it("explainability includes matched and failed rules", () => {
      const def = buildStrategyFromLeaves(
        "Explain",
        [
          {
            id: "t",
            category: "Trust",
            field: "trust_score",
            operator: "gte",
            value: 70,
            label: "Trust gate",
          },
          {
            id: "m",
            category: "Momentum",
            field: "momentum",
            operator: "gte",
            value: 95,
            label: "Momentum gate",
          },
        ],
        "and",
        { id: "explain-1" }
      );
      createStrategy(def);
      const result = runStrategy("explain-1", {
        universe: [passCandidate],
      });
      const exp = result.explainability.find((e) => e.ticker === "RELIANCE");
      expect(exp).toBeTruthy();
      expect(exp!.matched).toContain("Trust gate");
      expect(exp!.failed).toContain("Momentum gate");
      expect(exp!.passed).toBe(false);
    });
  });

  describe("Empty states", () => {
    it("listStrategies empty context yields No Strategies message path", () => {
      expect(listStrategies()).toEqual([]);
      const card = normalizeStrategyCard({
        empty: true,
        emptyMessage: STRATEGY_EMPTY.noStrategies,
      });
      expect(card.emptyMessage).toBe(STRATEGY_EMPTY.noStrategies);
      expect(card.name).toBe(STRATEGY_EMPTY.noStrategies);
    });

    it("No Saved Templates empty card", () => {
      expect(listTemplates()).toEqual([]);
      const card = normalizeStrategyCard({
        empty: true,
        emptyMessage: STRATEGY_EMPTY.noSavedTemplates,
      });
      expect(card.emptyMessage).toBe(STRATEGY_EMPTY.noSavedTemplates);
    });
  });

  describe("Presentation normalize", () => {
    it("never emits null/undefined/NaN sentinels", () => {
      const card = normalizeStrategyCard({
        id: null,
        name: undefined,
        description: "null",
        version: "NaN",
        lastRunAt: "undefined",
        ruleCount: Number.NaN,
        tags: [null as unknown as string, "growth"],
      });
      expect(assertNoSentinelText(card.name)).toBe(true);
      expect(assertNoSentinelText(card.description)).toBe(true);
      expect(assertNoSentinelText(card.version)).toBe(true);
      expect(assertNoSentinelText(card.lastRunAt)).toBe(true);
      expect(Number.isFinite(card.ruleCount)).toBe(true);
      expect(card.tags).toEqual(["growth"]);

      const exp = normalizeStrategyExplainability({
        ticker: null,
        matched: [undefined as unknown as string, "ok"],
        failed: ["null"],
        summary: "undefined",
      });
      expect(assertNoSentinelText(exp.ticker)).toBe(true);
      expect(exp.matched).toEqual(["ok"]);
      expect(assertNoSentinelText(exp.summary)).toBe(true);
    });
  });

  describe("Public API", () => {
    it("exposes strategy APIs via AIScreener façade", () => {
      registerAIScreener({ force: true });
      expect(typeof createStrategy).toBe("function");
      expect(typeof updateStrategy).toBe("function");
      expect(typeof deleteStrategy).toBe("function");
      expect(typeof cloneStrategy).toBe("function");
      expect(typeof saveTemplate).toBe("function");
      expect(typeof runStrategy).toBe("function");
      expect(typeof listStrategies).toBe("function");
      expect(typeof listTemplates).toBe("function");
      expect(listTemplates({ origin: "built-in" }).length).toBe(
        BUILTIN_TEMPLATE_IDS.length
      );
    });
  });
});
