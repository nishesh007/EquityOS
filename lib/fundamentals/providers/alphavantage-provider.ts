/**
 * Alpha Vantage fundamentals provider — secondary when AV API key is configured.
 */

import { alphaVantageAdapter } from "@/lib/adapters/alphavantage";
import { hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import {
  avIncomeToAnnualFinancials,
  avIncomeToQuarterly,
  normalizeAvIncomeStatement,
  normalizeAvOverview,
} from "@/lib/fundamentals/av-normalizer";
import { formatFmpMarketCap } from "@/lib/fundamentals/fmp-normalizer";
import { calculateGrowthFromStatements } from "@/lib/fundamentals/growth-engine";
import {
  buildCompanyFinancials,
  buildValuationMetrics,
  parseInrCrores,
} from "@/lib/fundamentals/normalize";
import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import { mergeRatios, ratiosFromAlphaOverview } from "@/lib/fundamentals/ratios-engine";
import {
  derivePreviousShareholding,
  enrichShareholding,
} from "@/lib/fundamentals/shareholding-engine";
import { buildCompanyTimeline } from "@/lib/fundamentals/timeline-engine";
import type { FundamentalsBundle, FundamentalsProvider } from "@/lib/fundamentals/types";

export class AlphaVantageFundamentalsProvider implements FundamentalsProvider {
  readonly name = "AlphaVantage";
  readonly tier;

  constructor(tier: "primary" | "secondary" = "secondary") {
    this.tier = tier;
  }

  isAvailable(): boolean {
    const config = loadProviderConfig();
    return hasApiKey(config.alphaVantage.apiKey);
  }

  async fetchFundamentals(symbol: string): Promise<FundamentalsBundle> {
    const normalized = symbol.toUpperCase();

    const [overviewResult, incomeResult] = await Promise.all([
      alphaVantageAdapter.fetch({ symbol: normalized, function: "OVERVIEW" }),
      alphaVantageAdapter.fetch({ symbol: normalized, function: "INCOME_STATEMENT" }),
    ]);

    const overview = normalizeAvOverview(overviewResult.data);
    const statements = normalizeAvIncomeStatement(incomeResult.data);
    const ratios = mergeRatios(ratiosFromAlphaOverview(overviewResult.data), {
      pe: overview.pe,
      pb: overview.pb,
      roe: overview.roe,
    });

    const annualFinancials = avIncomeToAnnualFinancials(incomeResult.data);
    const quarterlyBase = avIncomeToQuarterly(incomeResult.data);
    const quarterlyResults =
      quarterlyBase.length > 0
        ? enrichQuarterlyResults(quarterlyBase)
        : [];

    const growth = calculateGrowthFromStatements(
      statements.income,
      statements.cashflow,
      annualFinancials
    );

    const revenueCr =
      annualFinancials[0] ? parseInrCrores(annualFinancials[0].revenue) : 0;
    const profitCr =
      annualFinancials[0] ? parseInrCrores(annualFinancials[0].netProfit) : 0;

    const financials = buildCompanyFinancials(ratios, growth, revenueCr, profitCr);
    const shareholdingBase = {
      promoter: 0,
      fii: 0,
      dii: 0,
      public: 100,
      lastUpdated: "Latest",
    };
    const corporateActions: FundamentalsBundle["corporateActions"] = [];
    const news: FundamentalsBundle["news"] = [];
    const notes: FundamentalsBundle["notes"] = [];
    const peers: FundamentalsBundle["peers"] = [];

    return {
      symbol: normalized,
      name: overview.name || normalized,
      sector: overview.sector || "—",
      industry: overview.industry || "—",
      description: overview.description || "",
      website: "",
      founded: "—",
      employees: "—",
      marketCap: formatFmpMarketCap(overview.marketCap) || "—",
      price: 0,
      change: 0,
      changePercent: 0,
      financials,
      statements,
      ratios,
      growth,
      quarterlyResults,
      annualFinancials,
      shareholding: enrichShareholding(
        shareholdingBase,
        derivePreviousShareholding(shareholdingBase)
      ),
      corporateActions,
      timeline: buildCompanyTimeline({
        symbol: normalized,
        quarterlyResults,
        corporateActions,
        news,
      }),
      valuation: buildValuationMetrics(ratios),
      peers,
      news,
      notes,
      provider: this.name,
      source: "live",
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function createAlphaVantageFundamentalsProvider(
  tier: "primary" | "secondary" = "secondary"
): AlphaVantageFundamentalsProvider {
  return new AlphaVantageFundamentalsProvider(tier);
}
