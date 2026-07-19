import type {
  MarketBreadth,
  MarketPulse,
} from "@/types";
import {
  runMarketBreadthEngine,
  type BreadthUniverseId,
  type MarketBreadthSnapshot,
} from "@/lib/market-breadth";
import { marketDataService } from "@/lib/market-data";
import { getCached, cacheKey, CACHE_TTL } from "@/lib/cache";
import {
  fetchPortfolioSummary,
  fetchWatchlist,
} from "@/services/marketData";

function snapshotToMarketBreadth(
  snapshot: MarketBreadthSnapshot
): MarketBreadth {
  return {
    advances: snapshot.advances,
    declines: snapshot.declines,
    unchanged: snapshot.unchanged,
    newHighs: snapshot.newHighs52w,
    newLows: snapshot.newLows52w,
    sectors: snapshot.sectorBreadth,
    gainers: snapshot.gainers,
    losers: snapshot.losers,
    weekHighs: snapshot.weekHighs,
    weekLows: snapshot.weekLows,
    mostActive: snapshot.mostActive,
    universe: snapshot.universe,
    universeLabel: snapshot.universeLabel,
    totalStocks: snapshot.totalStocks,
    quotedStocks: snapshot.quotedStocks,
    advanceDeclineRatio: snapshot.advanceDeclineRatio,
    breadthPercent: snapshot.breadthPercent,
    netAdvances: snapshot.netAdvances,
    marketMood: snapshot.marketMood,
    participationPercent: snapshot.participationPercent,
    aboveEma20: snapshot.aboveEma20,
    aboveEma50: snapshot.aboveEma50,
    aboveEma200: snapshot.aboveEma200,
    averageRsi: snapshot.averageRsi,
    averageDailyReturn: snapshot.averageDailyReturn,
    breadthTrend5d: snapshot.breadthTrend5d,
    breadthTrend20d: snapshot.breadthTrend20d,
    technicalCoveragePercent: snapshot.technicalCoveragePercent,
    quoteCoveragePercent: snapshot.quoteCoveragePercent,
    lastUpdated: snapshot.lastUpdated,
    dataSource: snapshot.dataSource,
  };
}

export const marketBreadth: MarketBreadth = {
  advances: 0,
  declines: 0,
  unchanged: 0,
  newHighs: 0,
  newLows: 0,
  sectors: [],
  gainers: [],
  losers: [],
  weekHighs: [],
  weekLows: [],
  mostActive: [],
  universe: "nse",
  universeLabel: "Entire NSE",
  totalStocks: 0,
  marketMood: "Insufficient Data",
};

async function buildLiveMarketBreadth(
  universe: BreadthUniverseId = "nse"
): Promise<MarketBreadth> {
  const [portfolio, watchlist] = await Promise.all([
    fetchPortfolioSummary(),
    fetchWatchlist(),
  ]);
  const snapshot = await runMarketBreadthEngine({
    universe,
    portfolioSymbols: portfolio.holdings.map((h) => h.symbol),
    watchlistSymbols: watchlist.map((item) => item.symbol),
  });
  return snapshotToMarketBreadth(snapshot);
}

function buildMarketPulse(): MarketPulse {
  return {
    indiaVix: 0,
    indiaVixChange: 0,
    institutionalFlow: {
      fii: 0,
      dii: 0,
      asOf: "Coming in Sprint 10D",
    },
    putCallRatio: 0,
    marketTrend: "Neutral",
    breadthScore: 0,
  };
}

async function buildLiveMarketPulse(): Promise<MarketPulse> {
  const quotes = await marketDataService.getEnrichedQuotes([
    "INDIAVIX",
    "NIFTY",
  ]);
  const vixQuote = quotes.get("INDIAVIX");
  const niftyQuote = quotes.get("NIFTY");
  const base = buildMarketPulse();
  const marketTrend =
    (niftyQuote?.changePercent ?? 0) > 0.25
      ? "Bullish"
      : (niftyQuote?.changePercent ?? 0) < -0.25
        ? "Bearish"
        : "Neutral";

  return {
    ...base,
    indiaVix: vixQuote?.price ?? 0,
    indiaVixChange: vixQuote?.changePercent ?? 0,
    vixQuote,
    marketTrend,
  };
}

export const marketPulse = buildMarketPulse();

export async function fetchMarketBreadth(
  universe: BreadthUniverseId = "nse"
): Promise<MarketBreadth> {
  const ttl =
    universe === "nse" || universe === "nifty500"
      ? CACHE_TTL.FIFTEEN_MINUTES
      : CACHE_TTL.DASHBOARD;
  return getCached(
    { key: cacheKey("market-breadth", universe), ttlMs: ttl },
    () => buildLiveMarketBreadth(universe)
  );
}

export async function fetchMarketPulse(): Promise<MarketPulse> {
  return getCached(
    { key: cacheKey("market-pulse"), ttlMs: CACHE_TTL.QUOTE },
    buildLiveMarketPulse
  );
}

/** Legacy helpers kept for tests / callers that ranked movers. */
export { selectDirectionalMovers } from "@/lib/market-breadth/movers";
