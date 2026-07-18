import type {
  MarketBreadth,
  MarketMover,
  MarketPulse,
} from "@/types";
import { EquityIntelligenceEngine } from "@/lib/engine";
import { marketDataService } from "@/lib/market-data";
import { formatVolume } from "@/lib/utils";
import { getCached, cacheKey, CACHE_TTL } from "@/lib/cache";
import {
  fetchEngineIntradayIdeas,
  fetchEngineSwingTradeIdeas,
} from "@/services/opportunityEngine";
import type { IntradayIdea, SwingTradeIdea } from "@/types";

export const marketBreadth: MarketBreadth = {
  advances: 1328,
  declines: 914,
  unchanged: 88,
  newHighs: 126,
  newLows: 34,
  sectors: [
    { name: "Nifty IT", changePercent: 2.14, breadth: 84 },
    { name: "Nifty Auto", changePercent: 1.42, breadth: 76 },
    { name: "Nifty Metal", changePercent: 1.08, breadth: 69 },
    { name: "Nifty PSU Bank", changePercent: 0.72, breadth: 64 },
    { name: "Nifty FMCG", changePercent: 0.31, breadth: 57 },
    { name: "Nifty Realty", changePercent: -0.18, breadth: 46 },
    { name: "Nifty Pharma", changePercent: -0.63, breadth: 38 },
    { name: "Nifty Media", changePercent: -1.12, breadth: 29 },
  ],
  gainers: [
    { symbol: "COFORGE", name: "Coforge", price: 0, changePercent: 0, volume: "—" },
    { symbol: "TRENT", name: "Trent", price: 0, changePercent: 0, volume: "—" },
    { symbol: "BEL", name: "Bharat Electronics", price: 0, changePercent: 0, volume: "—" },
    { symbol: "DIXON", name: "Dixon Technologies", price: 0, changePercent: 0, volume: "—" },
    { symbol: "PERSISTENT", name: "Persistent Systems", price: 0, changePercent: 0, volume: "—" },
  ],
  losers: [
    { symbol: "DRREDDY", name: "Dr. Reddy's Labs", price: 0, changePercent: 0, volume: "—" },
    { symbol: "GODREJPROP", name: "Godrej Properties", price: 0, changePercent: 0, volume: "—" },
    { symbol: "HINDPETRO", name: "HPCL", price: 0, changePercent: 0, volume: "—" },
    { symbol: "CIPLA", name: "Cipla", price: 0, changePercent: 0, volume: "—" },
    { symbol: "PIDILITIND", name: "Pidilite Industries", price: 0, changePercent: 0, volume: "—" },
  ],
  weekHighs: [
    { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 0, changePercent: 0, volume: "—" },
    { symbol: "M&M", name: "Mahindra & Mahindra", price: 0, changePercent: 0, volume: "—" },
    { symbol: "HAL", name: "Hindustan Aeronautics", price: 0, changePercent: 0, volume: "—" },
  ],
  weekLows: [
    { symbol: "BANDHANBNK", name: "Bandhan Bank", price: 0, changePercent: 0, volume: "—" },
    { symbol: "IDEA", name: "Vodafone Idea", price: 0, changePercent: 0, volume: "—" },
    { symbol: "DELHIVERY", name: "Delhivery", price: 0, changePercent: 0, volume: "—" },
  ],
  mostActive: [
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 0, changePercent: 0, volume: "—" },
    { symbol: "RELIANCE", name: "Reliance Industries", price: 0, changePercent: 0, volume: "—" },
    { symbol: "ICICIBANK", name: "ICICI Bank", price: 0, changePercent: 0, volume: "—" },
    { symbol: "TATASTEEL", name: "Tata Steel", price: 0, changePercent: 0, volume: "—" },
    { symbol: "INFY", name: "Infosys", price: 0, changePercent: 0, volume: "—" },
  ],
};

export async function fetchIntradayIdeas(): Promise<IntradayIdea[]> {
  return fetchEngineIntradayIdeas();
}

export async function fetchSwingTradeIdeas(): Promise<SwingTradeIdea[]> {
  return fetchEngineSwingTradeIdeas();
}

async function enrichMovers(movers: MarketMover[], volumeLabel?: "shares" | "turnover") {
  const quoteMap = await marketDataService.getEnrichedQuotes(
    movers.map((mover) => mover.symbol)
  );

  return movers.map((mover) => {
    const quote =
      quoteMap.get(mover.symbol) ?? quoteMap.get(mover.symbol.toUpperCase());
    if (!quote) return mover;

    return {
      ...mover,
      price: quote.price ?? 0,
      changePercent: quote.changePercent ?? 0,
      volume:
        volumeLabel === "turnover"
          ? quote.volume
            ? `₹${formatVolume(quote.volume)}`
            : "—"
          : quote.volume
            ? formatVolume(quote.volume)
            : "—",
      quote,
    };
  });
}

export function selectDirectionalMovers(
  movers: MarketMover[],
  direction: "gainers" | "losers",
  limit = 5
): MarketMover[] {
  return movers
    .filter((mover) =>
      direction === "gainers"
        ? mover.changePercent > 0
        : mover.changePercent < 0
    )
    .sort((a, b) =>
      direction === "gainers"
        ? b.changePercent - a.changePercent
        : a.changePercent - b.changePercent
    )
    .slice(0, limit);
}

async function buildLiveMarketBreadth(): Promise<MarketBreadth> {
  const [gainers, losers, weekHighs, weekLows, mostActive] = await Promise.all([
    enrichMovers(marketBreadth.gainers),
    enrichMovers(marketBreadth.losers),
    enrichMovers(marketBreadth.weekHighs),
    enrichMovers(marketBreadth.weekLows),
    enrichMovers(marketBreadth.mostActive, "turnover"),
  ]);

  return {
    ...marketBreadth,
    gainers: selectDirectionalMovers(gainers, "gainers"),
    losers: selectDirectionalMovers(losers, "losers"),
    weekHighs,
    weekLows,
    mostActive,
  };
}


function buildMarketPulse(): MarketPulse {
  const breadthScore = EquityIntelligenceEngine.calculateBreadthScore(marketBreadth).breadth
    .normalizedScore;

  return {
    indiaVix: 0,
    indiaVixChange: 0,
    institutionalFlow: {
      fii: 3240,
      dii: 1185,
      asOf: "11 Jul",
    },
    putCallRatio: 1.18,
    marketTrend: "Bullish",
    breadthScore,
  };
}

async function buildLiveMarketPulse(): Promise<MarketPulse> {
  const vixQuote = await marketDataService.getEnrichedQuote("INDIAVIX");
  const base = buildMarketPulse();

  return {
    ...base,
    indiaVix: vixQuote.price ?? 0,
    indiaVixChange: vixQuote.changePercent ?? 0,
    vixQuote,
  };
}

export const marketPulse = buildMarketPulse();

export async function fetchMarketBreadth(): Promise<MarketBreadth> {
  return getCached(
    { key: cacheKey("market-breadth"), ttlMs: CACHE_TTL.QUOTE },
    buildLiveMarketBreadth
  );
}

export async function fetchMarketPulse(): Promise<MarketPulse> {
  return getCached(
    { key: cacheKey("market-pulse"), ttlMs: CACHE_TTL.QUOTE },
    buildLiveMarketPulse
  );
}
