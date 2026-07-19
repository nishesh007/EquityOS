import type {
  MarketBreadth,
  MarketMover,
  MarketPulse,
} from "@/types";
import { marketDataService } from "@/lib/market-data";
import { formatVolume } from "@/lib/utils";
import { getCached, cacheKey, CACHE_TTL } from "@/lib/cache";

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
};

const BREADTH_UNIVERSE = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "ITC", name: "ITC" },
  { symbol: "MARUTI", name: "Maruti Suzuki" },
  { symbol: "SUNPHARMA", name: "Sun Pharma" },
  { symbol: "TATASTEEL", name: "Tata Steel" },
] as const;

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
  const movers = await enrichMovers(
    BREADTH_UNIVERSE.map(({ symbol, name }) => ({
      symbol,
      name,
      price: 0,
      changePercent: 0,
      volume: "—",
    }))
  );
  const available = movers.filter(
    (mover) => mover.quote?.availability !== "unavailable"
  );
  const advances = available.filter((mover) => mover.changePercent > 0).length;
  const declines = available.filter((mover) => mover.changePercent < 0).length;
  const unchanged = available.length - advances - declines;

  return {
    advances,
    declines,
    unchanged,
    newHighs: 0,
    newLows: 0,
    sectors: [],
    gainers: selectDirectionalMovers(available, "gainers"),
    losers: selectDirectionalMovers(available, "losers"),
    weekHighs: [],
    weekLows: [],
    mostActive: available
      .slice()
      .sort(
        (left, right) =>
          (right.quote?.volume ?? 0) - (left.quote?.volume ?? 0)
      )
      .slice(0, 5),
  };
}


function buildMarketPulse(): MarketPulse {
  return {
    indiaVix: 0,
    indiaVixChange: 0,
    institutionalFlow: { fii: 0, dii: 0, asOf: "Unavailable" },
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
