/**
 * Fundamental Data Validation — unit tests (Prompt 9F.5).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerFundamentalRules,
  resetFundamentalRuleRegistrationState,
  resetFundamentalValidationMetrics,
  getFundamentalValidationMetrics,
  buildFundamentalRules,
  validateFundamentals,
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
  validateFinancialRatios,
  validateTTM,
  validateShareholding,
  DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG,
} from "./index";

describe("Fundamental rule registration", () => {
  beforeEach(() => {
    resetFundamentalRuleRegistrationState();
    resetFundamentalValidationMetrics();
  });

  it("registers fundamental rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerFundamentalRules({ engine });
    expect(first.registered).toBeGreaterThan(10);
    const second = registerFundamentalRules({ engine });
    expect(second.registered).toBe(0);
    expect(buildFundamentalRules().length).toBe(first.total);
    expect(DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG.peMax).toBeGreaterThan(0);
  });
});

describe("Valid statements", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("accepts a coherent fundamental snapshot", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });
    const result = await validateFundamentals(
      {
        balanceSheet: {
          totalAssets: 200,
          totalLiabilities: 80,
          equity: 120,
          cash: 20,
          inventory: 10,
          receivables: 15,
          totalDebt: 40,
          currentAssets: 60,
          currentLiabilities: 30,
          workingCapital: 30,
          bookValue: 120,
          sharesOutstanding: 10,
          bookValuePerShare: 12,
        },
        incomeStatement: {
          revenue: 100,
          cogs: 40,
          grossProfit: 60,
          ebitda: 30,
          ebit: 25,
          pbt: 20,
          pat: 15,
          eps: 1.5,
          dilutedEps: 1.4,
          interest: 5,
          tax: 5,
          netMargin: 15,
        },
        cashFlow: {
          operatingCashFlow: 18,
          investingCashFlow: -8,
          financingCashFlow: -2,
          netCashFlow: 8,
          freeCashFlow: 10,
          capex: -8,
          openingCash: 12,
          closingCash: 20,
          dividendsPaid: 2,
        },
        ratios: {
          pe: 20,
          pb: 2,
          roe: 12,
          currentRatio: 2,
          debtEquity: 0.33,
        },
      },
      { engine }
    );
    expect(result.failedRules).toEqual([]);
  });
});

describe("Corrupted / missing / accounting inconsistencies", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("rejects negative assets and broken BS identity", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });
    const neg = await validateBalanceSheet(
      { balanceSheet: { totalAssets: -1, totalLiabilities: 0, equity: 0 } },
      { engine }
    );
    expect(neg.failedRules).toContain("bs.core_identity");

    const identity = await validateBalanceSheet(
      {
        balanceSheet: {
          totalAssets: 100,
          totalLiabilities: 10,
          equity: 10,
        },
      },
      { engine }
    );
    expect(identity.failedRules).toContain("bs.core_identity");
  });

  it("rejects broken income and cash-flow identities", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });
    const income = await validateIncomeStatement(
      {
        incomeStatement: {
          revenue: 100,
          cogs: 40,
          grossProfit: 10,
        },
      },
      { engine }
    );
    expect(income.failedRules).toContain("is.core_statement");

    const cf = await validateCashFlow(
      {
        cashFlow: {
          operatingCashFlow: 10,
          investingCashFlow: -2,
          financingCashFlow: -1,
          netCashFlow: 100,
        },
      },
      { engine }
    );
    expect(cf.failedRules).toContain("cf.core_statement");
  });
});

describe("Ratio validation", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("rejects impossible PE / negative EV", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });
    const result = await validateFinancialRatios(
      { ratios: { pe: 9999, enterpriseValue: -5 } },
      { engine }
    );
    expect(result.failedRules).toContain("ratio.core_bounds");
  });
});

describe("Quarterly and annual continuity", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("detects duplicate quarters and missing FY", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });

    const q = await validateFundamentals(
      {
        periods: [
          { period: "Q1-FY24", quarter: "Q1", revenue: 10 },
          { period: "Q1-FY24", quarter: "Q1", revenue: 11 },
        ],
      },
      { engine, metadata: { statementFrequency: "quarterly" } }
    );
    expect(q.failedRules).toContain("qtr.continuity");

    const a = await validateFundamentals(
      {
        periods: [
          { fiscalYear: "FY2020", year: 2020, revenue: 10 },
          { fiscalYear: "FY2022", year: 2022, revenue: 12 },
        ],
      },
      { engine, metadata: { statementFrequency: "annual" } }
    );
    expect(a.failedRules).toContain("annual.continuity");
  });
});

describe("TTM calculations", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("validates TTM revenue against last 4 quarters", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });
    const ok = await validateTTM(
      {
        ttm: { revenue: 40 },
        quarters: [
          { revenue: 10 },
          { revenue: 10 },
          { revenue: 10 },
          { revenue: 10 },
        ],
      },
      { engine }
    );
    expect(ok.failedRules).toEqual([]);

    const bad = await validateTTM(
      {
        ttmRevenue: 10,
        quarters: [
          { revenue: 10 },
          { revenue: 10 },
          { revenue: 10 },
          { revenue: 10 },
        ],
      },
      { engine }
    );
    expect(bad.failedRules).toContain("ttm.core");
  });
});

describe("Cross validation and shareholding", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("detects PAT/EPS mismatch and invalid holdings", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });

    const cross = await validateFundamentals(
      {
        incomeStatement: { pat: 100, eps: 50 },
        balanceSheet: { sharesOutstanding: 10 },
      },
      { engine }
    );
    expect(cross.failedRules).toContain("cross.pat_eps");

    const holding = await validateShareholding(
      {
        shareholding: {
          promoter: 50,
          fii: 20,
          dii: 10,
          public: 10,
          pledged: 60,
        },
      },
      { engine }
    );
    expect(holding.failedRules).toContain("holding.pattern");
  });
});

describe("Historical / growth validation", () => {
  beforeEach(() => resetFundamentalRuleRegistrationState());

  it("rejects impossible growth and flags revenue spikes", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });

    const growth = await validateFundamentals(
      { growth: { revenueGrowth: 99999 } },
      { engine }
    );
    expect(growth.failedRules).toContain("growth.bounds");

    const spike = await validateFundamentals(
      {
        current: { revenue: 1000 },
        previous: { revenue: 100 },
      },
      { engine }
    );
    expect(spike.failedRules).toContain("outlier.fundamental_spikes");
  });
});

describe("Metrics", () => {
  beforeEach(() => {
    resetFundamentalRuleRegistrationState();
    resetFundamentalValidationMetrics();
  });

  it("tracks fundamental validation metrics", async () => {
    const engine = new RuleEngine();
    registerFundamentalRules({ engine });
    await validateBalanceSheet(
      { balanceSheet: { totalAssets: -1 } },
      { engine }
    );
    const metrics = getFundamentalValidationMetrics();
    expect(metrics.companiesValidated).toBe(1);
    expect(metrics.accountingAnomalies).toBeGreaterThan(0);
  });
});
