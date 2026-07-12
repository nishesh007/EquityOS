import type {
  AIMarketSummary,
  MarketIndex,
  MarketNews,
  PortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";
import { marketDataService } from "@/lib/market-data";
import {
  formatVolume,
  mockQuoteToIndex,
  MOCK_INDEX_QUOTES,
} from "@/lib/providers/mock-data";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";

const INDEX_META: Record<
  string,
  { id: string; name: string; sparkline: number[] }
> = {
  NIFTY: {
    id: "nifty50",
    name: "Nifty 50",
    sparkline: [24680, 24720, 24750, 24710, 24780, 24820, 24856],
  },
  SENSEX: {
    id: "sensex",
    name: "Sensex",
    sparkline: [81280, 81400, 81520, 81450, 81600, 81700, 81742],
  },
  BANKNIFTY: {
    id: "banknifty",
    name: "Bank Nifty",
    sparkline: [53120, 53050, 52980, 52920, 52880, 52850, 52840],
  },
  INDIAVIX: {
    id: "indiavix",
    name: "India VIX",
    sparkline: [14.25, 14.1, 13.9, 13.75, 13.6, 13.5, 13.42],
  },
};

async function resolveIndex(symbol: string): Promise<MarketIndex> {
  const meta = INDEX_META[symbol];
  const fallback = MOCK_INDEX_QUOTES[symbol];

  try {
    const result = await marketDataService.getIndex(symbol);
    const quote = result.data;
    return {
      id: meta?.id ?? symbol.toLowerCase(),
      name: meta?.name ?? symbol,
      symbol,
      value: quote.ltp,
      change: quote.change,
      changePercent: quote.changePercent,
      high: quote.high,
      low: quote.low,
      sparkline: meta?.sparkline ?? [quote.low, quote.ltp],
    };
  } catch {
    if (fallback && meta) {
      return mockQuoteToIndex(fallback, meta);
    }
    throw new Error(`Index data unavailable for ${symbol}`);
  }
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

const WATCHLIST_SEED: Omit<WatchlistItem, "price" | "change" | "changePercent" | "volume">[] = [
  { id: "1", symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { id: "2", symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { id: "3", symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure" },
  { id: "4", symbol: "WIPRO", name: "Wipro", sector: "IT" },
  { id: "5", symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
  { id: "6", symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
];

const PORTFOLIO_SEED = {
  totalValue: 2847560,
  dayChange: 18420,
  dayChangePercent: 0.65,
  totalInvested: 2450000,
  totalGain: 397560,
  totalGainPercent: 16.23,
  holdings: [
    { id: "1", symbol: "RELIANCE", name: "Reliance Industries", quantity: 50, avgPrice: 2450 },
    { id: "2", symbol: "TCS", name: "Tata Consultancy", quantity: 30, avgPrice: 3200 },
    { id: "3", symbol: "HDFCBANK", name: "HDFC Bank", quantity: 80, avgPrice: 1580 },
    { id: "4", symbol: "INFY", name: "Infosys", quantity: 100, avgPrice: 1420 },
    { id: "5", symbol: "ICICIBANK", name: "ICICI Bank", quantity: 60, avgPrice: 980 },
  ],
};

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
      const holdings = await Promise.all(
        PORTFOLIO_SEED.holdings.map(async (holding) => {
          try {
            const { data: quote } = await marketDataService.getQuote(holding.symbol);
            return {
              ...holding,
              currentPrice: quote.ltp,
              changePercent: quote.changePercent,
            };
          } catch {
            return {
              ...holding,
              currentPrice: holding.avgPrice * 1.15,
              changePercent: 0,
            };
          }
        })
      );

      const totalValue = holdings.reduce(
        (sum, h) => sum + h.currentPrice * h.quantity,
        0
      );
      const totalInvested = holdings.reduce(
        (sum, h) => sum + h.avgPrice * h.quantity,
        0
      );
      const dayChange = holdings.reduce(
        (sum, h) =>
          sum + h.currentPrice * h.quantity * (h.changePercent / 100),
        0
      );

      return {
        totalValue: Math.round(totalValue),
        dayChange: Math.round(dayChange),
        dayChangePercent:
          totalValue > 0 ? Math.round((dayChange / totalValue) * 10000) / 100 : 0,
        totalInvested,
        totalGain: Math.round(totalValue - totalInvested),
        totalGainPercent:
          totalInvested > 0
            ? Math.round(((totalValue - totalInvested) / totalInvested) * 10000) / 100
            : 0,
        holdings,
      };
    }
  );
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  return getCached(
    { key: cacheKey("watchlist"), ttlMs: CACHE_TTL.QUOTE },
    async () =>
      Promise.all(
        WATCHLIST_SEED.map(async (item) => {
          try {
            const { data: quote } = await marketDataService.getQuote(item.symbol);
            return {
              ...item,
              price: quote.ltp,
              change: quote.change,
              changePercent: quote.changePercent,
              volume: formatVolume(quote.volume),
            };
          } catch {
            return {
              ...item,
              price: 0,
              change: 0,
              changePercent: 0,
              volume: "—",
            };
          }
        })
      )
  );
}

export async function fetchAIMarketSummary(): Promise<AIMarketSummary> {
  return aiMarketSummary;
}

export async function fetchMarketNews(): Promise<MarketNews[]> {
  return marketNews;
}

export async function fetchUpcomingResults(): Promise<UpcomingResult[]> {
  return upcomingResults;
}
