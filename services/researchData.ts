import type {
  AIAnalysis,
  CompanyNews,
  CompanyProfile,
  CompanyResearch,
  ResultsSummary,
  RiskLevel,
  Signal,
  SwingTradeSetup,
  TradingData,
} from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import { fetchCompanyProfile } from "@/services/companyData";
import { EquityIntelligenceEngine } from "@/lib/engine";
import { round } from "@/lib/engine/utils";
import { isValidMarketPrice } from "@/lib/utils";
import { getCached, cacheKey, CACHE_TTL } from "@/lib/cache";
import { marketDataService } from "@/lib/market-data";
import type { EnrichedQuote } from "@/lib/market-data";
import type { SharedRecommendation } from "@/lib/recommendations";

const REFERENCE_CAPITAL = 1_000_000;

function toExchangeSymbol(symbol: string): string {
  return `NSE:${symbol.toUpperCase()}`;
}

function buildTradingData(
  profile: CompanyProfile,
  liveQuote?: EnrichedQuote,
  candles: readonly OhlcBar[] = []
): TradingData {
  const close = liveQuote?.price ?? profile.price;

  if (!isValidMarketPrice(close)) {
    return {
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      previousClose: 0,
      volume: 0,
      turnover: "N/A",
      deliveryPercent: 0,
      vwap: 0,
      weekHigh52: 0,
      weekLow52: 0,
      dividendYield: 0,
      upperCircuit: 0,
      lowerCircuit: 0,
    };
  }

  if (liveQuote && isValidMarketPrice(liveQuote.price)) {
    const open = liveQuote.open ?? close;
    const high = liveQuote.high ?? close;
    const low = liveQuote.low ?? close;
    const previousClose = liveQuote.previousClose ?? close - (liveQuote.change ?? 0);
    const volume = liveQuote.volume ?? 0;
    const vwap =
      liveQuote.vwap ??
      (liveQuote.high && liveQuote.low
        ? (liveQuote.high + liveQuote.low + close) / 3
        : close);
    const deliveryPercent = liveQuote.deliveryPercent ?? 0;
    const turnoverCr = volume > 0 ? (volume * vwap) / 1e7 : 0;
    const validCandles = candles.filter(
      (candle) => candle.high > 0 && candle.low > 0
    );

    return {
      open,
      high,
      low,
      close,
      previousClose,
      volume,
      turnover: turnoverCr > 0 ? `₹${turnoverCr.toFixed(0)} Cr` : "N/A",
      deliveryPercent,
      vwap,
      weekHigh52:
        validCandles.length > 0
          ? Math.max(...validCandles.map((candle) => candle.high))
          : 0,
      weekLow52:
        validCandles.length > 0
          ? Math.min(...validCandles.map((candle) => candle.low))
          : 0,
      dividendYield: profile.fundamentals?.dividendYield ?? 0,
      upperCircuit: round(previousClose * 1.1),
      lowerCircuit: round(previousClose * 0.9),
    };
  }

  const latest = candles.at(-1);
  const previous = candles.at(-2);
  const previousClose = liveQuote?.previousClose ?? previous?.close ?? close;
  const open = liveQuote?.open ?? latest?.open ?? close;
  const high = liveQuote?.high ?? latest?.high ?? close;
  const low = liveQuote?.low ?? latest?.low ?? close;
  const vwap = liveQuote?.vwap ?? (high + low + close) / 3;
  const validCandles = candles.filter(
    (candle) => candle.high > 0 && candle.low > 0
  );
  const weekHigh52 =
    validCandles.length > 0
      ? Math.max(...validCandles.map((candle) => candle.high))
      : 0;
  const weekLow52 =
    validCandles.length > 0
      ? Math.min(...validCandles.map((candle) => candle.low))
      : 0;
  const volume = liveQuote?.volume ?? latest?.volume ?? 0;
  const turnoverCr = (volume * vwap) / 1e7;
  const deliveryPercent = liveQuote?.deliveryPercent ?? 0;
  const dividendYield = profile.fundamentals?.dividendYield ?? 0;

  return {
    open,
    high,
    low,
    close,
    previousClose,
    volume,
    turnover: `₹${turnoverCr.toFixed(0)} Cr`,
    deliveryPercent,
    vwap,
    weekHigh52,
    weekLow52,
    dividendYield,
    upperCircuit: round(previousClose * 1.1),
    lowerCircuit: round(previousClose * 0.9),
  };
}

function buildAI(
  profile: CompanyProfile,
  technicals: { score: number; summary: Signal; bullishCount: number; indicators: { name: string; value: string; detail: string }[] },
  trading: TradingData,
  candles: readonly OhlcBar[]
): AIAnalysis {
  const hasPrice = isValidMarketPrice(profile.price);
  const recent = candles.slice(-20);
  const support =
    hasPrice && recent.length > 0
      ? Math.min(...recent.map((candle) => candle.low))
      : 0;
  const resistance =
    hasPrice && recent.length > 0
      ? Math.max(...recent.map((candle) => candle.high))
      : 0;

  const atrIndicator = technicals.indicators.find((i) => i.name === "ATR");
  const highVol = atrIndicator?.detail.includes("Elevated") ?? false;
  const riskLevel: RiskLevel =
    highVol || technicals.summary === "bearish"
      ? "High"
      : technicals.summary === "bullish"
        ? "Low"
        : "Moderate";

  const trendWord =
    technicals.summary === "bullish"
      ? "a firm uptrend"
      : technicals.summary === "bearish"
        ? "a corrective downtrend"
        : "a sideways consolidation";

  const trend = `Price data unavailable.`;

  const rangeDenom = trading.weekHigh52 - trading.weekLow52;
  const rangePct = rangeDenom > 0
    ? round(((profile.price - trading.weekLow52) / rangeDenom) * 100)
    : 0;

  const trendFull = isValidMarketPrice(profile.price)
    ? `${profile.name} is trading in ${trendWord}, with price ${
        profile.price > profile.price * 0.98 ? "holding" : "slipping"
      } near ₹${profile.price.toLocaleString("en-IN")}. The stock sits ${rangePct}% up its 52-week range.`
    : trend;

  const momentum = `Momentum is ${
    technicals.summary === "bullish"
      ? "positive"
      : technicals.summary === "bearish"
        ? "negative"
        : "neutral"
  } — ${technicals.bullishCount} of ${technicals.indicators.length} indicators are bullish and RSI reads ${
    technicals.indicators.find((i) => i.name === "RSI (14)")?.value ?? "—"
  }.`;

  const volumeAnalysis = `Delivery volume at ${trading.deliveryPercent}% signals ${
    trading.deliveryPercent > 55
      ? "genuine investor participation rather than intraday churn"
      : "a blend of positional and speculative flow"
  }. Turnover for the session was ${trading.turnover}.`;

  const investmentThesis = `${profile.name} operates in the ${profile.sector} space (${profile.industry}) with ROE of ${profile.financials.roe}% and revenue growth of ${profile.financials.revenueGrowth}% YoY. At a P/E of ${profile.financials.pe}x, the ${
    technicals.summary === "bullish"
      ? "technical setup supports staying constructive while the structure of higher lows holds"
      : technicals.summary === "bearish"
        ? "risk-reward favours patience until price reclaims its key moving averages"
        : "market is awaiting a fresh catalyst; a range-trading approach is prudent"
  }. Position sizing should respect the ${riskLevel.toLowerCase()} risk profile.`;

  return {
    trend: trendFull,
    momentum,
    volumeAnalysis,
    support,
    resistance,
    riskLevel,
    investmentThesis,
    generatedAt: "Updated moments ago",
  };
}

function buildResults(profile: CompanyProfile): ResultsSummary {
  const latest = profile.quarterlyResults[0];
  const annualLatest = profile.annualFinancials[0];
  const annualPrev = profile.annualFinancials[1];

  const epsGrowthYoY =
    annualLatest && annualPrev
      ? round(((annualLatest.eps - annualPrev.eps) / annualPrev.eps) * 100, 1)
      : profile.financials.netProfitGrowth;

  const netMargin = latest?.margin ?? 0;
  const operatingMargin =
    profile.fundamentals?.operatingMargin ?? netMargin;

  const verdict: Signal =
    profile.financials.netProfitGrowth > 12
      ? "bullish"
      : profile.financials.netProfitGrowth < 4
        ? "bearish"
        : "neutral";

  const commentary = `${latest?.quarter ?? "Latest quarter"} revenue of ${
    latest?.revenue ?? profile.financials.revenue
  } grew ${profile.financials.revenueGrowth}% YoY while net profit of ${
    latest?.netProfit ?? profile.financials.netProfit
  } changed ${profile.financials.netProfitGrowth}% YoY. Reported net margin was ${netMargin}%.`;

  return {
    quarter: latest?.quarter ?? "Latest",
    reportedOn: profile.shareholding.lastUpdated,
    revenue: latest?.revenue ?? profile.financials.revenue,
    revenueGrowthYoY: profile.financials.revenueGrowth,
    netProfit: latest?.netProfit ?? profile.financials.netProfit,
    netProfitGrowthYoY: profile.financials.netProfitGrowth,
    eps: latest?.eps ?? 0,
    epsGrowthYoY,
    operatingMargin,
    netMargin,
    verdict,
    commentary,
  };
}

function buildNews(profile: CompanyProfile): CompanyNews[] {
  return [...profile.news];
}

function buildStrategySwingSetup(
  recommendation: SharedRecommendation | null
): SwingTradeSetup {
  if (!recommendation) {
    return {
      entryLow: 0,
      entryHigh: 0,
      stopLoss: 0,
      target1: 0,
      target2: 0,
      target3: 0,
      riskRewardRatio: 0,
      capitalAllocationPercent: 0,
      referenceCapital: REFERENCE_CAPITAL,
      positionSize: 0,
      conviction: "Low",
      swingScore: 0,
      timeHorizon: "Unavailable",
      strategy: "No validated Strategy Engine recommendation",
    };
  }
  const [target1 = 0, target2 = target1, target3 = target2] =
    recommendation.targets;
  return {
    entryLow: recommendation.entry,
    entryHigh: recommendation.entry,
    stopLoss: recommendation.stopLoss,
    target1,
    target2,
    target3,
    riskRewardRatio: recommendation.riskReward,
    capitalAllocationPercent: 0,
    referenceCapital: REFERENCE_CAPITAL,
    positionSize: 0,
    conviction:
      recommendation.conviction >= 75
        ? "High"
        : recommendation.conviction >= 55
          ? "Medium"
          : "Low",
    swingScore: recommendation.opportunityScore,
    timeHorizon: recommendation.holdingPeriod,
    strategy: recommendation.primaryStrategy,
  };
}

function buildResearch(
  profile: CompanyProfile,
  liveQuote?: EnrichedQuote,
  candles: OhlcBar[] = [],
  recommendation: SharedRecommendation | null = null
): CompanyResearch {
  const trading = buildTradingData(profile, liveQuote, candles);
  const { analysis: technicals } = EquityIntelligenceEngine.buildTechnicalAnalysis(
    profile,
    trading,
    { candles }
  );
  const swing = buildStrategySwingSetup(recommendation);
  const ai = buildAI(profile, technicals, trading, candles);
  const results = buildResults(profile);
  const news = buildNews(profile);

  return {
    symbol: profile.symbol,
    exchangeSymbol: toExchangeSymbol(profile.symbol),
    trading,
    technicals,
    swing,
    ai,
    results,
    news,
  };
}

export async function fetchCompanyResearch(
  symbol: string,
  recommendation: SharedRecommendation | null = null
): Promise<CompanyResearch | null> {
  return getCached(
    {
      key: cacheKey(
        "company-research",
        symbol,
        recommendation?.id ?? "no-strategy"
      ),
      ttlMs: CACHE_TTL.QUOTE,
    },
    async () => {
      const profile = await fetchCompanyProfile(symbol);
      if (!profile) return null;

      let liveQuote: EnrichedQuote | undefined = profile.quote;
      let candles: OhlcBar[] | undefined;

      try {
        const ohlcResult = await marketDataService.getOhlcCandles(symbol, "1Y");
        candles = ohlcResult.data;
      } catch {
        candles = undefined;
      }

      return buildResearch(profile, liveQuote, candles, recommendation);
    }
  );
}

// Preserve export for any external references.
export { REFERENCE_CAPITAL };
