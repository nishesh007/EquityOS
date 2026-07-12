import type {
  AIAnalysis,
  CompanyNews,
  CompanyProfile,
  CompanyResearch,
  ConvictionLevel,
  ResultsSummary,
  RiskLevel,
  Signal,
  TradingData,
} from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import { fetchCompanyProfile } from "@/services/companyData";
import { EquityIntelligenceEngine } from "@/lib/engine";
import { round } from "@/lib/engine/utils";
import { isValidMarketPrice } from "@/lib/utils";
import { getCached, cacheKey, CACHE_TTL } from "@/lib/cache";
import { marketDataService } from "@/lib/market-data";
import { createRng, hashSeed } from "@/lib/random";

const REFERENCE_CAPITAL = 1_000_000;

function toExchangeSymbol(symbol: string): string {
  return `NSE:${symbol.toUpperCase()}`;
}

function buildTradingData(
  profile: CompanyProfile,
  rng: () => number,
  liveQuote?: {
    open: number;
    high: number;
    low: number;
    previousClose: number;
    volume: number;
    deliveryPercent?: number;
    vwap?: number;
  }
): TradingData {
  const close = profile.price;

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

  const previousClose = liveQuote?.previousClose && liveQuote.previousClose > 0
    ? liveQuote.previousClose
    : round(close - profile.change);
  const open = liveQuote?.open ?? round(previousClose * (1 + (rng() - 0.5) * 0.01));

  const intradaySwing = 0.008 + rng() * 0.02;
  const high =
    liveQuote?.high ?? round(Math.max(open, close) * (1 + intradaySwing));
  const low =
    liveQuote?.low ?? round(Math.min(open, close) * (1 - intradaySwing * 0.9));
  const vwap = liveQuote?.vwap ?? round(low + (high - low) * (0.35 + rng() * 0.3));

  const weekHigh52 = round(close * (1.12 + rng() * 0.35));
  const weekLow52 = round(close * (0.62 + rng() * 0.15));

  const volume = liveQuote?.volume ?? Math.round((3e6 + rng() * 1.4e7) / 100) * 100;
  const turnoverCr = (volume * vwap) / 1e7;
  const deliveryPercent =
    liveQuote?.deliveryPercent ?? round(38 + rng() * 34, 1);

  const dividendYield = round(0.2 + rng() * 2.4, 2);

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
  rng: () => number
): AIAnalysis {
  const hasPrice = isValidMarketPrice(profile.price);
  const support = hasPrice ? round(profile.price * (1 - (0.025 + rng() * 0.02))) : 0;
  const resistance = hasPrice ? round(profile.price * (1 + (0.03 + rng() * 0.03))) : 0;

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
  const operatingMargin = round(netMargin + 4 + (profile.financials.roce % 5), 1);

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
  } expanded ${profile.financials.netProfitGrowth}%. Net margin held at ${netMargin}%, ${
    verdict === "bullish"
      ? "ahead of street estimates on operating leverage"
      : verdict === "bearish"
        ? "pressured by cost inflation and a softer demand mix"
        : "broadly in line with expectations"
  }.`;

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

const SECTOR_HEADLINES: Record<string, string[]> = {
  IT: [
    "Analysts flag deal-win momentum as a key FY27 growth lever",
    "Brokerage retains Buy citing margin recovery and GenAI pipeline",
  ],
  Banking: [
    "Asset quality steady as slippages stay below guidance",
    "NIM commentary in focus ahead of the RBI policy meeting",
  ],
  Telecom: [
    "ARPU expansion story keeps long-term investors engaged",
    "5G monetisation timeline seen as the next re-rating trigger",
  ],
  Auto: [
    "Festive demand and new launches drive volume optimism",
    "Export mix improvement cushions domestic seasonality",
  ],
  Conglomerate: [
    "Sum-of-the-parts narrative attracts institutional interest",
    "Capex cycle and demerger chatter keep the counter active",
  ],
  Infrastructure: [
    "Record order book underpins multi-year earnings visibility",
    "Execution pace and working-capital discipline in spotlight",
  ],
};

function buildNews(profile: CompanyProfile): CompanyNews[] {
  const base = [...profile.news];
  const templates =
    SECTOR_HEADLINES[profile.sector] ?? [
      "Institutional activity picks up as valuations turn attractive",
      "Management commentary points to a stable demand outlook",
    ];

  templates.forEach((headline, index) => {
    if (base.length >= 4) return;
    base.push({
      id: `gen-${index}`,
      title: `${profile.name}: ${headline}`,
      source: index % 2 === 0 ? "Bloomberg Quint" : "CNBC-TV18",
      timestamp: index === 0 ? "6 hours ago" : "1 day ago",
      summary: `Coverage of ${profile.name} in the ${profile.sector} sector — ${headline.toLowerCase()}.`,
    });
  });

  return base;
}

function buildResearch(
  profile: CompanyProfile,
  liveQuote?: Awaited<ReturnType<typeof marketDataService.getQuote>>["data"],
  candles?: OhlcBar[]
): CompanyResearch {
  const rng = createRng(hashSeed(profile.symbol));
  const trading = buildTradingData(profile, rng, liveQuote
    ? {
        open: liveQuote.open,
        high: liveQuote.high,
        low: liveQuote.low,
        previousClose: liveQuote.previousClose,
        volume: liveQuote.volume,
        deliveryPercent: liveQuote.deliveryPercent,
        vwap: liveQuote.vwap,
      }
    : undefined);
  const { analysis: technicals } = EquityIntelligenceEngine.buildTechnicalAnalysis(
    profile,
    trading,
    { candles }
  );
  const { setup: swing } = EquityIntelligenceEngine.buildSwingSetup(
    profile.price,
    technicals,
    trading,
    rng
  );
  const ai = buildAI(profile, technicals, trading, rng);
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
  symbol: string
): Promise<CompanyResearch | null> {
  return getCached(
    { key: cacheKey("company-research", symbol), ttlMs: CACHE_TTL.RESEARCH },
    async () => {
      const profile = await fetchCompanyProfile(symbol);
      if (!profile) return null;

      let liveQuote: Awaited<ReturnType<typeof marketDataService.getQuote>>["data"] | undefined;
      let candles: OhlcBar[] | undefined;

      try {
        const result = await marketDataService.getQuote(symbol);
        liveQuote = result.data;
      } catch {
        liveQuote = undefined;
      }

      try {
        const ohlcResult = await marketDataService.getOhlcCandles(symbol, "1Y");
        candles = ohlcResult.data;
      } catch {
        candles = undefined;
      }

      return buildResearch(profile, liveQuote, candles);
    }
  );
}

// Preserve export for any external references.
export { REFERENCE_CAPITAL };
