/**
 * VWAP Continuation Risk utilities — Sprint 11B.3C.2.
 * Stop-loss candidates and risk validation. Pure functions only.
 */

import { round } from "@/lib/engine/utils";
import type {
  VWAPCandle,
  VWAPContinuationDetection,
  VWAPContinuationDirection,
} from "./VWAPContinuationTypes";
import {
  DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG,
  type VWAPContinuationStopMethod,
  type VWAPContinuationTradeConfig,
} from "./VWAPContinuationTradeTypes";

export interface VWAPContinuationStopCandidate {
  method: Exclude<VWAPContinuationStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findRecentSwingLow(
  candles: readonly VWAPCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const low = Math.min(...window.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

export function findRecentSwingHigh(
  candles: readonly VWAPCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const high = Math.max(...window.map((c) => c.high));
  return Number.isFinite(high) ? high : null;
}

export function calculateVwapBufferStop(
  detection: VWAPContinuationDetection,
  vwap: number,
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(vwap) || vwap <= 0) return null;
  const buffer = vwap * config.vwapStopBufferPct;
  if (detection.direction === "BUY") return round(vwap - buffer, 4);
  if (detection.direction === "SELL") return round(vwap + buffer, 4);
  return null;
}

export function calculateAtrStop(
  detection: VWAPContinuationDetection,
  entry: number,
  atr: number | null,
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateSwingStop(
  detection: VWAPContinuationDetection,
  candles: readonly VWAPCandle[],
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG,
  recentSwingHigh?: number | null,
  recentSwingLow?: number | null
): number | null {
  if (detection.direction === "BUY") {
    const swing =
      recentSwingLow !== undefined &&
      recentSwingLow !== null &&
      Number.isFinite(recentSwingLow)
        ? recentSwingLow
        : findRecentSwingLow(candles, config.swingLookbackBars);
    return swing !== null && Number.isFinite(swing) ? round(swing, 4) : null;
  }
  if (detection.direction === "SELL") {
    const swing =
      recentSwingHigh !== undefined &&
      recentSwingHigh !== null &&
      Number.isFinite(recentSwingHigh)
        ? recentSwingHigh
        : findRecentSwingHigh(candles, config.swingLookbackBars);
    return swing !== null && Number.isFinite(swing) ? round(swing, 4) : null;
  }
  return null;
}

/**
 * Build stop candidates for the configured method.
 * Hybrid selects the safest valid stop (widest protective distance within risk).
 */
export function resolveStopLoss(input: {
  detection: VWAPContinuationDetection;
  entry: number;
  atr: number | null;
  vwap: number;
  candles: readonly VWAPCandle[];
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  method?: VWAPContinuationStopMethod;
  config?: VWAPContinuationTradeConfig;
}): {
  stopLoss: number | null;
  method: VWAPContinuationStopMethod;
  candidates: VWAPContinuationStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: VWAPContinuationStopCandidate[] = [];

  const vwapStop = calculateVwapBufferStop(
    input.detection,
    input.vwap,
    config
  );
  if (
    vwapStop !== null &&
    isValidStop(input.detection.direction, input.entry, vwapStop, config)
  ) {
    candidates.push({
      method: "vwap_buffer",
      stopLoss: vwapStop,
      risk: Math.abs(input.entry - vwapStop),
    });
  } else if (method === "vwap_buffer" || method === "hybrid") {
    warnings.push("VWAP buffer stop unavailable or invalid.");
  }

  const atrStop = calculateAtrStop(
    input.detection,
    input.entry,
    input.atr,
    config
  );
  if (
    atrStop !== null &&
    isValidStop(input.detection.direction, input.entry, atrStop, config)
  ) {
    candidates.push({
      method: "atr",
      stopLoss: atrStop,
      risk: Math.abs(input.entry - atrStop),
    });
  } else if (method === "atr" || method === "hybrid") {
    warnings.push("ATR stop unavailable or invalid.");
  }

  const swingStop = calculateSwingStop(
    input.detection,
    input.candles,
    config,
    input.recentSwingHigh,
    input.recentSwingLow
  );
  if (
    swingStop !== null &&
    isValidStop(input.detection.direction, input.entry, swingStop, config)
  ) {
    candidates.push({
      method: "swing",
      stopLoss: swingStop,
      risk: Math.abs(input.entry - swingStop),
    });
  } else if (method === "swing" || method === "hybrid") {
    warnings.push("Swing stop unavailable or invalid.");
  }

  if (candidates.length === 0) {
    return { stopLoss: null, method, candidates, warnings };
  }

  if (method === "hybrid") {
    const withinLimit = candidates.filter(
      (c) =>
        c.risk / input.entry <=
        config.maxRiskPercentOfPrice + config.priceEpsilon
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
  direction: VWAPContinuationDirection,
  entry: number,
  stopLoss: number,
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
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
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
): boolean {
  if (!Number.isFinite(entry) || entry <= 0) return false;
  if (!Number.isFinite(risk) || risk <= 0) return false;
  return risk / entry <= config.maxRiskPercentOfPrice + config.priceEpsilon;
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: VWAPContinuationDirection;
  config?: VWAPContinuationTradeConfig;
}): { valid: boolean; risk: number; errors: string[] } {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG;
  const errors: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);

  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  if (!isRiskWithinLimit(input.entry, risk, config)) {
    errors.push("Risk exceeds configuration.");
  }

  return { valid: errors.length === 0, risk, errors };
}
