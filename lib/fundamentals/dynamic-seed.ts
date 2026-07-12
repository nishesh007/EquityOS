/**
 * Dynamic fundamentals seed — generates deterministic profiles for any valid NSE symbol.
 */

import { round } from "@/lib/engine/utils";
import { getMockSeed } from "@/lib/fundamentals/mock-data";
import { getNseSymbolMeta } from "@/lib/fundamentals/nse-registry";
import { normalizeNseSymbol, toDisplaySymbol } from "@/lib/fundamentals/symbols";
import { createRng, hashSeed } from "@/lib/random";
import type {
  AnnualFinancial,
  CompanyFinancials,
  CompanyProfile,
  QuarterlyResult,
  ShareholdingPattern,
  ValuationMetric,
} from "@/types";

function formatName(symbol: string): string {
  return `${symbol.charAt(0)}${symbol.slice(1).toLowerCase()} Ltd`;
}

function buildQuarterlyFromAnnual(
  revenueCr: number,
  profitCr: number,
  eps: number,
  margin: number,
  rng: () => number
): QuarterlyResult[] {
  const quarters = ["Q4 FY25", "Q3 FY25", "Q2 FY25", "Q1 FY25"];
  return quarters.map((quarter, index) => {
    const factor = 0.22 + rng() * 0.06 + index * 0.01;
    return {
      quarter,
      revenue: `₹${Math.round(revenueCr * factor).toLocaleString("en-IN")} Cr`,
      netProfit: `₹${Math.round(profitCr * factor).toLocaleString("en-IN")} Cr`,
      eps: round(eps * factor * 4, 1),
      margin: round(margin + (index - 1.5) * 0.3, 1),
    };
  });
}

function buildAnnualFinancials(
  revenueCr: number,
  profitCr: number,
  eps: number,
  roe: number
): AnnualFinancial[] {
  return ["FY25", "FY24", "FY23"].map((year, index) => {
    const factor = 1 - index * 0.08;
    return {
      year,
      revenue:
        revenueCr * factor >= 100_000
          ? `₹${round((revenueCr * factor) / 100_000, 2)}L Cr`
          : `₹${Math.round(revenueCr * factor).toLocaleString("en-IN")} Cr`,
      netProfit: `₹${Math.round(profitCr * factor).toLocaleString("en-IN")} Cr`,
      eps: round(eps * factor, 1),
      roe: round(roe - index * 0.6, 1),
    };
  });
}

function buildValuation(financials: CompanyFinancials): ValuationMetric[] {
  return [
    {
      label: "P/E Ratio",
      value: `${financials.pe}x`,
      industryAvg: `${round(financials.pe * 0.88, 1)}x`,
      status: financials.pe > 30 ? "overvalued" : financials.pe < 18 ? "undervalued" : "fair",
    },
    {
      label: "P/B Ratio",
      value: `${financials.pb}x`,
      industryAvg: `${round(financials.pb * 0.9, 1)}x`,
      status: financials.pb > 5 ? "overvalued" : "fair",
    },
    {
      label: "ROE",
      value: `${financials.roe}%`,
      industryAvg: "15.0%",
      status: financials.roe >= 15 ? "undervalued" : "fair",
    },
    {
      label: "Dividend Yield",
      value: `${round(0.4 + financials.pe * 0.02, 2)}%`,
      industryAvg: "1.0%",
      status: "fair",
    },
  ];
}

/**
 * Resolve fundamentals seed: static mock → NSE registry → deterministic synthesis.
 */
export function resolveFundamentalsSeed(
  symbol: string
): Omit<CompanyProfile, "priceHistory"> {
  const normalized = normalizeNseSymbol(symbol);
  const staticSeed = getMockSeed(normalized);
  if (staticSeed) return staticSeed;

  const meta = getNseSymbolMeta(normalized);
  const rng = createRng(hashSeed(`fundamentals-seed-${normalized}`));
  const displaySymbol = toDisplaySymbol(normalized);

  const price = meta?.price && meta.price > 0 ? meta.price : round(50 + rng() * 8000, 2);
  const changePercent = meta?.changePercent ?? round((rng() - 0.5) * 3, 2);
  const change = round(price * (changePercent / 100), 2);

  const revenueCr = meta
    ? parseRevenueCr(meta.marketCap) * (0.08 + rng() * 0.12)
    : round(500 + rng() * 50_000);
  const margin = round(5 + rng() * 20, 1);
  const profitCr = round(revenueCr * (margin / 100));
  const eps = round(5 + rng() * 120, 1);
  const pe = round(12 + rng() * 45, 1);
  const pb = round(1 + rng() * 8, 1);
  const roe = round(8 + rng() * 28, 1);
  const roce = round(roe * (0.85 + rng() * 0.3), 1);
  const revenueGrowth = round(2 + rng() * 22, 1);
  const profitGrowth = round(revenueGrowth * (0.7 + rng() * 0.6), 1);

  const financials: CompanyFinancials = {
    revenue:
      revenueCr >= 100_000
        ? `₹${round(revenueCr / 100_000, 2)}L Cr`
        : `₹${Math.round(revenueCr).toLocaleString("en-IN")} Cr`,
    revenueGrowth,
    netProfit: `₹${Math.round(profitCr).toLocaleString("en-IN")} Cr`,
    netProfitGrowth: profitGrowth,
    roe,
    roce,
    pe,
    pb,
    debtToEquity: round(rng() * 1.5, 2),
  };

  const shareholding: ShareholdingPattern = {
    promoter: round(25 + rng() * 50, 2),
    fii: round(10 + rng() * 30, 2),
    dii: round(8 + rng() * 25, 2),
    public: round(5 + rng() * 20, 2),
    lastUpdated: "Mar 2026",
  };
  const publicPct = round(Math.max(0, 100 - shareholding.promoter - shareholding.fii - shareholding.dii), 2);
  shareholding.public = publicPct;

  return {
    symbol: normalized,
    name: meta?.name ?? formatName(normalized),
    price,
    change,
    changePercent,
    marketCap: meta?.marketCap ?? `₹${round(revenueCr * pe / 1000, 1)}L Cr`,
    sector: meta?.sector ?? "Equities",
    industry: meta?.industry ?? "Listed Company",
    description:
      meta?.description ??
      `${displaySymbol} is a listed company on the National Stock Exchange of India (NSE). Fundamentals are synthesized from available market data.`,
    website: meta?.website ?? `${normalized.toLowerCase()}.com`,
    founded: `${1980 + Math.floor(rng() * 30)}`,
    employees: `${Math.round(1000 + rng() * 200_000).toLocaleString("en-IN")}+`,
    financials,
    quarterlyResults: buildQuarterlyFromAnnual(revenueCr, profitCr, eps, margin, rng),
    annualFinancials: buildAnnualFinancials(revenueCr, profitCr, eps, roe),
    shareholding,
    peers: [],
    valuation: buildValuation(financials),
    news: [
      {
        id: "1",
        title: `${meta?.name ?? normalized} in focus on NSE`,
        source: "EquityOS",
        timestamp: "Today",
        summary: "Company page generated from NSE symbol lookup with fundamentals engine fallback.",
      },
    ],
    notes: [],
  };
}

function parseRevenueCr(marketCap: string): number {
  const val = Number.parseFloat(marketCap.replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(val)) return 10_000;
  return marketCap.includes("L Cr") ? val * 100_000 * 0.05 : val * 0.05;
}
