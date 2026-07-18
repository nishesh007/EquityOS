/**
 * VWAP Mean Reversion Risk utilities — Sprint 11B.3D.2.
 * Stop-loss candidates and risk validation. Pure functions only.
 */

import { round } from "@/lib/engine/utils";
import type {
  VWAPMeanReversionCandle,
  VWAPMeanReversionDetection,
  VWAPMeanReversionDirection,
} from "./VWAPMeanReversionTypes";
import {
  DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
  type VWAPMeanReversionStopMethod,
  type VWAPMeanReversionTradeConfig,
} from "./VWAPMeanReversionTradeTypes";

export interface VWAPMeanReversionStopCandidate {
  method: Exclude<VWAPMeanReversionStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findRecentSwingLow(
  candles: readonly VWAPMeanReversionCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const low = Math.min(...window.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

export function findRecentSwingHigh(
  candles: readonly VWAPMeanReversionCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const high = Math.max(...window.map((c) => c.high));
  return Number.isFinite(high) ? high : null;
}

export function calculateAtrStop(
  detection: VWAPMeanReversionDetection,
  entry: number,
  atr: number | null,
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateSwingStop(
  detection: VWAPMeanReversionDetection,
  candles: readonly VWAPMeanReversionCandle[],
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
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
 * Stop beyond the extension extreme using σ buffer.
 */
export function calculateDeviationBufferStop(
  detection: VWAPMeanReversionDetection,
  entry: number,
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
): number | null {
  const sigma = detection.deviationBand;
  if (!Number.isFinite(sigma) || sigma <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const buffer = sigma * config.deviationStopBufferSigma;
  if (detection.direction === "BUY") {
    // Beyond the low-side extension
    return round(entry - Math.abs(detection.deviation) * sigma * 0.15 - buffer, 4);
  }
  if (detection.direction === "SELL") {
    return round(entry + Math.abs(detection.deviation) * sigma * 0.15 + buffer, 4);
  }
  return null;
}

export function calculateReversalCandleStop(
  detection: VWAPMeanReversionDetection,
  candles: readonly VWAPMeanReversionCandle[]
): number | null {
  const last = candles[candles.length - 1];
  if (!last) return null;
  if (detection.direction === "BUY") return round(last.low, 4);
  if (detection.direction === "SELL") return round(last.high, 4);
  return null;
}

/**
 * Hybrid selects the safest valid stop (widest protective distance within risk).
 */
export function resolveStopLoss(input: {
  detection: VWAPMeanReversionDetection;
  entry: number;
  atr: number | null;
  candles: readonly VWAPMeanReversionCandle[];
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  method?: VWAPMeanReversionStopMethod;
  config?: VWAPMeanReversionTradeConfig;
}): {
  stopLoss: number | null;
  method: VWAPMeanReversionStopMethod;
  candidates: VWAPMeanReversionStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: VWAPMeanReversionStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<VWAPMeanReversionStopMethod, "hybrid">,
    stop: number | null,
    softWarn: string
  ) => {
    if (
      stop !== null &&
      isValidStop(input.detection.direction, input.entry, stop, config)
    ) {
      candidates.push({
        method: stopMethod,
        stopLoss: stop,
        risk: Math.abs(input.entry - stop),
      });
    } else if (method === stopMethod || method === "hybrid") {
      warnings.push(softWarn);
    }
  };

  pushIfValid(
    "atr",
    calculateAtrStop(input.detection, input.entry, input.atr, config),
    "ATR stop unavailable or invalid."
  );
  pushIfValid(
    "swing",
    calculateSwingStop(
      input.detection,
      input.candles,
      config,
      input.recentSwingHigh,
      input.recentSwingLow
    ),
    "Swing stop unavailable or invalid."
  );
  pushIfValid(
    "vwap_deviation_buffer",
    calculateDeviationBufferStop(input.detection, input.entry, config),
    "VWAP deviation buffer stop unavailable or invalid."
  );
  pushIfValid(
    "reversal_candle",
    calculateReversalCandleStop(input.detection, input.candles),
    "Reversal candle stop unavailable or invalid."
  );

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
  direction: VWAPMeanReversionDirection,
  entry: number,
  stopLoss: number,
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
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
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
): boolean {
  if (!Number.isFinite(entry) || entry <= 0) return false;
  if (!Number.isFinite(risk) || risk <= 0) return false;
  return risk / entry <= config.maxRiskPercentOfPrice + config.priceEpsilon;
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: VWAPMeanReversionDirection;
  config?: VWAPMeanReversionTradeConfig;
}): { valid: boolean; risk: number; errors: string[] } {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG;
  const errors: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);

  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  if (!isRiskWithinLimit(input.entry, risk, config)) {
    errors.push("Risk exceeds configured maximum.");
  }

  return { valid: errors.length === 0, risk, errors };
}
