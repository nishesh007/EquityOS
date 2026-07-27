import type { CompanyProfile, PeerCompany } from "@/types";
import {
  bundleToCompanyProfile,
  fetchFundamentalsBundle,
  attachFundamentalsToProfile,
} from "@/lib/fundamentals";
import { isValidNseSymbol, normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { lookupCompanyMaster } from "@/lib/company-master";
import { getFullPriceHistory, emptyPriceHistory } from "@/lib/market/ohlc-engine";
import { marketDataService } from "@/lib/market-data/server";
import { resolveLiveMarketPrice } from "@/lib/fundamentals/strip-market-fields";
import { isValidMarketPrice } from "@/lib/utils";
import { CACHE_TTL, cacheKey, getCached, getStaleCachedSync } from "@/lib/cache";
import type { OhlcBar } from "@/lib/providers/types";

const EMPTY_PRICE_HISTORY: CompanyProfile["priceHistory"] = emptyPriceHistory();

function hasAnyHistoricalBars(
  history: Record<string, OhlcBar[]> | null | undefined
): boolean {
  if (!history) return false;
  return Object.values(history).some((bars) => (bars?.length ?? 0) > 0);
}

/**
 * Sparse profile from Company Master when live fundamentals fail.
 * Existence comes from master — never 404 solely because a provider missed.
 */
function buildDegradedProfile(
  symbol: string,
  priceHistory?: CompanyProfile["priceHistory"] | null
): CompanyProfile | null {
  const normalized = normalizeNseSymbol(symbol);
  const record = lookupCompanyMaster(normalized);
  if (!record) return null;

  const enrichment = getCompanyEnrichment(record.symbol);
  // No coalesce — empty slots stay empty (loading / no-data in UI).
  const history =
    priceHistory && hasAnyHistoricalBars(priceHistory)
      ? priceHistory
      : EMPTY_PRICE_HISTORY;

  return {
    symbol: record.symbol,
    name: record.name,
    price: 0,
    change: 0,
    changePercent: 0,
    marketCap: enrichment?.marketCap ?? "—",
    sector: enrichment?.sector ?? record.sector,
    industry: enrichment?.industry ?? record.industry,
    description:
      enrichment?.description ??
      `${record.name} (${record.displaySymbol}) is listed on Indian exchanges. Live fundamentals are temporarily unavailable.`,
    website: enrichment?.website ?? "",
    founded: "—",
    employees: "—",
    financials: {
      revenue: "—",
      revenueGrowth: 0,
      netProfit: "—",
      netProfitGrowth: 0,
      roe: 0,
      roce: 0,
      pe: 0,
      pb: 0,
      debtToEquity: 0,
    },
    priceHistory: history,
    quarterlyResults: [],
    annualFinancials: [],
    shareholding: {
      promoter: 0,
      fii: 0,
      dii: 0,
      public: 0,
      lastUpdated: "—",
    },
    peers: [],
    valuation: [],
    news: [],
    notes: [],
  };
}

function resolvePriceHistory(
  priceHistory: CompanyProfile["priceHistory"] | null
): CompanyProfile["priceHistory"] {
  if (!priceHistory || !hasAnyHistoricalBars(priceHistory)) {
    return EMPTY_PRICE_HISTORY;
  }
  // Pass-through — never fill empty timeframes from donors.
  return priceHistory;
}

async function enrichPeersWithQuotes(peers: PeerCompany[]): Promise<PeerCompany[]> {
  if (peers.length === 0) return peers;

  const quoteMap = await marketDataService.getEnrichedQuotes(peers.map((peer) => peer.symbol));

  return peers.map((peer) => {
    const quote = quoteMap.get(peer.symbol.toUpperCase()) ?? quoteMap.get(peer.symbol);
    return {
      ...peer,
      price: quote?.price ?? 0,
      changePercent: quote?.changePercent ?? 0,
      quote: quote ?? undefined,
    };
  });
}

async function attachLatestMarketSnapshot(
  profile: CompanyProfile,
  symbol: string
): Promise<CompanyProfile> {
  const [quote, peers] = await Promise.all([
    marketDataService.getEnrichedQuote(symbol).catch(() => null),
    enrichPeersWithQuotes(profile.peers).catch(() => profile.peers),
  ]);

  const livePrice = resolveLiveMarketPrice({ quotePrice: quote?.price });
  const liveMiss = !isValidMarketPrice(livePrice);
  if (liveMiss) {
    // Never retain fundamentals-sourced stub prices — force unavailable.
    return {
      ...profile,
      price: 0,
      change: 0,
      changePercent: 0,
      peers,
      quote: quote ?? undefined,
    };
  }

  return {
    ...profile,
    price: livePrice!,
    change: quote!.change ?? 0,
    changePercent: quote!.changePercent ?? 0,
    marketCap: quote!.marketCap ?? profile.marketCap,
    quote: quote!,
    peers,
  };
}

/**
 * Company pages stay alive when the ticker exists.
 * Fundamentals / history / quote failures degrade — they do not return null.
 */
export async function fetchCompanyProfile(
  symbol: string
): Promise<CompanyProfile | null> {
  const normalized = normalizeNseSymbol(symbol);
  if (!isValidNseSymbol(normalized)) {
    return buildDegradedProfile(normalized);
  }

  try {
    const profile = await getCached(
      {
        key: cacheKey("company-profile", normalized),
        ttlMs: CACHE_TTL.FUNDAMENTALS,
      },
      async () => {
        const [fundamentalsResult, priceHistory] = await Promise.all([
          fetchFundamentalsBundle(normalized).catch(() => null),
          getFullPriceHistory(normalized).catch(() => null),
        ]);

        const history = resolvePriceHistory(priceHistory);

        if (!fundamentalsResult) {
          return buildDegradedProfile(normalized, history);
        }

        // Fundamentals bundle has no market prices — profile starts at 0
        // until attachLatestMarketSnapshot overlays live quotes.
        const liveProfile = bundleToCompanyProfile(
          fundamentalsResult.data,
          history
        );

        return attachFundamentalsToProfile(liveProfile, fundamentalsResult.data);
      }
    );

    if (!profile) {
      return buildDegradedProfile(normalized);
    }

    return attachLatestMarketSnapshot(profile, normalized);
  } catch {
    const stale = getStaleCachedSync<CompanyProfile>(
      cacheKey("company-profile", normalized)
    );
    if (stale) {
      return attachLatestMarketSnapshot(stale, normalized);
    }
    return buildDegradedProfile(normalized);
  }
}

export { isValidNseSymbol, normalizeNseSymbol, providerSymbolMap } from "@/lib/fundamentals/symbols";
