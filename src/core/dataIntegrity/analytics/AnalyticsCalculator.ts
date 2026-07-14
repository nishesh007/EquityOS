/**
 * Shared analytics math helpers (read-only calculations).
 */

export function clampScore(value: number, asPercent = true): number {
  if (!Number.isFinite(value)) return 0;
  if (!asPercent) return Math.round(value * 100) / 100;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function zScore(value: number, values: number[]): number {
  const sd = stdDev(values);
  if (sd === 0) return 0;
  return (value - average(values)) / sd;
}

export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return clampScore((numerator / denominator) * 100);
}

export function linearSlope(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export type TrendDirection = "UP" | "DOWN" | "FLAT";

export function classifyDirection(delta: number, flatThreshold = 0.5): TrendDirection {
  if (delta > flatThreshold) return "UP";
  if (delta < -flatThreshold) return "DOWN";
  return "FLAT";
}
