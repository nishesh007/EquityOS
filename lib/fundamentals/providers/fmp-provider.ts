/**
 * FMP fundamentals provider — primary when FMP_API_KEY is configured.
 */

import { fmpAdapter } from "@/lib/adapters/financial-modeling-prep";
import { hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import {
  fmpIncomeToAnnualFinancials,
  fmpIncomeToQuarterly,
  formatFmpMarketCap,
  normalizeFmpStatements,
} from "@/lib/fundamentals/fmp-normalizer";
import { calculateGrowthFromStatements } from "@/lib/fundamentals/growth-engine";
import {
  buildCompanyFinancials,
  buildValuationMetrics,
  parseInrCrores,
} from "@/lib/fundamentals/normalize";
import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import { mergeRatios, ratiosFromFmpKeyMetrics } from "@/lib/fundamentals/ratios-engine";
import {
  derivePreviousShareholding,
  enrichShareholding,
} from "@/lib/fundamentals/shareholding-engine";
import { buildCompanyTimeline } from "@/lib/fundamentals/timeline-engine";
import type { FundamentalsBundle, FundamentalsProvider } from "@/lib/fundamentals/types";

export class FMPFundamentalsProvider implements FundamentalsProvider {
  readonly name = "FMP";
  readonly tier;

  constructor(tier: "primary" | "secondary" = "primary") {
    this.tier = tier;
  }

  isAvailable(): boolean {
    const config = loadProviderConfig();
    return hasApiKey(config.fmp.apiKey);
  }

  async fetchFundamentals(symbol: string): Promise<FundamentalsBundle> {
    const normalized = symbol.toUpperCase();

    const [profile, incomeAnnual, incomeQuarterly, balanceAnnual, cashflowAnnual, keyMetrics] =
      await Promise.all([
        fmpAdapter.fetchProfile(normalized),
        fmpAdapter.fetch({ symbol: normalized, endpoint: "income" }),
        fmpAdapter.fetch({ symbol: normalized, endpoint: "income-quarterly" }),
        fmpAdapter.fetch({ symbol: normalized, endpoint: "balance" }),
        fmpAdapter.fetch({ symbol: normalized, endpoint: "cashflow" }),
        fmpAdapter.fetch({ symbol: normalized, endpoint: "key-metrics" }),
      ]);

    const statements = normalizeFmpStatements(
      incomeAnnual.data,
      incomeQuarterly.data,
      balanceAnnual.data,
      cashflowAnnual.data
    );

    const metricsRows = Array.isArray(keyMetrics.data) ? keyMetrics.data : [];
    const latestMetrics = (metricsRows[0] ?? {}) as Record<string, unknown>;
    const ratios = mergeRatios(ratiosFromFmpKeyMetrics(latestMetrics), {});

    const annualFinancials = fmpIncomeToAnnualFinancials(incomeAnnual.data);
    const quarterlyBase = fmpIncomeToQuarterly(incomeQuarterly.data);
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
    const valuation = buildValuationMetrics(ratios);

    return {
      symbol: normalized,
      name: profile.companyName ?? normalized,
      sector: profile.sector ?? "—",
      industry: profile.industry ?? "—",
      description: profile.description ?? "",
      website: profile.website?.replace(/^https?:\/\//, "") ?? "",
      founded: profile.ipoDate?.slice(0, 4) ?? "—",
      employees: profile.fullTimeEmployees
        ? `${profile.fullTimeEmployees.toLocaleString("en-IN")}+`
        : "—",
      marketCap: formatFmpMarketCap(profile.mktCap) || "—",
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
      valuation,
      peers,
      news,
      notes,
      provider: this.name,
      source: "live",
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function createFMPFundamentalsProvider(
  tier: "primary" | "secondary" = "primary"
): FMPFundamentalsProvider {
  return new FMPFundamentalsProvider(tier);
}
