import type { CompanyProfile } from "@/types";
import {
  bundleToCompanyProfile,
  buildFallbackPriceHistory,
  fetchFundamentalsBundle,
  attachFundamentalsToProfile,
} from "@/lib/fundamentals";
import { isValidNseSymbol, normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import { getFullPriceHistory } from "@/lib/market";
import { marketDataService } from "@/lib/market-data";
import { getMockQuote } from "@/lib/providers/mock-data";
import { resolveMarketPrice } from "@/lib/utils";
import { CACHE_TTL, cacheKey, getCached, getStaleCachedSync } from "@/lib/cache";

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
          marketDataService.getQuote(normalized).catch(() => null),
          getFullPriceHistory(normalized).catch(() => null),
        ]);

        if (!fundamentalsResult) return null;

        const bundle = fundamentalsResult.data;
        const quote = quoteResult?.data;
        const seedQuote = getMockQuote(normalized);
        const resolvedPrice = resolveMarketPrice(quote?.ltp, seedQuote?.ltp, bundle.price);

        const history =
          priceHistory ??
          buildFallbackPriceHistory(
            resolvedPrice || quote?.ltp || bundle.price,
            quote?.changePercent ?? bundle.changePercent
          );

        const profile = bundleToCompanyProfile(bundle, history);

        const enriched = attachFundamentalsToProfile(
          {
            ...profile,
            price: resolvedPrice || profile.price,
            change: quote?.change ?? profile.change,
            changePercent: quote?.changePercent ?? profile.changePercent,
            marketCap: quote?.marketCap ?? profile.marketCap,
            sector: quote?.sector ?? profile.sector,
            industry: quote?.industry ?? profile.industry,
          },
          bundle
        );

        return enriched;
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
