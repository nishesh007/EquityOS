import type {
  AIMarketSummary,
  MarketIndex,
  PortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";
import {
  createUnavailableQuote,
  marketDataService,
  type EnrichedQuote,
} from "@/lib/market-data";
import { formatVolume } from "@/lib/utils";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { fetchVerifiedMarketNews } from "@/services/verifiedMarketNews";
import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { lookupCompanyMaster } from "@/lib/company-master";
import {
  ensureBuiltinWatchlists,
  searchWatchlists,
} from "@/src/core/watchlists/WatchlistRegistry";
import type {
  WatchlistQuery,
  WatchlistRecord,
} from "@/src/core/watchlists/WatchlistModels";

function ensureDefaultWatchlists(now?: Date | null): WatchlistRecord[] {
  return ensureBuiltinWatchlists(now);
}

function getWatchlists(query?: WatchlistQuery | null): WatchlistRecord[] {
  return searchWatchlists(query ?? undefined);
}

/**
 * Local portfolio implementation — broker integration is unavailable, so the
 * previous working local holdings remain the portfolio source. Live quotes
 * are overlaid at fetch time.
 */
const LOCAL_PORTFOLIO = {
  holdings: [
    { id: "1", symbol: "RELIANCE", name: "Reliance Industries", quantity: 50, avgPrice: 2450 },
    { id: "2", symbol: "TCS", name: "Tata Consultancy", quantity: 30, avgPrice: 3200 },
    { id: "3", symbol: "HDFCBANK", name: "HDFC Bank", quantity: 80, avgPrice: 1580 },
    { id: "4", symbol: "INFY", name: "Infosys", quantity: 100, avgPrice: 1420 },
    { id: "5", symbol: "ICICIBANK", name: "ICICI Bank", quantity: 60, avgPrice: 980 },
  ],
};

function holdingFromQuote(
  holding: (typeof LOCAL_PORTFOLIO.holdings)[number],
  quote: EnrichedQuote
) {
  return {
    ...holding,
    currentPrice: quote.price ?? 0,
    changePercent: quote.changePercent ?? 0,
    quote,
  };
}

const INDEX_META: Record<
  string,
  { id: string; name: string; sparkline: number[] }
> = {
  NIFTY: { id: "nifty50", name: "Nifty 50", sparkline: [] },
  SENSEX: { id: "sensex", name: "Sensex", sparkline: [] },
  BANKNIFTY: { id: "banknifty", name: "Bank Nifty", sparkline: [] },
  INDIAVIX: { id: "indiavix", name: "India VIX", sparkline: [] },
};

function buildSparkline(low: number, ltp: number, high: number): number[] {
  const mid = (low + ltp) / 2;
  return [low, mid, ltp, mid, high, ltp];
}

async function resolveIndex(symbol: string): Promise<MarketIndex> {
  const meta = INDEX_META[symbol];
  const enriched = await marketDataService.getEnrichedIndex(symbol);
  const value = enriched.price ?? 0;
  const change = enriched.change ?? 0;
  const changePercent = enriched.changePercent ?? 0;

  return {
    id: meta?.id ?? symbol.toLowerCase(),
    name: meta?.name ?? symbol,
    symbol,
    value,
    change,
    changePercent,
    high: enriched.high ?? (value > 0 ? value + Math.abs(change) : 0),
    low: enriched.low ?? (value > 0 ? value - Math.abs(change) : 0),
    sparkline:
      value > 0
        ? buildSparkline(
            enriched.low ?? value - Math.abs(change),
            value,
            enriched.high ?? value + Math.abs(change)
          )
        : [],
    quote: enriched,
  };
}

function watchlistFromQuote(
  item: Omit<
    WatchlistItem,
    "price" | "change" | "changePercent" | "volume" | "quote"
  >,
  quote: EnrichedQuote
): WatchlistItem {
  return {
    ...item,
    price: quote.price ?? 0,
    change: quote.change ?? 0,
    changePercent: quote.changePercent ?? 0,
    volume: quote.volume ? formatVolume(quote.volume) : "—",
    quote,
  };
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  return getCached(
    { key: cacheKey("market-indices"), ttlMs: CACHE_TTL.QUOTE },
    async () => {
      const symbols = ["NIFTY", "SENSEX", "BANKNIFTY", "INDIAVIX"];
      return Promise.all(symbols.map((s) => resolveIndex(s)));
    }
  );
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  return getCached(
    { key: cacheKey("portfolio-summary"), ttlMs: CACHE_TTL.QUOTE },
    async () => {
      const quoteMap = await marketDataService.getEnrichedQuotes(
        LOCAL_PORTFOLIO.holdings.map((holding) => holding.symbol)
      );
      const holdings = LOCAL_PORTFOLIO.holdings.map((holding) =>
        holdingFromQuote(
          holding,
          quoteMap.get(holding.symbol) ??
            quoteMap.get(holding.symbol.toUpperCase()) ??
            createUnavailableQuote(holding.symbol)
        )
      );

      const pricedHoldings = holdings.filter(
        (holding) => holding.quote.availability !== "unavailable"
      );
      const totalValue = pricedHoldings.reduce(
        (sum, holding) => sum + holding.currentPrice * holding.quantity,
        0
      );
      const totalInvested = holdings.reduce(
        (sum, holding) => sum + holding.avgPrice * holding.quantity,
        0
      );
      const dayChange = pricedHoldings.reduce(
        (sum, holding) =>
          sum +
          holding.currentPrice *
            holding.quantity *
            (holding.changePercent / 100),
        0
      );

      return {
        totalValue,
        dayChange,
        dayChangePercent: totalValue > 0 ? (dayChange / totalValue) * 100 : 0,
        totalInvested,
        totalGain: totalValue - totalInvested,
        totalGainPercent:
          totalInvested > 0
            ? ((totalValue - totalInvested) / totalInvested) * 100
            : 0,
        holdings,
      };
    }
  );
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  return getCached(
    { key: cacheKey("watchlist"), ttlMs: CACHE_TTL.QUOTE },
    async () => {
      ensureDefaultWatchlists();
      const active =
        getWatchlists({ status: "active", pinned: true })[0] ??
        getWatchlists({ status: "active" })[0];
      const items = (active?.symbols ?? []).map((symbol) => {
        const master = lookupCompanyMaster(symbol);
        const enrichment = getCompanyEnrichment(symbol);
        return {
          id: `${active?.id ?? "watchlist"}:${symbol}`,
          symbol,
          name: master?.name ?? symbol,
          sector: enrichment?.sector ?? master?.sector ?? "Unknown",
        };
      });
      const quoteMap = await marketDataService.getEnrichedQuotes(
        items.map((item) => item.symbol)
      );
      return items.map((item) =>
        watchlistFromQuote(
          item,
          quoteMap.get(item.symbol) ??
            quoteMap.get(item.symbol.toUpperCase()) ??
            createUnavailableQuote(item.symbol)
        )
      );
    }
  );
}

function buildLiveMarketSummary(indices: MarketIndex[]): AIMarketSummary {
  const nifty = indices.find((index) => index.symbol === "NIFTY");
  const sensex = indices.find((index) => index.symbol === "SENSEX");
  const bankNifty = indices.find((index) => index.symbol === "BANKNIFTY");
  const vix = indices.find((index) => index.symbol === "INDIAVIX");

  const tracked = [nifty, sensex, bankNifty].filter(
    (index): index is MarketIndex => index !== undefined && index.value > 0
  );
  const avgChange =
    tracked.length > 0
      ? tracked.reduce((sum, index) => sum + index.changePercent, 0) /
        tracked.length
      : 0;

  const sentiment: AIMarketSummary["sentiment"] =
    avgChange > 0.25 ? "bullish" : avgChange < -0.25 ? "bearish" : "neutral";
  const confidence = Math.min(
    95,
    Math.max(45, Math.round(60 + Math.abs(avgChange) * 8))
  );

  const formatIndex = (index: MarketIndex | undefined) =>
    index && index.value > 0
      ? `${index.name} at ${index.value.toLocaleString("en-IN")} (${index.changePercent >= 0 ? "+" : ""}${index.changePercent.toFixed(2)}%)`
      : null;

  const keyPoints = [
    formatIndex(nifty),
    formatIndex(sensex),
    formatIndex(bankNifty),
    vix && vix.value > 0
      ? `India VIX at ${vix.value.toFixed(2)} (${vix.changePercent >= 0 ? "+" : ""}${vix.changePercent.toFixed(2)}%)`
      : null,
  ].filter((point): point is string => point !== null);

  const providerLabel = nifty?.quote?.provider ?? "EquityOS";

  return {
    sentiment,
    confidence,
    summary:
      tracked.length > 0
        ? `Indian equity benchmarks are ${sentiment} with an average move of ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}% across major indices. ${formatIndex(nifty) ?? "Nifty 50"} leads the tape. Data sourced from ${providerLabel}.`
        : "Live index data is temporarily unavailable. Use company-specific context and note market assumptions explicitly.",
    keyPoints:
      keyPoints.length > 0
        ? keyPoints
        : ["Live index quotes unavailable — verify market context before acting on macro views."],
    sectors: [],
  };
}

export async function fetchAIMarketSummary(): Promise<AIMarketSummary> {
  try {
    const indices = await fetchMarketIndices();
    return buildLiveMarketSummary(indices);
  } catch {
    return {
      sentiment: "neutral",
      confidence: 50,
      summary:
        "Live market summary is temporarily unavailable. Use company-specific context and note macro assumptions explicitly.",
      keyPoints: ["Index data unavailable at report generation time."],
      sectors: [],
    };
  }
}

export async function fetchMarketNews() {
  return fetchVerifiedMarketNews();
}

export async function fetchUpcomingResults(): Promise<UpcomingResult[]> {
  const {
    getEarningsCalendarService,
  } = await import("@/src/core/earnings/calendar");
  const service = getEarningsCalendarService();
  ensureDefaultWatchlists();
  const watchlistSymbols = getWatchlists({ status: "active" }).flatMap(
    (watchlist) => watchlist.symbols
  );
  service.setMembership({
    portfolioSymbols: LOCAL_PORTFOLIO.holdings.map(
      (holding) => holding.symbol
    ),
    watchlistSymbols,
  });
  const fromCalendar = service.toUpcomingResults();
  return fromCalendar;
}

/** Build initial quotes map for client-side live polling */
export { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";

