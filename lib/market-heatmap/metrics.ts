/**
 * Pure heatmap metrics — RS, momentum, money flow, performance bands.
 * No invented fundamentals; nulls stay null when inputs missing.
 */

import type { MoneyFlowBias, PerformanceBand } from "./types";

export function parseMarketCapToCr(
  raw: string | number | null | undefined
): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw / 1e7 : null; // assume INR → Cr
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Plain number string (provider sometimes returns absolute INR)
  if (/^[\d,.]+$/.test(trimmed)) {
    const n = Number.parseFloat(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    // Heuristic: values > 1e5 treated as INR, else already Cr-ish
    return n > 1e5 ? n / 1e7 : n;
  }
  const match = trimmed.replace(/,/g, "").match(/([\d.]+)\s*(L)?\s*Cr/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] ? value * 100_000 : value;
}

/** Relative strength vs market average day change (percentage points). */
export function relativeStrength(
  changePercent: number,
  marketAvgChangePercent: number
): number {
  return Math.round((changePercent - marketAvgChangePercent) * 100) / 100;
}

/**
 * Momentum score 0–100 from signed change and optional volume z-ish ratio.
 * volumeRatio = stockVolume / medianVolume (1 = median).
 */
export function momentumScore(
  changePercent: number,
  volumeRatio: number | null
): number {
  const changeComponent = Math.max(-3, Math.min(3, changePercent)) / 3; // −1…1
  const volComponent =
    volumeRatio == null
      ? 0
      : Math.max(-1, Math.min(1, Math.log2(Math.max(volumeRatio, 0.25)) / 2));
  const raw = 50 + changeComponent * 35 + volComponent * 15;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}

/** Volume / delivery expansion vs universe median (1 = median). */
export function expansionRatio(
  value: number | null,
  median: number | null
): number | null {
  if (value == null || median == null || median <= 0 || value < 0) return null;
  return Math.round((value / median) * 100) / 100;
}

export function classifyMoneyFlow(
  changePercent: number,
  volumeExpansion: number | null
): MoneyFlowBias {
  const volHot = volumeExpansion != null && volumeExpansion >= 1.15;
  if (changePercent >= 0.75 || (changePercent > 0.35 && volHot)) {
    return "inflow";
  }
  if (changePercent <= -0.75 || (changePercent < -0.35 && volHot)) {
    return "outflow";
  }
  return "neutral";
}

/** Performance band for legend / tile coloring (daily % style domain). */
export function performanceBand(
  value: number,
  metric: "change" | "breadth" | "ratio" | "level"
): PerformanceBand {
  if (metric === "breadth") {
    if (value >= 65) return "strongGain";
    if (value >= 55) return "moderateGain";
    if (value > 45) return "neutral";
    if (value > 35) return "moderateLoss";
    return "strongLoss";
  }
  if (metric === "ratio" || metric === "level") {
    // Relative: centered around 1 for ratios, around median-ish for levels
    if (value >= 1.5) return "strongGain";
    if (value >= 1.15) return "moderateGain";
    if (value > 0.85) return "neutral";
    if (value > 0.6) return "moderateLoss";
    return "strongLoss";
  }
  // change %
  if (value >= 2) return "strongGain";
  if (value >= 0.5) return "moderateGain";
  if (value > -0.5) return "neutral";
  if (value > -2) return "moderateLoss";
  return "strongLoss";
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function average(values: number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

/** Period return from closes: (last / prior) - 1 in %, prior = closes[len-1-offset]. */
export function periodReturnPercent(
  closes: number[],
  lookbackBars: number
): number | null {
  if (closes.length < lookbackBars + 1) return null;
  const last = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - lookbackBars];
  if (!(last > 0) || !(prior > 0)) return null;
  return Math.round(((last / prior - 1) * 100) * 100) / 100;
}
