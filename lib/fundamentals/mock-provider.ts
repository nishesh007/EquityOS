/**
 * Mock fundamentals provider — terminal fallback, always available.
 */

import { generateCorporateActions } from "@/lib/fundamentals/corporate-actions";
import { calculateGrowthFromStatements } from "@/lib/fundamentals/growth-engine";
import { resolveFundamentalsSeed } from "@/lib/fundamentals/dynamic-seed";
import {
  buildCompanyFinancials,
  buildValuationMetrics,
  parseInrCrores,
} from "@/lib/fundamentals/normalize";
import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import { computeRatiosFromStatements, mergeRatios } from "@/lib/fundamentals/ratios-engine";
import {
  derivePreviousShareholding,
  enrichShareholding,
} from "@/lib/fundamentals/shareholding-engine";
import { buildCompanyTimeline } from "@/lib/fundamentals/timeline-engine";
import type { FundamentalsBundle, FundamentalsProvider } from "@/lib/fundamentals/types";

function seedToBundle(symbol: string): FundamentalsBundle {
  const seed = resolveFundamentalsSeed(symbol);

  const statements = { income: [], balance: [], cashflow: [] };
  const computedRatios = computeRatiosFromStatements(
    statements.income,
    statements.balance,
    statements.cashflow,
    seed.price
  );

  const ratios = mergeRatios(computedRatios, {
    pe: seed.financials.pe,
    pb: seed.financials.pb,
    roe: seed.financials.roe,
    roce: seed.financials.roce,
    debtToEquity: seed.financials.debtToEquity,
  });

  const growth = calculateGrowthFromStatements(
    statements.income,
    statements.cashflow,
    seed.annualFinancials
  );

  const enrichedQuarterly = enrichQuarterlyResults(seed.quarterlyResults);
  const previousShareholding = derivePreviousShareholding(seed.shareholding);
  const corporateActions = generateCorporateActions(symbol);
  const valuation = seed.valuation.length ? seed.valuation : buildValuationMetrics(ratios);

  const financials = buildCompanyFinancials(
    ratios,
    growth,
    parseInrCrores(seed.financials.revenue),
    parseInrCrores(seed.financials.netProfit)
  );

  return {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    industry: seed.industry,
    description: seed.description,
    website: seed.website,
    founded: seed.founded,
    employees: seed.employees,
    marketCap: seed.marketCap,
    price: seed.price,
    change: seed.change,
    changePercent: seed.changePercent,
    financials,
    statements,
    ratios,
    growth,
    quarterlyResults: enrichedQuarterly,
    annualFinancials: seed.annualFinancials,
    shareholding: enrichShareholding(seed.shareholding, previousShareholding),
    corporateActions,
    timeline: buildCompanyTimeline({
      symbol,
      quarterlyResults: enrichedQuarterly,
      corporateActions,
      news: seed.news,
    }),
    valuation,
    peers: seed.peers,
    news: seed.news,
    notes: seed.notes,
    provider: "Mock",
    source: "mock",
    fetchedAt: new Date().toISOString(),
  };
}

export class MockFundamentalsProvider implements FundamentalsProvider {
  readonly name = "Mock";
  readonly tier = "mock" as const;

  isAvailable(): boolean {
    return true;
  }

  async fetchFundamentals(symbol: string): Promise<FundamentalsBundle> {
    return seedToBundle(symbol.toUpperCase());
  }
}

export const mockFundamentalsProvider = new MockFundamentalsProvider();

export { seedToBundle as mockSeedToBundle };
