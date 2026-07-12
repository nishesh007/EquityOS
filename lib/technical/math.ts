import type { OhlcBar } from "@/lib/providers/types";
import { round } from "@/lib/engine/utils";

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerResult {
  upper: number;
  middle: number;
  lower: number;
}

export interface SupertrendResult {
  value: number;
  direction: "bullish" | "bearish";
}

export interface AdxResult {
  adx: number;
  plusDi: number;
  minusDi: number;
}

function last<T>(values: T[]): T | undefined {
  return values[values.length - 1];
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

export function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const multiplier = 2 / (period + 1);
  const result: number[] = [values[0]];

  for (let index = 1; index < values.length; index++) {
    const previous = result[index - 1];
    result.push(values[index] * multiplier + previous * (1 - multiplier));
  }

  return result;
}

export function ema(values: number[], period: number): number | null {
  const series = emaSeries(values, period);
  return last(series) ?? null;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let index = 1; index <= period; index++) {
    const change = closes[index] - closes[index - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }

  avgGain /= period;
  avgLoss /= period;

  for (let index = period + 1; index < closes.length; index++) {
    const change = closes[index] - closes[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult | null {
  if (closes.length < slowPeriod + signalPeriod) return null;

  const fastEma = emaSeries(closes, fastPeriod);
  const slowEma = emaSeries(closes, slowPeriod);
  const macdLine = fastEma.map((value, index) => value - slowEma[index]);
  const signalLine = emaSeries(macdLine, signalPeriod);
  const macdValue = last(macdLine);
  const signalValue = last(signalLine);

  if (macdValue === undefined || signalValue === undefined) return null;

  return {
    macd: macdValue,
    signal: signalValue,
    histogram: macdValue - signalValue,
  };
}

export function trueRange(current: OhlcBar, previousClose: number): number {
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previousClose),
    Math.abs(current.low - previousClose)
  );
}

export function atr(candles: OhlcBar[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const ranges: number[] = [];
  for (let index = 1; index < candles.length; index++) {
    ranges.push(trueRange(candles[index], candles[index - 1].close));
  }

  let atrValue = ranges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let index = period; index < ranges.length; index++) {
    atrValue = (atrValue * (period - 1) + ranges[index]) / period;
  }

  return atrValue;
}

export function adx(candles: OhlcBar[], period = 14): AdxResult | null {
  if (candles.length < period * 2) return null;

  const plusDm: number[] = [];
  const minusDm: number[] = [];
  const tr: number[] = [];

  for (let index = 1; index < candles.length; index++) {
    const upMove = candles[index].high - candles[index - 1].high;
    const downMove = candles[index - 1].low - candles[index].low;
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(trueRange(candles[index], candles[index - 1].close));
  }

  const smooth = (values: number[]): number[] => {
    let sum = values.slice(0, period).reduce((total, value) => total + value, 0);
    const smoothed: number[] = [sum];
    for (let index = period; index < values.length; index++) {
      sum = sum - sum / period + values[index];
      smoothed.push(sum);
    }
    return smoothed;
  };

  const smoothedTr = smooth(tr);
  const smoothedPlusDm = smooth(plusDm);
  const smoothedMinusDm = smooth(minusDm);

  const diCount = Math.min(
    smoothedTr.length,
    smoothedPlusDm.length,
    smoothedMinusDm.length
  );

  const dxValues: number[] = [];
  for (let index = 0; index < diCount; index++) {
    const trValue = smoothedTr[index];
    if (trValue === 0) continue;
    const plusDi = (100 * smoothedPlusDm[index]) / trValue;
    const minusDi = (100 * smoothedMinusDm[index]) / trValue;
    const diSum = plusDi + minusDi;
    const dx = diSum === 0 ? 0 : (100 * Math.abs(plusDi - minusDi)) / diSum;
    dxValues.push(dx);
  }

  if (dxValues.length < period) return null;

  let adxValue = dxValues.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let index = period; index < dxValues.length; index++) {
    adxValue = (adxValue * (period - 1) + dxValues[index]) / period;
  }

  const trValue = last(smoothedTr) ?? 0;
  const plusDi = trValue === 0 ? 0 : (100 * (last(smoothedPlusDm) ?? 0)) / trValue;
  const minusDi = trValue === 0 ? 0 : (100 * (last(smoothedMinusDm) ?? 0)) / trValue;

  return { adx: adxValue, plusDi, minusDi };
}

export function bollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): BollingerResult | null {
  const middle = sma(closes, period);
  if (middle === null) return null;

  const slice = closes.slice(-period);
  const variance =
    slice.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
  const deviation = Math.sqrt(variance);

  return {
    upper: middle + stdDevMultiplier * deviation,
    middle,
    lower: middle - stdDevMultiplier * deviation,
  };
}

export function supertrend(
  candles: OhlcBar[],
  period = 10,
  multiplier = 3
): SupertrendResult | null {
  if (candles.length < period + 1) return null;

  const atrValues: number[] = [];
  for (let index = 1; index < candles.length; index++) {
    const atrValue = atr(candles.slice(0, index + 1), period);
    if (atrValue !== null) atrValues.push(atrValue);
  }

  if (atrValues.length === 0) return null;

  let finalUpper = 0;
  let finalLower = 0;
  let direction: "bullish" | "bearish" = "bullish";
  let initialized = false;

  for (let index = period; index < candles.length; index++) {
    const atrValue = atr(candles.slice(0, index + 1), period);
    if (atrValue === null) continue;

    const hl2 = (candles[index].high + candles[index].low) / 2;
    const basicUpper = hl2 + multiplier * atrValue;
    const basicLower = hl2 - multiplier * atrValue;

    if (!initialized) {
      finalUpper = basicUpper;
      finalLower = basicLower;
      initialized = true;
    } else {
      finalUpper =
        basicUpper < finalUpper || candles[index - 1].close > finalUpper
          ? basicUpper
          : finalUpper;
      finalLower =
        basicLower > finalLower || candles[index - 1].close < finalLower
          ? basicLower
          : finalLower;
    }

    if (candles[index].close <= finalUpper) {
      direction = "bearish";
    } else if (candles[index].close >= finalLower) {
      direction = "bullish";
    }
  }

  if (!initialized) return null;

  const level = direction === "bullish" ? finalLower : finalUpper;
  return { value: level, direction };
}

export function sessionVwap(candles: OhlcBar[]): number | null {
  if (candles.length === 0) return null;

  let cumulativeTpVolume = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTpVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  if (cumulativeVolume === 0) {
    const lastCandle = last(candles);
    return lastCandle ? lastCandle.close : null;
  }

  return cumulativeTpVolume / cumulativeVolume;
}

export function volumeTrend(candles: OhlcBar[], period = 10): number | null {
  if (candles.length < period * 2) return null;

  const recent = candles.slice(-period);
  const prior = candles.slice(-period * 2, -period);
  const recentAvg = recent.reduce((sum, candle) => sum + candle.volume, 0) / period;
  const priorAvg = prior.reduce((sum, candle) => sum + candle.volume, 0) / period;

  if (priorAvg === 0) return null;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}

export function momentum(closes: number[], period = 10): number | null {
  if (closes.length <= period) return null;
  const current = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - period];
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export function week52Momentum(
  price: number,
  weekHigh52: number,
  weekLow52: number
): number | null {
  const range = weekHigh52 - weekLow52;
  if (range <= 0) return null;
  return ((price - weekLow52) / range) * 100;
}

export function relativeStrength(closes: number[], period = 20): number | null {
  if (closes.length <= period) return null;
  const current = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - period];
  if (prior === 0) return null;
  return (current / prior) * 100;
}

export function volatility(closes: number[], period = 20): number | null {
  if (closes.length < period + 1) return null;

  const returns: number[] = [];
  for (let index = closes.length - period; index < closes.length; index++) {
    const previous = closes[index - 1];
    if (previous === 0) continue;
    returns.push((closes[index] - previous) / previous);
  }

  if (returns.length === 0) return null;

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `₹${round(value).toLocaleString("en-IN")}`;
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = round(value, decimals);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function formatNumber(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${round(value, decimals)}`;
}
