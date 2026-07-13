import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { fetchFundamentalsBundle } from "@/lib/fundamentals";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { getOhlcCandles } from "@/lib/market/ohlc-engine";
import {
  adx,
  atr,
  bollingerBands,
  ema,
  macd,
  momentum,
  relativeStrength,
  rsi,
  volatility,
  week52Momentum,
} from "@/lib/technical/math";
import type { OhlcBar } from "@/lib/providers/types";

export interface LiveSymbolContext {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
}

export type LiveMetricsRecord = Record<string, number | string | null>;

function averageVolume(candles: OhlcBar[], period = 20): number | null {
  if (candles.length < period) return null;
  const slice = candles.slice(-period);
  const total = slice.reduce((sum, bar) => sum + (bar.volume ?? 0), 0);
  return total / period;
}

function computeTrendScore(
  price: number,
  ema20: number | null,
  ema50: number | null,
  ema200: number | null
): number | null {
  if (ema20 === null || ema50 === null) return null;
  let score = 50;
  if (price > ema20) score += 12;
  else score -= 12;
  if (price > ema50) score += 15;
  else score -= 15;
  if (ema200 !== null) {
    if (price > ema200) score += 10;
    else score -= 10;
    if (ema50 > ema200) score += 8;
    else score -= 8;
  }
  if (ema20 > ema50) score += 5;
  else score -= 5;
  return Math.max(0, Math.min(100, score));
}

function parseFundamentalScore(
  roe: number | null,
  revenueGrowth: number | null,
  pe: number | null
): number | null {
  if (roe === null && revenueGrowth === null) return null;
  let score = 50;
  if (roe !== null) score += Math.min(25, roe * 0.8);
  if (revenueGrowth !== null) score += Math.min(20, revenueGrowth * 0.6);
  if (pe !== null && pe > 0 && pe < 60) {
    score += pe < 25 ? 8 : pe > 45 ? -8 : 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildQuoteOnlyMetrics(
  ctx: LiveSymbolContext,
  quote: EnrichedQuote
): LiveMetricsRecord | null {
  if (quote.price === null || quote.price <= 0) return null;

  return {
    symbol: ctx.symbol,
    name: ctx.name,
    sector: ctx.sector,
    industry: ctx.industry,
    cmp: quote.price,
    change_percent: quote.changePercent,
    volume: quote.volume,
    delivery_percent: quote.deliveryPercent,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    prev_close: quote.previousClose,
    vwap: quote.vwap,
    has_live_quote: 1,
  };
}

export async function enrichMetricsWithTechnicals(
  base: LiveMetricsRecord,
  candles: OhlcBar[]
): Promise<LiveMetricsRecord> {
  if (candles.length < 30) {
    return { ...base, has_live_technicals: 0 };
  }

  const closes = candles.map((bar) => bar.close);
  const price = typeof base.cmp === "number" ? base.cmp : closes.at(-1) ?? 0;
  const rsi14 = rsi(closes, 14);
  const rsiPrev =
    closes.length > 15 ? rsi(closes.slice(0, -1), 14) : null;
  const adxResult = adx(candles, 14);
  const atr14 = atr(candles, 14);
  const momentum10 = momentum(closes, 10);
  const rs20 = relativeStrength(closes, 20);
  const vol20 = volatility(closes, 20);
  const weekHigh = Math.max(...candles.slice(-252).map((bar) => bar.high));
  const weekLow = Math.min(...candles.slice(-252).map((bar) => bar.low));
  const week52 =
    weekHigh > 0 && weekLow > 0 ? week52Momentum(price, weekHigh, weekLow) : null;
  const bands = bollingerBands(closes, 20, 2);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const macdResult = macd(closes);
  const avgVol20 = averageVolume(candles, 20);
  const trendScore = computeTrendScore(price, ema20, ema50, ema200);

  const priceTo52wHigh = weekHigh > 0 ? (price / weekHigh) * 100 : null;
  const athDistance = weekHigh > 0 ? ((price - weekHigh) / weekHigh) * 100 : null;

  const liveVolume = typeof base.volume === "number" ? base.volume : null;
  const volumeRatio =
    liveVolume !== null && avgVol20 !== null && avgVol20 > 0
      ? Math.round((liveVolume / avgVol20) * 100) / 100
      : null;

  const bollingerWidth =
    bands && bands.middle > 0
      ? Math.round(((bands.upper - bands.lower) / bands.middle) * 10000) / 100
      : null;

  const dayHigh = typeof base.high === "number" ? base.high : null;
  const dayLow = typeof base.low === "number" ? base.low : null;
  const closingStrength =
    dayHigh !== null && dayLow !== null && dayHigh > dayLow
      ? Math.round(((price - dayLow) / (dayHigh - dayLow)) * 10000) / 100
      : null;

  return {
    ...base,
    avg_volume_20d: avgVol20 !== null ? Math.round(avgVol20) : null,
    volume_ratio: volumeRatio,
    rsi: rsi14 !== null ? Math.round(rsi14 * 100) / 100 : null,
    rsi_prev: rsiPrev !== null ? Math.round(rsiPrev * 100) / 100 : null,
    adx: adxResult?.adx ?? null,
    momentum: momentum10 !== null ? Math.round(momentum10 * 100) / 100 : null,
    relative_strength: rs20 !== null ? Math.round(rs20 * 100) / 100 : null,
    trend_score: trendScore,
    atr: atr14 !== null ? Math.round(atr14 * 100) / 100 : null,
    volatility: vol20 !== null ? Math.round(vol20 * 100) / 100 : null,
    week52_momentum: week52 !== null ? Math.round(week52 * 100) / 100 : null,
    bollinger_width: bollingerWidth,
    price_to_52w_high: priceTo52wHigh !== null ? Math.round(priceTo52wHigh * 100) / 100 : null,
    week_high_52: weekHigh,
    week_low_52: weekLow,
    ath_distance: athDistance !== null ? Math.round(athDistance * 100) / 100 : null,
    ema20,
    ema50,
    ema200,
    macd: macdResult?.macd ?? null,
    macd_signal: macdResult?.signal ?? null,
    macd_histogram: macdResult?.histogram ?? null,
    closing_strength: closingStrength,
    has_live_technicals: 1,
  };
}

export async function enrichMetricsWithFundamentals(
  base: LiveMetricsRecord,
  symbol: string
): Promise<LiveMetricsRecord> {
  try {
    const result = await fetchFundamentalsBundle(symbol);
    if (!result) {
      return { ...base, has_live_fundamentals: 0 };
    }
    const ratios = result.data.ratios;
    const growth = result.data.growth;
    const roe = ratios?.roe ?? null;
    const revenueGrowth = growth?.revenueGrowth ?? null;
    const pe = ratios?.pe ?? null;
    const fundamentalScore = parseFundamentalScore(roe, revenueGrowth, pe);

    return {
      ...base,
      roe,
      revenue_growth: revenueGrowth,
      pe,
      fundamental_score: fundamentalScore,
      has_live_fundamentals: fundamentalScore !== null ? 1 : 0,
    };
  } catch {
    const enrichment = getCompanyEnrichment(symbol);
    return {
      ...base,
      has_live_fundamentals: 0,
      sector: enrichment?.sector ?? base.sector,
      industry: enrichment?.industry ?? base.industry,
    };
  }
}

export async function buildLiveMetrics(
  ctx: LiveSymbolContext,
  quote: EnrichedQuote,
  options?: { includeFundamentals?: boolean }
): Promise<LiveMetricsRecord | null> {
  const quoteMetrics = buildQuoteOnlyMetrics(ctx, quote);
  if (!quoteMetrics) return null;

  const ohlc = await getOhlcCandles(ctx.symbol, "3M");
  let metrics = await enrichMetricsWithTechnicals(quoteMetrics, ohlc.data);

  if (options?.includeFundamentals) {
    metrics = await enrichMetricsWithFundamentals(metrics, ctx.symbol);
  }

  return metrics;
}

export function hasRequiredLiveData(
  metrics: LiveMetricsRecord,
  requireTechnicals = false
): boolean {
  if (typeof metrics.cmp !== "number" || metrics.cmp <= 0) return false;
  if (requireTechnicals && metrics.has_live_technicals !== 1) return false;
  return true;
}
