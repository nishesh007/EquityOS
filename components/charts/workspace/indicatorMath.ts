/**
 * Client-side indicator overlays from OHLC — presentation only.
 * Not Strategy Engine / recommendation calculations.
 */

import type { OhlcBar } from "@/lib/providers/types";

export function sma(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    out.push(sum / period);
  }
  return out;
}

export function emaSeries(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      prev = sum / period;
    } else {
      prev = closes[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

/** Typical-price VWAP approximation over the visible series. */
export function vwapSeries(candles: OhlcBar[]): (number | null)[] {
  let cumPv = 0;
  let cumVol = 0;
  return candles.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = Math.max(c.volume, 0);
    cumPv += tp * vol;
    cumVol += vol;
    if (cumVol <= 0) return null;
    return cumPv / cumVol;
  });
}

export function bollinger(
  closes: number[],
  period = 20,
  mult = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i + 1 < period) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (closes[j] - mid[i]!) ** 2;
    }
    const std = Math.sqrt(variance / period);
    upper.push(mid[i]! + mult * std);
    lower.push(mid[i]! - mult * std);
  }
  return { mid, upper, lower };
}

export function relativeReturns(closes: number[]): number[] {
  if (closes.length === 0) return [];
  const base = closes[0] || 1;
  return closes.map((c) => ((c / base) - 1) * 100);
}
