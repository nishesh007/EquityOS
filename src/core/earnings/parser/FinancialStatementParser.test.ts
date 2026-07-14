/**
 * Institutional Financial Statement Parser — unit tests (Sprint 9B.2).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  registerFinancialParser,
  resetFinancialParser,
  getFinancialStatementParser,
  parseIncomeStatement,
  parseBalanceSheet,
  parseCashFlow,
  parseFinancialStatements,
  validateFinancialStatements,
  getFinancialMetrics,
  FinancialLineMapper,
  FinancialNormalizer,
  computeDerivedFields,
  resolveFinancialConfiguration,
  parseFinancialNumber,
} from "./index";

const TEST_CONFIG = {
  integrateEarningsDataEngine: false,
  integrateTrustEngine: false,
  integrateDataIntegrity: false,
  integrateValidationPlatform: false,
  defaultUnit: "raw" as const,
  decimalPrecision: 2,
};

beforeEach(() => {
  resetFinancialParser();
  registerFinancialParser({ config: TEST_CONFIG, force: true });
});

afterEach(() => {
  resetFinancialParser();
});

describe("Institutional Financial Statement Parser", () => {
  it("registers idempotently", () => {
    const again = registerFinancialParser({ config: TEST_CONFIG });
    expect(again.registered).toBe(false);
    expect(again.skipped).toBe(true);

    const forced = registerFinancialParser({ config: TEST_CONFIG, force: true });
    expect(forced.registered).toBe(true);
    expect(forced.statementsRegistered).toBe(3);
    expect(forced.linesRegistered).toBeGreaterThan(20);
  });

  it("parses income statement with vendor aliases", () => {
    const parsed = parseIncomeStatement({
      symbol: "RELI",
      financialYear: "FY2024",
      quarter: "Q2",
      currency: "INR",
      unit: "raw",
      "Net Sales": 1000,
      "Other Income": 40,
      EBITDA: 300,
      Depreciation: 50,
      "Operating Profit": 250,
      "Finance Cost": 30,
      "Profit Before Tax": 220,
      Tax: 70,
      "Net Profit": 150,
      EPS: 5.5,
      "Diluted EPS": 5.4,
    });

    expect(parsed.values.revenue).toBe(1000);
    expect(parsed.values.otherIncome).toBe(40);
    expect(parsed.values.ebitda).toBe(300);
    expect(parsed.values.ebit).toBe(250);
    expect(parsed.values.pbt).toBe(220);
    expect(parsed.values.pat).toBe(150);
    expect(parsed.values.eps).toBe(5.5);
    expect(parsed.values.dilutedEps).toBe(5.4);
    expect(parsed.derived.ebitdaMargin).toBe(30);
    expect(parsed.derived.netMargin).toBe(15);
    expect(parsed.qualityFlags).toContain("ReportedValue");
    expect(parsed.qualityFlags).toContain("DerivedValue");
  });

  it("parses balance sheet and validates Assets = Liabilities + Equity", () => {
    const parsed = parseBalanceSheet({
      symbol: "RELI",
      financialYear: "FY2024",
      currency: "INR",
      unit: "raw",
      "Total Assets": 1000,
      "Current Assets": 400,
      Cash: 100,
      Debt: 300,
      "Current Liabilities": 200,
      "Non Current Liabilities": 300,
      "Share Capital": 100,
      Reserves: 400,
    });

    expect(parsed.values.totalAssets).toBe(1000);
    expect(parsed.values.netWorth).toBe(500);
    expect(parsed.values.totalLiabilities).toBe(500);
    expect(parsed.derived.netDebt).toBe(200);
    expect(parsed.derived.workingCapital).toBe(200);

    const validation = validateFinancialStatements({ balanceSheet: parsed });
    expect(
      validation.issues.some((i) => i.code === "BALANCE_SHEET_INEQUALITY")
    ).toBe(false);
    expect(validation.valid).toBe(true);
  });

  it("parses cash flow and derives free cash flow", () => {
    const parsed = parseCashFlow({
      symbol: "RELI",
      financialYear: "FY2024",
      currency: "INR",
      unit: "raw",
      "Cash from Operations": 400,
      Investing: -150,
      Financing: -50,
      Capex: 120,
      Dividend: 40,
      "Opening Cash": 80,
      "Closing Cash": 280,
      pat: 150,
    });

    expect(parsed.values.operatingCashFlow).toBe(400);
    expect(parsed.values.investingCashFlow).toBe(-150);
    expect(parsed.values.financingCashFlow).toBe(-50);
    expect(parsed.values.netCashChange).toBe(200);
    expect(parsed.derived.freeCashFlow).toBe(280);
    expect(parsed.derived.operatingCashConversion).toBeCloseTo(266.67, 1);
  });

  it("maps line-item rows via FinancialLineMapper", () => {
    const mapper = new FinancialLineMapper();
    expect(mapper.mapLabel("Operating Revenue")).toBe("revenue");
    expect(mapper.mapLabel("Business Income")).toBe("revenue");
    expect(mapper.mapLabel("Turnover")).toBe("revenue");
    expect(mapper.mapLabel("Trade Receivables")).toBe("receivables");

    const mapped = mapper.mapRows([
      { label: "Sales", value: 500 },
      { name: "PAT", value: 80 },
    ]);
    expect(mapped.revenue).toBe(500);
    expect(mapped.pat).toBe(80);
  });

  it("normalizes units, negatives, percentages and nulls", () => {
    const normalizer = new FinancialNormalizer(
      resolveFinancialConfiguration({ ...TEST_CONFIG, defaultUnit: "crores" })
    );

    expect(parseFinancialNumber("(12.5)")).toBe(-12.5);
    expect(parseFinancialNumber("1,234.50")).toBe(1234.5);
    expect(parseFinancialNumber("nil")).toBeNull();

    const crore = normalizer.normalizeValue(2, { unit: "crores" });
    expect(crore.value).toBe(20_000_000);

    const missing = normalizer.normalizeValue(null);
    expect(missing.quality).toBe("MissingData");

    const restated = normalizer.normalizeValue("100 restated");
    expect(restated.quality).toBe("RestatedValue");
  });

  it("computes derived fields", () => {
    const derived = computeDerivedFields({
      revenue: 1000,
      ebitda: 250,
      ebit: 200,
      pat: 100,
      debt: 400,
      cash: 50,
      currentAssets: 300,
      currentLiabilities: 120,
      netWorth: 800,
      sharesOutstanding: 100,
      operatingCashFlow: 180,
      capex: 60,
    });

    expect(derived.ebitdaMargin).toBe(25);
    expect(derived.operatingMargin).toBe(20);
    expect(derived.netMargin).toBe(10);
    expect(derived.netDebt).toBe(350);
    expect(derived.workingCapital).toBe(180);
    expect(derived.bookValuePerShare).toBe(8);
    expect(derived.freeCashFlow).toBe(120);
    expect(derived.cashConversion).toBe(120);
    expect(derived.quality.ebitdaMargin).toBe("DerivedValue");
  });

  it("flags balance sheet inequality and currency mismatch", () => {
    const unbalanced = parseBalanceSheet({
      symbol: "TCS",
      financialYear: "FY2024",
      currency: "INR",
      unit: "raw",
      totalAssets: 1000,
      currentLiabilities: 100,
      nonCurrentLiabilities: 100,
      shareCapital: 100,
      reserves: 100,
    });
    const income = parseIncomeStatement({
      symbol: "TCS",
      financialYear: "FY2024",
      currency: "USD",
      unit: "raw",
      revenue: 10,
      pat: 2,
    });

    const validation = validateFinancialStatements({
      balanceSheet: unbalanced,
      incomeStatement: income,
    });

    expect(
      validation.issues.some((i) => i.code === "BALANCE_SHEET_INEQUALITY")
    ).toBe(true);
    expect(validation.issues.some((i) => i.code === "CURRENCY_MISMATCH")).toBe(
      true
    );
    expect(validation.valid).toBe(false);
  });

  it("handles malformed input without throwing", () => {
    expect(() => parseIncomeStatement(null)).not.toThrow();
    expect(() => parseBalanceSheet(undefined)).not.toThrow();
    expect(() => parseCashFlow({ lines: [null as unknown as object] })).not.toThrow();

    const bundle = parseFinancialStatements({
      symbol: "INFY",
      incomeStatement: { notAFinancialField: true },
      balanceSheet: null,
      cashFlow: { symbol: "INFY", financialYear: "FY2024", currency: "INR" },
    });

    expect(bundle.parserWarnings.length).toBeGreaterThan(0);
    expect(bundle.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(getFinancialMetrics().parseRuns).toBeGreaterThan(0);
  });

  it("handles currency and unit metadata consistently", () => {
    const parsed = parseFinancialStatements({
      symbol: "HDFCBANK",
      metadata: { currency: "INR", unit: "crores", financialYear: "FY2024" },
      incomeStatement: {
        symbol: "HDFCBANK",
        financialYear: "FY2024",
        currency: "INR",
        unit: "crores",
        revenue: 2,
        pat: 0.5,
      },
      balanceSheet: {
        symbol: "HDFCBANK",
        financialYear: "FY2024",
        currency: "INR",
        unit: "crores",
        totalAssets: 10,
        debt: 3,
        cash: 1,
        currentLiabilities: 2,
        nonCurrentLiabilities: 3,
        shareCapital: 1,
        reserves: 4,
      },
      cashFlow: {
        symbol: "HDFCBANK",
        financialYear: "FY2024",
        currency: "INR",
        unit: "crores",
        operatingCashFlow: 1,
        investingCashFlow: -0.4,
        financingCashFlow: -0.2,
      },
    });

    expect(parsed.meta.currency).toBe("INR");
    expect(parsed.incomeStatement?.values.revenue).toBe(20_000_000);
    expect(parsed.validation.issues.some((i) => i.code === "CURRENCY_MISMATCH")).toBe(
      false
    );
    expect(parsed.cashFlow?.values.netCashChange).toBeCloseTo(4_000_000, 0);
  });

  it("keeps regression-stable alias mapping for major lines", () => {
    const mapper = new FinancialLineMapper();
    const cases: Array<[string, string]> = [
      ["Sales", "revenue"],
      ["Income", "revenue"],
      ["Net Sales", "revenue"],
      ["Operating Revenue", "revenue"],
      ["Business Income", "revenue"],
      ["Profit After Tax", "pat"],
      ["Cash and Cash Equivalents", "cash"],
      ["Total Debt", "debt"],
      ["Free Cash Flow", "freeCashFlow"],
      ["Capital Expenditure", "capex"],
    ];
    for (const [alias, canonical] of cases) {
      expect(mapper.mapLabel(alias)).toBe(canonical);
    }

    const engine = getFinancialStatementParser();
    const catalog = engine.listCatalog();
    expect(catalog.statements.map((s) => s.type).sort()).toEqual([
      "balance_sheet",
      "cash_flow",
      "income_statement",
    ]);
  });
});
