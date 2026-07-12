/**
 * FMP fundamentals provider — primary when FMP_API_KEY is configured.
 */

import { fmpAdapter } from "@/lib/adapters/financial-modeling-prep";
import { hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import { generateCorporateActions } from "@/lib/fundamentals/corporate-actions";
import {
  fmpIncomeToAnnualFinancials,
  fmpIncomeToQuarterly,
  formatFmpMarketCap,
  normalizeFmpStatements,
} from "@/lib/fundamentals/fmp-normalizer";
import { calculateGrowthFromStatements } from "@/lib/fundamentals/growth-engine";
import { getMockSeed } from "@/lib/fundamentals/mock-data";
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
    const seed = getMockSeed(normalized);

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
    const ratios = mergeRatios(ratiosFromFmpKeyMetrics(latestMetrics), {
      pe: seed?.financials.pe,
      pb: seed?.financials.pb,
    });

    const annualFinancials = fmpIncomeToAnnualFinancials(incomeAnnual.data);
    const quarterlyBase = fmpIncomeToQuarterly(incomeQuarterly.data);
    const quarterlyResults =
      quarterlyBase.length > 0
        ? enrichQuarterlyResults(quarterlyBase)
        : seed
          ? enrichQuarterlyResults(seed.quarterlyResults)
          : [];

    const growth = calculateGrowthFromStatements(
      statements.income,
      statements.cashflow,
      annualFinancials.length ? annualFinancials : (seed?.annualFinancials ?? [])
    );

    const revenueCr =
      annualFinancials[0] ? parseInrCrores(annualFinancials[0].revenue) : seed ? parseInrCrores(seed.financials.revenue) : 0;
    const profitCr =
      annualFinancials[0] ? parseInrCrores(annualFinancials[0].netProfit) : seed ? parseInrCrores(seed.financials.netProfit) : 0;

    const financials = buildCompanyFinancials(ratios, growth, revenueCr, profitCr);
    const shareholdingBase = seed?.shareholding ?? {
      promoter: 0,
      fii: 0,
      dii: 0,
      public: 100,
      lastUpdated: "Latest",
    };
    const corporateActions = generateCorporateActions(normalized);
    const news = seed?.news ?? [];
    const notes = seed?.notes ?? [];
    const peers = seed?.peers ?? [];
    const valuation = buildValuationMetrics(ratios);

    return {
      symbol: normalized,
      name: profile.companyName ?? seed?.name ?? normalized,
      sector: profile.sector ?? seed?.sector ?? "—",
      industry: profile.industry ?? seed?.industry ?? "—",
      description: profile.description ?? seed?.description ?? "",
      website: profile.website?.replace(/^https?:\/\//, "") ?? seed?.website ?? "",
      founded: profile.ipoDate?.slice(0, 4) ?? seed?.founded ?? "—",
      employees: profile.fullTimeEmployees
        ? `${profile.fullTimeEmployees.toLocaleString("en-IN")}+`
        : (seed?.employees ?? "—"),
      marketCap: formatFmpMarketCap(profile.mktCap) || (seed?.marketCap ?? "—"),
      price: profile.price ?? seed?.price ?? 0,
      change: seed?.change ?? 0,
      changePercent: seed?.changePercent ?? 0,
      financials,
      statements,
      ratios,
      growth,
      quarterlyResults,
      annualFinancials: annualFinancials.length ? annualFinancials : (seed?.annualFinancials ?? []),
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
