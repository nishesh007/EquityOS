/**
 * Institutional Earnings Quality Engine — unit tests (Sprint 9B.3).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  registerQualityEngine,
  resetQualityEngine,
  analyzeEarningsQuality,
  detectAccountingIssues,
  evaluateCashFlowQuality,
  evaluateWorkingCapital,
  evaluateCapitalAllocation,
  createQualitySnapshot,
  getQualityMetrics,
  getEarningsQualityEngine,
  compareQualitySnapshots,
  resolveQualityConfiguration,
  listQualityChecks,
  type EarningsQualityInput,
} from "./index";

const TEST_CONFIG = {
  integrateEarningsDataEngine: false,
  integrateFinancialParser: false,
  integrateTrustEngine: false,
  integrateDataIntegrity: false,
  integrateValidationPlatform: false,
};

function healthyInput(overrides?: Partial<EarningsQualityInput>): EarningsQualityInput {
  return {
    symbol: "RELI",
    currency: "INR",
    current: {
      financialYear: "FY2024",
      revenue: 1000,
      otherIncome: 20,
      ebitda: 300,
      ebit: 250,
      pat: 150,
      operatingCashFlow: 160,
      freeCashFlow: 120,
      capex: 40,
      receivables: 100,
      inventory: 80,
      currentAssets: 400,
      currentLiabilities: 200,
      cash: 100,
      debt: 200,
      totalAssets: 1000,
      netWorth: 500,
      cwip: 20,
      intangibleAssets: 10,
      dividendPaid: 30,
      roce: 18,
    },
    previous: {
      financialYear: "FY2023",
      revenue: 900,
      otherIncome: 18,
      ebitda: 270,
      ebit: 230,
      pat: 140,
      operatingCashFlow: 145,
      freeCashFlow: 110,
      capex: 35,
      receivables: 95,
      inventory: 75,
      currentAssets: 380,
      currentLiabilities: 190,
      cash: 90,
      debt: 190,
      totalAssets: 950,
      netWorth: 480,
      cwip: 15,
      intangibleAssets: 8,
      dividendPaid: 25,
      roce: 17,
    },
    ...overrides,
  };
}

function stressedInput(): EarningsQualityInput {
  return {
    symbol: "WEAKCO",
    current: {
      revenue: 1000,
      otherIncome: 220,
      ebit: 80,
      pat: 120,
      operatingCashFlow: 20,
      freeCashFlow: -50,
      capex: 80,
      receivables: 250,
      inventory: 200,
      currentAssets: 150,
      currentLiabilities: 220,
      cash: 10,
      debt: 500,
      totalAssets: 800,
      netWorth: 200,
      cwip: 120,
      intangibleAssets: 100,
      dividendPaid: 40,
      roce: 8,
    },
    previous: {
      revenue: 950,
      otherIncome: 40,
      ebit: 150,
      pat: 110,
      operatingCashFlow: 100,
      freeCashFlow: 40,
      receivables: 120,
      inventory: 100,
      currentAssets: 300,
      currentLiabilities: 180,
      cash: 40,
      debt: 300,
      totalAssets: 750,
      netWorth: 250,
      roce: 14,
    },
  };
}

beforeEach(() => {
  resetQualityEngine();
  registerQualityEngine({ config: TEST_CONFIG, force: true });
});

afterEach(() => {
  resetQualityEngine();
});

describe("Institutional Earnings Quality Engine", () => {
  it("registers idempotently with builtin checks", () => {
    const again = registerQualityEngine({ config: TEST_CONFIG });
    expect(again.registered).toBe(false);
    expect(again.skipped).toBe(true);

    const forced = registerQualityEngine({ config: TEST_CONFIG, force: true });
    expect(forced.registered).toBe(true);
    expect(forced.checksRegistered).toBeGreaterThanOrEqual(10);
    expect(listQualityChecks().length).toBeGreaterThanOrEqual(10);
  });

  it("scores healthy earnings quality highly", () => {
    const result = analyzeEarningsQuality(healthyInput());
    expect(result.advisoryOnly).toBe(true);
    expect(result.score.score).toBeGreaterThanOrEqual(75);
    expect(result.score.classification).toMatch(/strong|acceptable/);
    expect(result.score.breakdown.overall).toBe(result.score.score);

    const weights = resolveQualityConfiguration().weights;
    expect(weights.cashFlowQuality).toBeCloseTo(0.25, 2);
    expect(weights.accrualQuality).toBeCloseTo(0.2, 2);
    expect(weights.redFlags).toBeCloseTo(0.05, 2);
  });

  it("detects weak cash flow quality", () => {
    const cf = evaluateCashFlowQuality({
      symbol: "X",
      current: {
        pat: 100,
        operatingCashFlow: 30,
        freeCashFlow: -20,
        capex: 50,
      },
      previous: {
        pat: 90,
        operatingCashFlow: 80,
      },
    });

    expect(cf.dimension).toBe("cashFlowQuality");
    expect(cf.score).toBeLessThan(70);
    expect(cf.signals.some((s) => s.checkId === "ocf_vs_ni")).toBe(true);
    expect(cf.signals.some((s) => s.checkId === "negative_fcf")).toBe(true);
    expect(cf.signals.some((s) => s.checkId === "cash_conversion_decline")).toBe(
      true
    );
  });

  it("detects high accruals", () => {
    const result = analyzeEarningsQuality({
      symbol: "ACCR",
      current: {
        pat: 200,
        operatingCashFlow: 40,
        revenue: 1000,
      },
    });

    expect(
      result.signals.some(
        (s) => s.checkId === "high_accruals" || s.dimension === "accrualQuality"
      )
    ).toBe(true);
    expect(result.score.breakdown.accrualQuality).toBeLessThan(80);
  });

  it("detects working capital stress and growth gaps", () => {
    const wc = evaluateWorkingCapital({
      symbol: "WC",
      current: {
        revenue: 1000,
        receivables: 300,
        inventory: 250,
        currentAssets: 100,
        currentLiabilities: 180,
      },
      previous: {
        revenue: 950,
        receivables: 150,
        inventory: 120,
        currentAssets: 280,
        currentLiabilities: 160,
      },
    });

    expect(wc.signals.some((s) => s.checkId === "receivable_growth")).toBe(true);
    expect(wc.signals.some((s) => s.checkId === "inventory_growth")).toBe(true);
    expect(wc.signals.some((s) => s.checkId === "wc_stress")).toBe(true);
    expect(wc.score).toBeLessThan(60);
  });

  it("evaluates capital allocation red flags", () => {
    const ca = evaluateCapitalAllocation({
      symbol: "DEBT",
      current: {
        debt: 600,
        operatingCashFlow: -10,
        freeCashFlow: -40,
        capex: 30,
        dividendPaid: 20,
        ebit: 50,
        netWorth: 200,
        cash: 10,
        roce: 6,
      },
      previous: {
        debt: 400,
        operatingCashFlow: 40,
        freeCashFlow: 20,
        ebit: 80,
        netWorth: 220,
        cash: 30,
        roce: 12,
      },
    });

    expect(ca.signals.some((s) => s.checkId === "debt_weak_cash")).toBe(true);
    expect(ca.signals.some((s) => s.checkId === "declining_roce")).toBe(true);
    expect(ca.score).toBeLessThan(70);
  });

  it("detects accounting red flags for one-time income and capitalization", () => {
    const issues = detectAccountingIssues({
      symbol: "FLAG",
      current: {
        revenue: 1000,
        otherIncome: 250,
        pat: 100,
        totalAssets: 500,
        cwip: 120,
        intangibleAssets: 80,
        operatingCashFlow: -20,
        freeCashFlow: -30,
      },
    });

    expect(issues.some((i) => i.checkId === "one_time_income")).toBe(true);
    expect(issues.some((i) => i.checkId === "capitalized_expenses")).toBe(true);
    expect(issues.every((i) => i.advisoryOnly === true)).toBe(true);
  });

  it("creates snapshots and detects regression", () => {
    const healthy = analyzeEarningsQuality(healthyInput());
    const weak = analyzeEarningsQuality(stressedInput());

    const baseline = createQualitySnapshot(healthy, "baseline", "baseline");
    const current = createQualitySnapshot(weak, "current", "regression");

    expect(baseline.payload.score).toBeGreaterThan(current.payload.score);

    const engine = getEarningsQualityEngine();
    const comparison = compareQualitySnapshots(baseline, current);
    expect(comparison.regressionDetected).toBe(true);
    expect(comparison.trend).toBe("degrading");
    expect(comparison.scoreDelta).toBeLessThan(0);

    // Engine compare uses configured threshold
    const viaEngine = engine.compareSnapshots(baseline, current);
    expect(viaEngine.regressionDetected).toBe(true);

    const metrics = getQualityMetrics();
    expect(metrics.analyses).toBeGreaterThanOrEqual(2);
    expect(metrics.snapshots).toBeGreaterThanOrEqual(2);
  });

  it("handles malformed input without throwing", () => {
    expect(() =>
      analyzeEarningsQuality({ symbol: "", current: {} })
    ).not.toThrow();
    expect(() =>
      analyzeEarningsQuality({
        symbol: "X",
        current: null as unknown as EarningsQualityInput["current"],
      })
    ).not.toThrow();

    const result = analyzeEarningsQuality({
      symbol: "PARTIAL",
      current: { revenue: 10 },
    });
    expect(result.advisoryOnly).toBe(true);
    expect(result.score.score).toBeGreaterThanOrEqual(0);
  });

  it("keeps weight regression stable at institutional defaults", () => {
    const cfg = resolveQualityConfiguration();
    expect(cfg.advisoryOnly).toBe(true);
    expect(cfg.weights.cashFlowQuality).toBeCloseTo(0.25, 5);
    expect(cfg.weights.accrualQuality).toBeCloseTo(0.2, 5);
    expect(cfg.weights.accountingQuality).toBeCloseTo(0.15, 5);
    expect(cfg.weights.workingCapital).toBeCloseTo(0.15, 5);
    expect(cfg.weights.capitalAllocation).toBeCloseTo(0.1, 5);
    expect(cfg.weights.margins).toBeCloseTo(0.1, 5);
    expect(cfg.weights.redFlags).toBeCloseTo(0.05, 5);

    const stressed = analyzeEarningsQuality(stressedInput());
    expect(stressed.score.score).toBeLessThan(55);
    expect(stressed.signals.length).toBeGreaterThan(3);
    expect(
      stressed.dimensions.map((d) => d.dimension).sort()
    ).toEqual(
      [
        "accountingQuality",
        "accrualQuality",
        "capitalAllocation",
        "cashFlowQuality",
        "margins",
        "redFlags",
        "workingCapital",
      ].sort()
    );
  });
});
