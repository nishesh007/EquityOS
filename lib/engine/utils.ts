import type { InvestmentVerdict, ScoreTone, Signal } from "@/types";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function toneForScore(score: number): ScoreTone {
  if (score >= 70) return "gain";
  if (score >= 50) return "accent";
  return "loss";
}

export function verdictForScore(
  score: number,
  momentumPositive: boolean
): InvestmentVerdict {
  if (score >= 72 && momentumPositive) return "BUY";
  if (score >= 60) return "HOLD";
  if (score >= 45) return "WATCH";
  return "SELL";
}

export function signalFromTechnicalScore(score: number): Signal {
  if (score >= 60) return "bullish";
  if (score >= 45) return "neutral";
  return "bearish";
}

export function scoreConfidence(normalizedScore: number): number {
  return Math.round(clamp(55 + Math.abs(normalizedScore - 50) * 0.7));
}

export function amountToCrore(value: string): number {
  const amount = Number.parseFloat(value.replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return value.includes("L Cr") ? amount * 100_000 : amount;
}

export function metricHistory(base: number, growth: number, points = 5): number[] {
  return Array.from({ length: points }, (_, index) =>
    round(base / (1 + growth / 100) ** (points - index - 1))
  );
}
