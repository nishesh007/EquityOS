/**
 * Institutional Earnings Data Engine — unit tests (Sprint 9B.1).
 */

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  registerEarningsData,
  getEarningsDataEngine,
  resetEarningsDataEngine,
  getQuarterlyResults,
  getAnnualResults,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getShareholding,
  getSegmentResults,
  getCorporateAnnouncements,
  getFinancialHistory,
  EarningsNormalizer,
  EarningsValidator,
  EarningsAggregator,
  resolveEarningsConfiguration,
  listEarningsDatasets,
} from "./index";

const TEST_CONFIG = {
  integrateTrustEngine: false,
  integrateDataIntegrity: false,
  integrateValidationPlatform: false,
  cacheTtlMs: 60_000,
} as const;

function sampleQuarter(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "RELI",
    company: "Reliance Industries",
    exchange: "NSE",
    isin: "INE002A01018",
    sector: "Energy",
    industry: "Oil & Gas",
    currency: "INR",
    financialYear: "FY2024",
    quarter: "Q2",
    revenue: 1000,
    otherIncome: 50,
    ebitda: 300,
    ebit: 250,
    pbt: 200,
    pat: 150,
    eps: 5.5,
    dilutedEps: 5.4,
    source: "test",
    lastUpdated: "2024-10-15T00:00:00.000Z",
    version: "1",
    ...overrides,
  };
}

function ingestSample() {
  const engine = getEarningsDataEngine(TEST_CONFIG);
  return engine.ingest({
    symbol: "RELI",
    metadata: {
      company: "Reliance Industries",
      exchange: "NSE",
      isin: "INE002A01018",
      sector: "Energy",
      industry: "Oil & Gas",
      currency: "INR",
    },
    quarterly: [
      sampleQuarter({ quarter: "Q2", financialYear: "FY2024", revenue: 1000 }),
      sampleQuarter({ quarter: "Q1", financialYear: "FY2024", revenue: 900 }),
      sampleQuarter({ quarter: "Q4", financialYear: "FY2023", revenue: 850 }),
      sampleQuarter({ quarter: "Q3", financialYear: "FY2023", revenue: 800 }),
      sampleQuarter({ quarter: "Q2", financialYear: "FY2023", revenue: 780 }),
    ],
    annual: [
      {
        symbol: "RELI",
        financialYear: "FY2024",
        currency: "INR",
        revenue: 4000,
        pat: 600,
        eps: 22,
        lastUpdated: "2024-05-01T00:00:00.000Z",
      },
      {
        symbol: "RELI",
        financialYear: "FY2023",
        currency: "INR",
        revenue: 3600,
        pat: 520,
        eps: 19,
        lastUpdated: "2023-05-01T00:00:00.000Z",
      },
      {
        symbol: "RELI",
        financialYear: "FY2022",
        currency: "INR",
        revenue: 3200,
        pat: 480,
        eps: 17,
        lastUpdated: "2022-05-01T00:00:00.000Z",
      },
    ],
    incomeStatement: [
      {
        symbol: "RELI",
        financialYear: "FY2024",
        quarter: "Q2",
        currency: "INR",
        revenue: 1000,
        pat: 150,
        lastUpdated: "2024-10-15T00:00:00.000Z",
      },
    ],
    balanceSheet: [
      {
        symbol: "RELI",
        financialYear: "FY2024",
        currency: "INR",
        debt: 500,
        cash: 200,
        netWorth: 2000,
        bookValue: 120,
        lastUpdated: "2024-10-15T00:00:00.000Z",
      },
    ],
    cashFlow: [
      {
        symbol: "RELI",
        financialYear: "FY2024",
        currency: "INR",
        operatingCashFlow: 400,
        freeCashFlow: 250,
        lastUpdated: "2024-10-15T00:00:00.000Z",
      },
    ],
    shareholding: [
      {
        symbol: "RELI",
        financialYear: "FY2024",
        quarter: "Q2",
        currency: "INR",
        promoterHolding: 50,
        fiiHolding: 22,
        diiHolding: 15,
        publicHolding: 13,
        lastUpdated: "2024-10-15T00:00:00.000Z",
      },
    ],
    segments: [
      {
        symbol: "RELI",
        financialYear: "FY2024",
        quarter: "Q2",
        currency: "INR",
        segmentName: "Refining",
        revenue: 600,
        ebit: 120,
        lastUpdated: "2024-10-15T00:00:00.000Z",
      },
    ],
    announcements: [
      {
        symbol: "RELI",
        id: "ann-1",
        title: "Q2 Results Declared",
        date: "2024-10-14",
        category: "results",
        description: "Board approved Q2 results",
        currency: "INR",
        financialYear: "FY2024",
        lastUpdated: "2024-10-14T00:00:00.000Z",
      },
    ],
  });
}

beforeEach(() => {
  resetEarningsDataEngine();
  registerEarningsData({ config: TEST_CONFIG, force: true });
});

afterEach(() => {
  resetEarningsDataEngine();
});

describe("Institutional Earnings Data Engine", () => {
  it("registers idempotently", () => {
    const first = registerEarningsData({ config: TEST_CONFIG });
    expect(first.registered).toBe(false);
    expect(first.skipped).toBe(true);

    const forced = registerEarningsData({ config: TEST_CONFIG, force: true });
    expect(forced.registered).toBe(true);
    expect(forced.datasetsRegistered).toBeGreaterThanOrEqual(12);
    expect(listEarningsDatasets().length).toBeGreaterThanOrEqual(12);
  });

  it("loads and normalizes quarterly results", () => {
    const bundle = ingestSample();
    expect(bundle.quarterly.length).toBe(5);
    expect(bundle.quarterly[0].metrics.revenue).toBe(1000);
    expect(bundle.quarterly[0].metrics.ebitda).toBe(300);
    expect(bundle.quarterly[0].metrics.pat).toBe(150);
    expect(bundle.quarterly[0].periodType).toBe("quarter");

    const quarterly = getQuarterlyResults({ symbol: "RELI" });
    expect(Array.isArray(quarterly)).toBe(true);
    expect((quarterly as unknown[]).length).toBe(5);
  });

  it("loads annual results", () => {
    ingestSample();
    const annual = getAnnualResults({ symbol: "RELI" });
    expect(Array.isArray(annual)).toBe(true);
    expect((annual as unknown[]).length).toBe(3);
  });

  it("normalizes aliased metric fields", () => {
    const normalizer = new EarningsNormalizer();
    const record = normalizer.normalizePeriod(
      {
        symbol: "TCS",
        financialYear: "2024",
        quarter: "2",
        currency: "INR",
        netSales: 500,
        netProfit: 80,
        cashFromOperations: 90,
        fcf: 70,
        promoter: 72,
        lastUpdated: "2024-01-01T00:00:00.000Z",
      },
      "quarterly_results"
    );
    expect(record.metrics.revenue).toBe(500);
    expect(record.metrics.pat).toBe(80);
    expect(record.metrics.operatingCashFlow).toBe(90);
    expect(record.metrics.freeCashFlow).toBe(70);
    expect(record.metrics.promoterHolding).toBe(72);
    expect(record.financialYear).toBe("FY2024");
    expect(record.quarter).toBe("Q2");
  });

  it("validates missing fields, invalid numbers, negatives, and duplicates", () => {
    const config = resolveEarningsConfiguration({
      ...TEST_CONFIG,
      rejectMalformed: true,
      mode: "strict",
    });
    const normalizer = new EarningsNormalizer();
    const validator = new EarningsValidator(config, normalizer);

    const good = normalizer.normalizePeriod(
      sampleQuarter(),
      "quarterly_results"
    );
    const badNegative = normalizer.normalizePeriod(
      sampleQuarter({ revenue: -10, periodKey: "FY2024-Q2-bad" }),
      "quarterly_results"
    );
    const badNumber = normalizer.normalizePeriod(
      sampleQuarter({
        periodKey: "FY2024-Q1",
        quarter: "Q1",
        revenue: Number.NaN,
      }),
      "quarterly_results"
    );
    // Force NaN into metrics (normalizer skips non-finite)
    badNumber.metrics.revenue = Number.NaN;

    const duplicate = normalizer.normalizePeriod(
      sampleQuarter(),
      "quarterly_results"
    );

    const result = validator.validatePeriods([
      good,
      badNegative,
      badNumber,
      duplicate,
    ]);

    expect(result.issues.some((i) => i.code === "NEGATIVE_VALUE")).toBe(true);
    expect(result.issues.some((i) => i.code === "INVALID_NUMBER")).toBe(true);
    expect(result.issues.some((i) => i.code === "DUPLICATE_PERIOD")).toBe(true);
    expect(result.acceptedRecords.length).toBeGreaterThanOrEqual(1);
  });

  it("aggregates latest, previous, YoY, TTM, and history views", () => {
    ingestSample();
    const engine = getEarningsDataEngine();
    const quarterly = engine.getBundle("RELI")!.quarterly;
    const aggregator = new EarningsAggregator();

    const latest = aggregator.aggregate(quarterly, "latest_quarter", "RELI");
    expect(latest.records).toHaveLength(1);
    expect(latest.records[0].quarter).toBe("Q2");
    expect(latest.records[0].financialYear).toBe("FY2024");

    const previous = aggregator.aggregate(quarterly, "previous_quarter", "RELI");
    expect(previous.records[0]?.quarter).toBe("Q1");

    const yoy = aggregator.aggregate(
      quarterly,
      "same_quarter_last_year",
      "RELI"
    );
    expect(yoy.records[0]?.financialYear).toBe("FY2023");
    expect(yoy.records[0]?.quarter).toBe("Q2");

    const ttm = aggregator.aggregate(quarterly, "ttm", "RELI");
    expect(ttm.records.length).toBe(4);
    expect(ttm.ttm?.revenue).toBe(1000 + 900 + 850 + 800);

    const hist3 = getFinancialHistory({ symbol: "RELI", years: 3 });
    expect(hist3.length).toBeGreaterThan(0);
  });

  it("attaches institutional metadata", () => {
    const bundle = ingestSample();
    expect(bundle.metadata.symbol).toBe("RELI");
    expect(bundle.metadata.exchange).toBe("NSE");
    expect(bundle.metadata.isin).toBe("INE002A01018");
    expect(bundle.metadata.sector).toBe("Energy");
    expect(bundle.metadata.industry).toBe("Oil & Gas");
    expect(bundle.metadata.currency).toBe("INR");
    expect(bundle.metadata.version).toBeTruthy();
    expect(bundle.metadata.lastUpdated).toBeTruthy();
    expect(bundle.quarterly[0].metadata.company).toBe("Reliance Industries");
  });

  it("caches reads and supports invalidation / incremental refresh", () => {
    ingestSample();
    const engine = getEarningsDataEngine();

    const first = engine.getIncomeStatement({ symbol: "RELI" });
    const second = engine.getIncomeStatement({ symbol: "RELI" });
    expect(second).toEqual(first);

    const metricsAfterHit = engine.getMetrics();
    expect(metricsAfterHit.cacheHits).toBeGreaterThanOrEqual(1);

    engine.invalidateCache("RELI");
    const refreshed = engine.incrementalRefresh("RELI", () =>
      engine.getBundle("RELI")!
    );
    expect(refreshed.refreshed).toBe(true);

    const again = engine.incrementalRefresh("RELI", () =>
      engine.getBundle("RELI")!
    );
    expect(again.refreshed).toBe(false);
  });

  it("exposes public statement and ownership APIs", () => {
    ingestSample();
    expect(getIncomeStatement({ symbol: "RELI" }).length).toBe(1);
    expect(getBalanceSheet({ symbol: "RELI" })[0]?.metrics.debt).toBe(500);
    expect(getCashFlow({ symbol: "RELI" })[0]?.metrics.freeCashFlow).toBe(250);
    expect(getShareholding({ symbol: "RELI" })[0]?.metrics.promoterHolding).toBe(
      50
    );
    expect(getSegmentResults({ symbol: "RELI" })[0]?.segmentName).toBe(
      "Refining"
    );
    expect(getCorporateAnnouncements({ symbol: "RELI" })[0]?.title).toContain(
      "Q2"
    );
  });

  it("handles missing, partial, corrupt, and unknown-period data without throwing", () => {
    const engine = getEarningsDataEngine();
    const bundle = engine.ingest({
      symbol: "INFY",
      quarterly: null,
      annual: [
        null as unknown as Record<string, unknown>,
        {
          symbol: "INFY",
          financialYear: "FY2024",
          currency: "INR",
          revenue: 100,
          lastUpdated: "2024-01-01T00:00:00.000Z",
        },
      ],
      announcements: [{ symbol: "INFY", title: "Note", date: "2024-01-01" }],
    });

    expect(bundle.errors.length).toBeGreaterThan(0);
    expect(bundle.annual.length).toBeGreaterThanOrEqual(0);
    expect(() => getQuarterlyResults({ symbol: "MISSING" })).not.toThrow();
    expect(getQuarterlyResults({ symbol: "MISSING" })).toEqual([]);
    expect(getFinancialHistory({ symbol: "MISSING" })).toEqual([]);
  });

  it("handles duplicate uploads as upsert", () => {
    const engine = getEarningsDataEngine();
    engine.ingest({
      symbol: "RELI",
      quarterly: [sampleQuarter({ revenue: 1000 })],
    });
    engine.ingest({
      symbol: "RELI",
      quarterly: [sampleQuarter({ revenue: 1100 })],
    });
    const bundle = engine.getBundle("RELI");
    expect(bundle?.quarterly[0]?.metrics.revenue).toBe(1100);
  });
});
