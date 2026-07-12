import type {
  IntradayIdea,
  MarketBreadth,
  MarketMover,
  MarketPulse,
  SwingTradeIdea,
} from "@/types";
import { EquityIntelligenceEngine } from "@/lib/engine";
import { marketDataService } from "@/lib/market-data";
import { formatVolume } from "@/lib/utils";
import { fetchCompanyProfile } from "@/services/companyData";
import { fetchCompanyResearch } from "@/services/researchData";
import { getCached, cacheKey, CACHE_TTL } from "@/lib/cache";

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

const FALLBACK_SWING_SCORES: Record<string, { technicalScore: number; fundamentalScore: number }> = {
  BHARTIARTL: { technicalScore: 91, fundamentalScore: 88 },
  LT: { technicalScore: 89, fundamentalScore: 92 },
  ICICIBANK: { technicalScore: 87, fundamentalScore: 94 },
  TCS: { technicalScore: 86, fundamentalScore: 93 },
  "M&M": { technicalScore: 85, fundamentalScore: 89 },
  SUNPHARMA: { technicalScore: 82, fundamentalScore: 91 },
  HINDALCO: { technicalScore: 84, fundamentalScore: 81 },
  ASIANPAINT: { technicalScore: 78, fundamentalScore: 74 },
  SBILIFE: { technicalScore: 81, fundamentalScore: 86 },
  TATAPOWER: { technicalScore: 79, fundamentalScore: 80 },
};

const swingTradeIdeasBase: Omit<SwingTradeIdea, "technicalScore" | "fundamentalScore">[] = [
  { symbol: "BHARTIARTL", company: "Bharti Airtel", side: "Long", entryLow: 1650, entryHigh: 1680, stopLoss: 1598, targets: [1740, 1810, 1890] },
  { symbol: "LT", company: "Larsen & Toubro", side: "Long", entryLow: 3580, entryHigh: 3640, stopLoss: 3485, targets: [3775, 3890, 4020] },
  { symbol: "ICICIBANK", company: "ICICI Bank", side: "Long", entryLow: 1260, entryHigh: 1285, stopLoss: 1218, targets: [1335, 1380, 1425] },
  { symbol: "TCS", company: "Tata Consultancy", side: "Long", entryLow: 4050, entryHigh: 4120, stopLoss: 3940, targets: [4260, 4410, 4580] },
  { symbol: "M&M", company: "Mahindra & Mahindra", side: "Long", entryLow: 2860, entryHigh: 2920, stopLoss: 2765, targets: [3050, 3175, 3320] },
  { symbol: "SUNPHARMA", company: "Sun Pharma", side: "Long", entryLow: 1705, entryHigh: 1735, stopLoss: 1648, targets: [1800, 1870, 1940] },
  { symbol: "HINDALCO", company: "Hindalco Industries", side: "Long", entryLow: 672, entryHigh: 684, stopLoss: 648, targets: [712, 738, 765] },
  { symbol: "ASIANPAINT", company: "Asian Paints", side: "Short", entryLow: 2870, entryHigh: 2910, stopLoss: 2978, targets: [2795, 2725, 2640] },
  { symbol: "SBILIFE", company: "SBI Life Insurance", side: "Long", entryLow: 1580, entryHigh: 1610, stopLoss: 1528, targets: [1665, 1720, 1790] },
  { symbol: "TATAPOWER", company: "Tata Power", side: "Long", entryLow: 432, entryHigh: 441, stopLoss: 416, targets: [460, 478, 498] },
];

const intradayIdeasBase: Omit<IntradayIdea, "conviction" | "entry">[] = [
  { symbol: "RELIANCE", company: "Reliance Industries", side: "Long", stopLoss: 2862, target: 2952, riskReward: 2, timeHorizon: "2–4 hours" },
  { symbol: "INFY", company: "Infosys", side: "Long", stopLoss: 1878, target: 1928, riskReward: 2.1, timeHorizon: "1–3 hours" },
  { symbol: "SBIN", company: "State Bank of India", side: "Short", stopLoss: 819, target: 795, riskReward: 2, timeHorizon: "2–5 hours" },
  { symbol: "TATASTEEL", company: "Tata Steel", side: "Long", stopLoss: 166.8, target: 173.8, riskReward: 2, timeHorizon: "1–2 hours" },
  { symbol: "MARUTI", company: "Maruti Suzuki", side: "Long", stopLoss: 12342, target: 12725, riskReward: 2.1, timeHorizon: "3–5 hours" },
];

const FALLBACK_CONVICTION: Record<string, number> = {
  RELIANCE: 88,
  INFY: 84,
  SBIN: 79,
  TATASTEEL: 76,
  MARUTI: 73,
};

async function resolveMover(
  mover: MarketMover,
  volumeLabel?: "shares" | "turnover"
): Promise<MarketMover> {
  const quote = await marketDataService.getEnrichedQuote(mover.symbol);
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
}

async function enrichMovers(movers: MarketMover[], volumeLabel?: "shares" | "turnover") {
  return Promise.all(movers.map((m) => resolveMover(m, volumeLabel)));
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
    gainers,
    losers,
    weekHighs,
    weekLows,
    mostActive,
  };
}


async function resolveSwingEntryRange(symbol: string): Promise<{ entryLow: number; entryHigh: number }> {
  const quote = await marketDataService.getEnrichedQuote(symbol);
  const price = quote.price ?? 0;
  if (price <= 0) return { entryLow: 0, entryHigh: 0 };
  return {
    entryLow: Math.round(price * 0.985 * 100) / 100,
    entryHigh: Math.round(price * 1.015 * 100) / 100,
  };
}

async function resolveSwingScores(
  symbol: string
): Promise<{ technicalScore: number; fundamentalScore: number }> {
  const profile = await fetchCompanyProfile(symbol);
  if (!profile) return FALLBACK_SWING_SCORES[symbol] ?? { technicalScore: 75, fundamentalScore: 75 };

  const research = await fetchCompanyResearch(symbol);
  if (!research) return FALLBACK_SWING_SCORES[symbol] ?? { technicalScore: 75, fundamentalScore: 75 };

  const scores = EquityIntelligenceEngine.calculateTradeIdeaScores(profile, research.technicals);
  return {
    technicalScore: scores.technical.normalizedScore,
    fundamentalScore: scores.fundamental.normalizedScore,
  };
}

async function resolveConviction(
  symbol: string,
  side: "Long" | "Short"
): Promise<number> {
  const profile = await fetchCompanyProfile(symbol);
  if (!profile) return FALLBACK_CONVICTION[symbol] ?? 75;

  const research = await fetchCompanyResearch(symbol);
  if (!research) return FALLBACK_CONVICTION[symbol] ?? 75;

  return EquityIntelligenceEngine.calculateConviction(
    profile,
    research.technicals.score,
    side
  ).normalizedScore;
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

export async function fetchIntradayIdeas(): Promise<IntradayIdea[]> {
  return getCached({ key: cacheKey("intraday-ideas"), ttlMs: CACHE_TTL.QUOTE }, async () => {
    const ideas = await Promise.all(
      intradayIdeasBase.map(async (idea) => {
        const quote = await marketDataService.getEnrichedQuote(idea.symbol);
        return {
          ...idea,
          entry: quote.price ?? 0,
          conviction: await resolveConviction(idea.symbol, idea.side),
          quote,
        };
      })
    );
    return ideas;
  });
}

export async function fetchSwingTradeIdeas(): Promise<SwingTradeIdea[]> {
  return getCached({ key: cacheKey("swing-ideas"), ttlMs: CACHE_TTL.QUOTE }, async () => {
    const ideas = await Promise.all(
      swingTradeIdeasBase.map(async (idea) => {
        const quote = await marketDataService.getEnrichedQuote(idea.symbol);
        const [scores, entryRange] = await Promise.all([
          resolveSwingScores(idea.symbol),
          resolveSwingEntryRange(idea.symbol),
        ]);
        return { ...idea, ...scores, ...entryRange, quote };
      })
    );
    return ideas;
  });
}
