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
import {
  getCached,
  getCachedStaleWhileRevalidate,
  getStaleCachedSync,
  seedCache,
  cacheKey,
  CACHE_TTL,
} from "@/lib/cache";
import {
  readLastBreadthSnapshot,
  writeLastBreadthSnapshot,
} from "@/lib/market-breadth/last-snapshot";
import { emptyMarketBreadth } from "@/services/emptyMarketBreadth";
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
    moodGauge: snapshot.moodGauge,
    moodFactors: snapshot.moodFactors,
    participationPercent: snapshot.participationPercent,
    highLowRatio: snapshot.highLowRatio,
    aboveEma20: snapshot.aboveEma20,
    aboveEma50: snapshot.aboveEma50,
    aboveEma200: snapshot.aboveEma200,
    aboveEma20Pct: snapshot.aboveEma20Pct,
    aboveEma50Pct: snapshot.aboveEma50Pct,
    aboveEma200Pct: snapshot.aboveEma200Pct,
    aboveEma20Trend: snapshot.aboveEma20Trend,
    aboveEma50Trend: snapshot.aboveEma50Trend,
    aboveEma200Trend: snapshot.aboveEma200Trend,
    technicalSampleSize: snapshot.technicalSampleSize,
    averageRsi: snapshot.averageRsi,
    averageDailyReturn: snapshot.averageDailyReturn,
    strongestSector: snapshot.strongestSector,
    weakestSector: snapshot.weakestSector,
    breadthTrend5d: snapshot.breadthTrend5d,
    breadthTrend20d: snapshot.breadthTrend20d,
    technicalCoveragePercent: snapshot.technicalCoveragePercent,
    quoteCoveragePercent: snapshot.quoteCoveragePercent,
    marketStatus: snapshot.marketStatus,
    marketStatusLabel: snapshot.marketStatusLabel,
    lastUpdated: snapshot.lastUpdated,
    dataSource: snapshot.dataSource,
  };
}

export { emptyMarketBreadth as marketBreadth } from "@/services/emptyMarketBreadth";

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

function isUsableBreadthSnapshot(breadth: MarketBreadth): boolean {
  const movers =
    (breadth.gainers?.length ?? 0) +
    (breadth.losers?.length ?? 0) +
    (breadth.mostActive?.length ?? 0);
  const participation = breadth.advances + breadth.declines + breadth.unchanged;
  return (
    movers > 0 ||
    participation > 0 ||
    (breadth.sectors?.length ?? 0) > 0 ||
    (breadth.totalStocks > 0 && (breadth.quotedStocks ?? 0) > 0)
  );
}

export async function fetchMarketBreadth(
  universe: BreadthUniverseId = "nse"
): Promise<MarketBreadth> {
  const ttl =
    universe === "nse" || universe === "nifty500"
      ? CACHE_TTL.FIFTEEN_MINUTES
      : CACHE_TTL.DASHBOARD;
  const key = cacheKey("market-breadth", universe);

  // Cold process: seed memory from previous-session disk snapshot so
  // dashboard hydrate never waits on a full universe scan.
  if (!getStaleCachedSync<MarketBreadth>(key)) {
    const disk = readLastBreadthSnapshot(universe);
    if (disk && isUsableBreadthSnapshot(disk)) {
      seedCache(key, disk, ttl);
    }
  }

  const breadth = await getCachedStaleWhileRevalidate(
    { key, ttlMs: ttl },
    async () => {
      const live = await buildLiveMarketBreadth(universe);
      if (isUsableBreadthSnapshot(live)) {
        writeLastBreadthSnapshot(universe, live);
      }
      return live;
    },
    isUsableBreadthSnapshot
  );

  return breadth;
}

export async function fetchMarketPulse(): Promise<MarketPulse> {
  return getCached(
    { key: cacheKey("market-pulse"), ttlMs: CACHE_TTL.QUOTE },
    buildLiveMarketPulse
  );
}

/** Legacy helpers kept for tests / callers that ranked movers. */
export { selectDirectionalMovers } from "@/lib/market-breadth/movers";
