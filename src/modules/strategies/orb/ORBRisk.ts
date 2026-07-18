/**
 * ORB Risk utilities — Sprint 11B.3B.2.
 * Stop-loss candidates and risk validation. Pure functions only.
 */

import { round } from "@/lib/engine/utils";
import type { ORBCandle, ORBDetection } from "./ORBTypes";
import {
  DEFAULT_ORB_TRADE_CONFIG,
  type ORBStopMethod,
  type ORBTradeConfig,
} from "./ORBTradeTypes";

export interface ORBStopCandidate {
  method: Exclude<ORBStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findBreakoutCandle(
  detection: ORBDetection,
  candles: readonly ORBCandle[]
): ORBCandle | null {
  if (!detection.breakoutTime || detection.breakoutTime.getTime() === 0) {
    return null;
  }
  const target = detection.breakoutTime.getTime();
  return (
    candles.find((c) => c.timestamp.getTime() === target) ??
    candles.find(
      (c) => Math.abs(c.timestamp.getTime() - target) < 60_000 && c.close === detection.breakoutPrice
    ) ??
    null
  );
}

export function calculateCandleStop(
  detection: ORBDetection,
  breakoutCandle: ORBCandle | null
): number | null {
  if (!breakoutCandle) return null;
  if (detection.direction === "BUY") return breakoutCandle.low;
  if (detection.direction === "SELL") return breakoutCandle.high;
  return null;
}

export function calculateOpeningRangeStop(detection: ORBDetection): number | null {
  if (detection.direction === "BUY") {
    return Number.isFinite(detection.openingLow) ? detection.openingLow : null;
  }
  if (detection.direction === "SELL") {
    return Number.isFinite(detection.openingHigh) ? detection.openingHigh : null;
  }
  return null;
}

export function calculateAtrStop(
  detection: ORBDetection,
  entry: number,
  atr: number | null,
  config: ORBTradeConfig = DEFAULT_ORB_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

/**
 * Build stop candidates for the configured method.
 * Hybrid selects the safest valid stop (widest protective distance).
 */
export function resolveStopLoss(input: {
  detection: ORBDetection;
  entry: number;
  breakoutCandle: ORBCandle | null;
  atr: number | null;
  method?: ORBStopMethod;
  config?: ORBTradeConfig;
}): { stopLoss: number | null; method: ORBStopMethod; candidates: ORBStopCandidate[]; warnings: string[] } {
  const config = input.config ?? DEFAULT_ORB_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: ORBStopCandidate[] = [];

  const candleStop = calculateCandleStop(input.detection, input.breakoutCandle);
  if (candleStop !== null && isValidStop(input.detection.direction, input.entry, candleStop, config)) {
    candidates.push({
      method: "breakout_candle",
      stopLoss: candleStop,
      risk: Math.abs(input.entry - candleStop),
    });
  } else if (method === "breakout_candle" || method === "hybrid") {
    warnings.push("Breakout candle stop unavailable or invalid.");
  }

  const rangeStop = calculateOpeningRangeStop(input.detection);
  if (rangeStop !== null && isValidStop(input.detection.direction, input.entry, rangeStop, config)) {
    candidates.push({
      method: "opening_range",
      stopLoss: rangeStop,
      risk: Math.abs(input.entry - rangeStop),
    });
  } else if (method === "opening_range" || method === "hybrid") {
    warnings.push("Opening range stop unavailable or invalid.");
  }

  const atrStop = calculateAtrStop(
    input.detection,
    input.entry,
    input.atr,
    config
  );
  if (atrStop !== null && isValidStop(input.detection.direction, input.entry, atrStop, config)) {
    candidates.push({
      method: "atr",
      stopLoss: atrStop,
      risk: Math.abs(input.entry - atrStop),
    });
  } else if (method === "atr" || method === "hybrid") {
    warnings.push("ATR stop unavailable or invalid.");
  }

  if (candidates.length === 0) {
    return { stopLoss: null, method, candidates, warnings };
  }

  if (method === "hybrid") {
    // Prefer safest stop among candidates within max risk; else safest overall.
    const withinLimit = candidates.filter(
      (c) => c.risk / input.entry <= config.maxRiskPercentOfPrice + config.priceEpsilon
    );
    const pool = withinLimit.length > 0 ? withinLimit : candidates;
    if (withinLimit.length === 0) {
      warnings.push(
        "No hybrid stop within max risk — using widest available candidate."
      );
    }
    const safest = pool.reduce((best, current) =>
      current.risk > best.risk ? current : best
    );
    return {
      stopLoss: round(safest.stopLoss, 4),
      method: "hybrid",
      candidates,
      warnings,
    };
  }

  const selected = candidates.find((c) => c.method === method);
  if (!selected) {
    warnings.push(`Requested stop method "${method}" produced no valid stop.`);
    return { stopLoss: null, method, candidates, warnings };
  }
  return {
    stopLoss: round(selected.stopLoss, 4),
    method,
    candidates,
    warnings,
  };
}

export function isValidStop(
  direction: ORBDetection["direction"],
  entry: number,
  stopLoss: number,
  config: ORBTradeConfig = DEFAULT_ORB_TRADE_CONFIG
): boolean {
  if (!Number.isFinite(entry) || !Number.isFinite(stopLoss)) return false;
  if (entry <= 0) return false;
  const risk = Math.abs(entry - stopLoss);
  if (risk < config.priceEpsilon) return false;
  if (direction === "BUY") return stopLoss < entry;
  if (direction === "SELL") return stopLoss > entry;
  return false;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isRiskWithinLimit(
  entry: number,
  risk: number,
  config: ORBTradeConfig = DEFAULT_ORB_TRADE_CONFIG
): boolean {
  if (!Number.isFinite(entry) || entry <= 0) return false;
  if (!Number.isFinite(risk) || risk <= 0) return false;
  return risk / entry <= config.maxRiskPercentOfPrice + config.priceEpsilon;
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: ORBDetection["direction"];
  config?: ORBTradeConfig;
}): { valid: boolean; risk: number; errors: string[] } {
  const config = input.config ?? DEFAULT_ORB_TRADE_CONFIG;
  const errors: string[] = [];

  if (!Number.isFinite(input.entry) || input.entry <= 0) {
    errors.push("Invalid entry.");
  }
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }

  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  if (risk < config.priceEpsilon) {
    errors.push("Risk is non-positive.");
  }
  if (!isRiskWithinLimit(input.entry, risk, config)) {
    errors.push("Risk exceeds configuration.");
  }

  return { valid: errors.length === 0, risk, errors };
}
