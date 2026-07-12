/**
 * Fundamentals engine — main entry point for Sprint 7B.
 */

import { CACHE_TTL, cacheKey, getCached, getStaleCachedSync } from "@/lib/cache";
import { fetchFundamentalsWithFailover } from "@/lib/fundamentals/failover";
import { mockSeedToBundle } from "@/lib/fundamentals/mock-provider";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import { toUiQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import type { FundamentalsBundle, FundamentalsFailoverResult } from "@/lib/fundamentals/types";
import type { CompanyProfile, ShareholdingPattern } from "@/types";
import { buildMockOhlc } from "@/lib/providers/mock-data";

export {
  computeFinancialFundamentals,
  enrichCompanyFinancials,
  attachFundamentalsToProfile,
} from "@/lib/fundamentals/fundamentals-engine";

export function bundleToCompanyProfile(
  bundle: FundamentalsBundle,
  priceHistory: CompanyProfile["priceHistory"]
): CompanyProfile {
  const shareholding: ShareholdingPattern = {
    promoter: bundle.shareholding.promoter,
    fii: bundle.shareholding.fii,
    dii: bundle.shareholding.dii,
    public: bundle.shareholding.public,
    lastUpdated: bundle.shareholding.lastUpdated,
  };

  return {
    symbol: bundle.symbol,
    name: bundle.name,
    price: bundle.price,
    change: bundle.change,
    changePercent: bundle.changePercent,
    marketCap: bundle.marketCap,
    sector: bundle.sector,
    industry: bundle.industry,
    description: bundle.description,
    website: bundle.website,
    founded: bundle.founded,
    employees: bundle.employees,
    financials: bundle.financials,
    priceHistory,
    quarterlyResults: toUiQuarterlyResults(bundle.quarterlyResults),
    annualFinancials: bundle.annualFinancials,
    shareholding,
    peers: bundle.peers,
    valuation: bundle.valuation,
    news: bundle.news,
    notes: bundle.notes,
  };
}

export async function fetchFundamentalsBundle(
  symbol: string
): Promise<FundamentalsFailoverResult | null> {
  const normalized = normalizeNseSymbol(symbol);

  try {
    return await getCached(
      {
        key: cacheKey("fundamentals", normalized),
        ttlMs: CACHE_TTL.FUNDAMENTALS,
      },
      () => fetchFundamentalsWithFailover(normalized)
    );
  } catch {
    const stale = getStaleCachedSync<FundamentalsFailoverResult>(
      cacheKey("fundamentals", normalized)
    );
    if (stale) return stale;

    try {
      const data = mockSeedToBundle(normalized);
      return { data, provider: "Mock", source: "mock", attempted: ["cache-miss"] };
    } catch {
      return null;
    }
  }
}

export async function fetchQuarterlyBundle(
  symbol: string
): Promise<FundamentalsBundle["quarterlyResults"] | null> {
  const normalized = normalizeNseSymbol(symbol);
  try {
    const result = await getCached(
      {
        key: cacheKey("fundamentals-quarterly", normalized),
        ttlMs: CACHE_TTL.QUARTERLY,
      },
      async () => {
        const bundle = await fetchFundamentalsWithFailover(normalized);
        return bundle.data.quarterlyResults;
      }
    );
    return result;
  } catch {
    const stale = getStaleCachedSync<FundamentalsBundle["quarterlyResults"]>(
      cacheKey("fundamentals-quarterly", normalized)
    );
    return stale;
  }
}

export async function fetchCorporateActions(
  symbol: string
): Promise<FundamentalsBundle["corporateActions"] | null> {
  const normalized = normalizeNseSymbol(symbol);
  try {
    return await getCached(
      {
        key: cacheKey("fundamentals-actions", normalized),
        ttlMs: CACHE_TTL.CORPORATE_ACTIONS,
      },
      async () => {
        const bundle = await fetchFundamentalsWithFailover(normalized);
        return bundle.data.corporateActions;
      }
    );
  } catch {
    return getStaleCachedSync(cacheKey("fundamentals-actions", normalized));
  }
}

export function buildFallbackPriceHistory(
  price: number,
  changePercent: number
): CompanyProfile["priceHistory"] {
  return buildMockOhlc(price, changePercent);
}

export type { FundamentalsBundle, FundamentalsFailoverResult };
