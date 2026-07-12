import type { CompanyProfile, PeerCompany } from "@/types";
import {
  bundleToCompanyProfile,
  buildFallbackPriceHistory,
  fetchFundamentalsBundle,
  attachFundamentalsToProfile,
} from "@/lib/fundamentals";
import { isValidNseSymbol, normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import { getFullPriceHistory } from "@/lib/market";
import { marketDataService } from "@/lib/market-data";
import { isValidMarketPrice } from "@/lib/utils";
import { CACHE_TTL, cacheKey, getCached, getStaleCachedSync } from "@/lib/cache";

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

export async function fetchCompanyProfile(
  symbol: string
): Promise<CompanyProfile | null> {
  const normalized = normalizeNseSymbol(symbol);
  if (!isValidNseSymbol(normalized)) return null;
  try {
    return await getCached(
      {
        key: cacheKey("company-profile", normalized),
        ttlMs: CACHE_TTL.FUNDAMENTALS,
      },
      async () => {
        const [fundamentalsResult, quoteResult, priceHistory] = await Promise.all([
          fetchFundamentalsBundle(normalized),
          marketDataService.getEnrichedQuote(normalized).catch(() => null),
          getFullPriceHistory(normalized).catch(() => null),
        ]);

        if (!fundamentalsResult) return null;

        const bundle = fundamentalsResult.data;
        const quote = quoteResult;
        const livePrice = quote?.price ?? null;
        const resolvedPrice = isValidMarketPrice(livePrice) ? livePrice : 0;

        const history =
          priceHistory ??
          (resolvedPrice > 0
            ? buildFallbackPriceHistory(
                resolvedPrice,
                quote?.changePercent ?? bundle.changePercent
              )
            : buildFallbackPriceHistory(bundle.price, bundle.changePercent));

        const profile = bundleToCompanyProfile(bundle, history);

        const enriched = attachFundamentalsToProfile(
          {
            ...profile,
            price: resolvedPrice,
            change: quote?.change ?? profile.change,
            changePercent: quote?.changePercent ?? profile.changePercent,
            marketCap: profile.marketCap,
            sector: quote?.exchange ? profile.sector : profile.sector,
            industry: profile.industry,
            quote: quote ?? undefined,
          },
          bundle
        );

        const peers = await enrichPeersWithQuotes(enriched.peers);
        return { ...enriched, peers };
      }
    );
  } catch {
    const stale = getStaleCachedSync<CompanyProfile>(
      cacheKey("company-profile", normalized)
    );
    if (stale) return stale;
    return null;
  }
}

/** Re-export for services that need symbol coverage checks. */
export { getMockSeed, listMockSymbols } from "@/lib/fundamentals";
export { isValidNseSymbol, normalizeNseSymbol, providerSymbolMap } from "@/lib/fundamentals/symbols";
