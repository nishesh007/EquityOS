import type {
  AIMarketSummary,
  MarketIndex,
  MarketNews,
  PortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";
import { marketDataService, type EnrichedQuote } from "@/lib/market-data";
import { formatVolume } from "@/lib/utils";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";

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

export const aiMarketSummary: AIMarketSummary = {
  sentiment: "bullish",
  confidence: 72,
  summary:
    "Indian equity markets are showing resilience with Nifty 50 trading near all-time highs. FII inflows remain strong at ₹3,240 Cr this week, while domestic institutional investors continue their buying streak. IT and banking sectors are leading gains, though Bank Nifty faces mild profit-booking near resistance levels.",
  keyPoints: [
    "Nifty 50 breached 24,800 with strong volume confirmation",
    "FII net buying at ₹3,240 Cr — highest in 3 weeks",
    "IT sector up 1.8% on improved US client spending outlook",
    "India VIX at 13.42 suggests low fear, potential complacency risk",
    "RBI policy decision next week — markets pricing in status quo",
  ],
  sectors: [
    { name: "IT", outlook: "positive", change: 1.82 },
    { name: "Banking", outlook: "neutral", change: -0.27 },
    { name: "Auto", outlook: "positive", change: 1.45 },
    { name: "Pharma", outlook: "negative", change: -0.68 },
    { name: "FMCG", outlook: "neutral", change: 0.12 },
  ],
};

export const marketNews: MarketNews[] = [
  {
    id: "1",
    title: "Nifty 50 Hits Fresh Record High as FIIs Pump ₹3,240 Cr",
    source: "Economic Times",
    timestamp: "2 hours ago",
    category: "Markets",
    summary:
      "Indian benchmark indices surged to new peaks driven by sustained foreign institutional buying and positive global cues.",
  },
  {
    id: "2",
    title: "RBI Expected to Hold Rates Steady in Upcoming Policy Meet",
    source: "Mint",
    timestamp: "3 hours ago",
    category: "Economy",
    summary:
      "Economists widely expect the central bank to maintain the repo rate at 6.5% amid moderating inflation.",
  },
  {
    id: "3",
    title: "TCS Wins $2.1B Deal from European Financial Services Giant",
    source: "Business Standard",
    timestamp: "5 hours ago",
    category: "Corporate",
    summary:
      "The multi-year digital transformation deal is expected to boost TCS revenue growth in FY26.",
  },
  {
    id: "4",
    title: "Crude Oil Slips Below $78 on Demand Concerns",
    source: "Reuters",
    timestamp: "6 hours ago",
    category: "Commodities",
    summary:
      "Brent crude declined as OPEC+ production increase signals and weak China data weigh on sentiment.",
  },
  {
    id: "5",
    title: "SEBI Proposes New Framework for ESG Disclosures",
    source: "Moneycontrol",
    timestamp: "8 hours ago",
    category: "Regulation",
    summary:
      "The regulator's draft norms aim to standardize sustainability reporting for listed companies.",
  },
];

export const upcomingResults: UpcomingResult[] = [
  {
    id: "1",
    company: "Reliance Industries",
    symbol: "RELIANCE",
    date: "2026-07-18",
    quarter: "Q1 FY26",
    sector: "Conglomerate",
    marketCap: "₹19.5L Cr",
  },
  {
    id: "2",
    company: "HDFC Bank",
    symbol: "HDFCBANK",
    date: "2026-07-19",
    quarter: "Q1 FY26",
    sector: "Banking",
    marketCap: "₹13.2L Cr",
  },
  {
    id: "3",
    company: "Infosys",
    symbol: "INFY",
    date: "2026-07-21",
    quarter: "Q1 FY26",
    sector: "IT",
    marketCap: "₹7.8L Cr",
  },
  {
    id: "4",
    company: "Tata Motors",
    symbol: "TATAMOTORS",
    date: "2026-07-22",
    quarter: "Q1 FY26",
    sector: "Auto",
    marketCap: "₹3.4L Cr",
  },
  {
    id: "5",
    company: "Asian Paints",
    symbol: "ASIANPAINT",
    date: "2026-07-24",
    quarter: "Q1 FY26",
    sector: "FMCG",
    marketCap: "₹2.8L Cr",
  },
  {
    id: "6",
    company: "Bajaj Finance",
    symbol: "BAJFINANCE",
    date: "2026-07-25",
    quarter: "Q1 FY26",
    sector: "NBFC",
    marketCap: "₹4.6L Cr",
  },
];

const WATCHLIST_SEED: Omit<
  WatchlistItem,
  "price" | "change" | "changePercent" | "volume" | "quote"
>[] = [
  { id: "1", symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { id: "2", symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { id: "3", symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure" },
  { id: "4", symbol: "WIPRO", name: "Wipro", sector: "IT" },
  { id: "5", symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
  { id: "6", symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
];

const PORTFOLIO_SEED = {
  holdings: [
    { id: "1", symbol: "RELIANCE", name: "Reliance Industries", quantity: 50, avgPrice: 2450 },
    { id: "2", symbol: "TCS", name: "Tata Consultancy", quantity: 30, avgPrice: 3200 },
    { id: "3", symbol: "HDFCBANK", name: "HDFC Bank", quantity: 80, avgPrice: 1580 },
    { id: "4", symbol: "INFY", name: "Infosys", quantity: 100, avgPrice: 1420 },
    { id: "5", symbol: "ICICIBANK", name: "ICICI Bank", quantity: 60, avgPrice: 980 },
  ],
};

function holdingFromQuote(
  holding: (typeof PORTFOLIO_SEED.holdings)[number],
  quote: EnrichedQuote
) {
  return {
    ...holding,
    currentPrice: quote.price ?? 0,
    changePercent: quote.changePercent ?? 0,
    quote,
  };
}

function watchlistFromQuote(
  item: (typeof WATCHLIST_SEED)[number],
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
        PORTFOLIO_SEED.holdings.map((holding) => holding.symbol)
      );
      const holdings = PORTFOLIO_SEED.holdings.map((holding) =>
        holdingFromQuote(
          holding,
          quoteMap.get(holding.symbol) ?? quoteMap.get(holding.symbol.toUpperCase())!
        )
      );

      const pricedHoldings = holdings.filter(
        (h) => h.quote.availability !== "unavailable"
      );
      const totalValue = pricedHoldings.reduce(
        (sum, h) => sum + h.currentPrice * h.quantity,
        0
      );
      const totalInvested = holdings.reduce(
        (sum, h) => sum + h.avgPrice * h.quantity,
        0
      );
      const dayChange = pricedHoldings.reduce(
        (sum, h) =>
          sum + h.currentPrice * h.quantity * (h.changePercent / 100),
        0
      );

      return {
        totalValue,
        dayChange,
        dayChangePercent:
          totalValue > 0 ? (dayChange / totalValue) * 100 : 0,
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
      const quoteMap = await marketDataService.getEnrichedQuotes(
        WATCHLIST_SEED.map((item) => item.symbol)
      );
      return WATCHLIST_SEED.map((item) =>
        watchlistFromQuote(
          item,
          quoteMap.get(item.symbol) ?? quoteMap.get(item.symbol.toUpperCase())!
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

export async function fetchMarketNews(): Promise<MarketNews[]> {
  return marketNews;
}

export async function fetchUpcomingResults(): Promise<UpcomingResult[]> {
  const {
    getEarningsCalendarService,
  } = await import("@/src/core/earnings/calendar");
  const service = getEarningsCalendarService();
  service.setMembership({
    portfolioSymbols: PORTFOLIO_SEED.holdings.map((h) => h.symbol),
    watchlistSymbols: WATCHLIST_SEED.map((w) => w.symbol),
  });
  const fromCalendar = service.toUpcomingResults();
  return fromCalendar.length > 0 ? fromCalendar : upcomingResults;
}

/** Build initial quotes map for client-side live polling */
export function buildInitialQuotesMap(
  items: Array<{ symbol: string; quote?: EnrichedQuote }>
): Record<string, EnrichedQuote> {
  const map: Record<string, EnrichedQuote> = {};
  for (const item of items) {
    if (item.quote) {
      map[item.symbol.toUpperCase()] = item.quote;
    }
  }
  return map;
}
