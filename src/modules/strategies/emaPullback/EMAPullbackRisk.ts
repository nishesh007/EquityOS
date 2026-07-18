/**
 * EMA Pullback Risk utilities — Sprint 11B.3P.
 */

import { round } from "@/lib/engine/utils";
import type {
  EMAPullbackCandle,
  EMAPullbackDetection,
  EMAPullbackDirection,
} from "./EMAPullbackTypes";
import {
  DEFAULT_EMA_PULLBACK_TRADE_CONFIG,
  type EMAPullbackStopMethod,
  type EMAPullbackTradeConfig,
} from "./EMAPullbackTradeTypes";

export interface EMAPullbackStopCandidate {
  method: Exclude<EMAPullbackStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: EMAPullbackDirection,
  entry: number,
  stopLoss: number,
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
): boolean {
  if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || entry <= 0) {
    return false;
  }
  if (direction === "BUY" && stopLoss >= entry) return false;
  if (direction === "SELL" && stopLoss <= entry) return false;
  const riskPct = Math.abs(entry - stopLoss) / entry;
  if (riskPct > config.maxRiskPercentOfPrice) return false;
  if (riskPct < config.priceEpsilon) return false;
  return true;
}

export function findRecentSwingLow(
  candles: readonly EMAPullbackCandle[],
  lookbackBars: number
): number | null {
  const window = candles.slice(-Math.max(lookbackBars, 3));
  if (window.length < 3) return null;
  let swing: number | null = null;
  for (let i = 1; i < window.length - 1; i += 1) {
    const prev = window[i - 1]!;
    const cur = window[i]!;
    const next = window[i + 1]!;
    if (cur.low <= prev.low && cur.low <= next.low) {
      swing = swing === null ? cur.low : Math.min(swing, cur.low);
    }
  }
  if (swing === null) swing = Math.min(...window.map((c) => c.low));
  return Number.isFinite(swing) && swing > 0 ? round(swing, 4) : null;
}

export function findRecentSwingHigh(
  candles: readonly EMAPullbackCandle[],
  lookbackBars: number
): number | null {
  const window = candles.slice(-Math.max(lookbackBars, 3));
  if (window.length < 3) return null;
  let swing: number | null = null;
  for (let i = 1; i < window.length - 1; i += 1) {
    const prev = window[i - 1]!;
    const cur = window[i]!;
    const next = window[i + 1]!;
    if (cur.high >= prev.high && cur.high >= next.high) {
      swing = swing === null ? cur.high : Math.max(swing, cur.high);
    }
  }
  if (swing === null) swing = Math.max(...window.map((c) => c.high));
  return Number.isFinite(swing) && swing > 0 ? round(swing, 4) : null;
}

export function calculateAtrStop(
  detection: EMAPullbackDetection,
  entry: number,
  atr: number | null,
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
): number | null {
  const atrValue =
    atr !== null && Number.isFinite(atr) && atr > 0
      ? atr
      : detection.atr > 0
        ? detection.atr
        : null;
  if (atrValue === null || entry <= 0) return null;
  const distance = atrValue * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateEma50Stop(
  detection: EMAPullbackDetection,
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ema50) || detection.ema50 <= 0) return null;
  if (detection.direction === "BUY") {
    return round(detection.ema50 * (1 - config.emaStopBufferPct), 4);
  }
  if (detection.direction === "SELL") {
    return round(detection.ema50 * (1 + config.emaStopBufferPct), 4);
  }
  return null;
}

export function calculateSwingStop(
  detection: EMAPullbackDetection,
  candles: readonly EMAPullbackCandle[],
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
): number | null {
  if (detection.direction === "BUY") {
    return findRecentSwingLow(candles, config.swingLookbackBars);
  }
  if (detection.direction === "SELL") {
    return findRecentSwingHigh(candles, config.swingLookbackBars);
  }
  return null;
}

export function calculateVwapStop(
  detection: EMAPullbackDetection,
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.vwap) || detection.vwap <= 0) return null;
  if (detection.direction === "BUY") {
    return round(detection.vwap * (1 - config.vwapStopBufferPct), 4);
  }
  if (detection.direction === "SELL") {
    return round(detection.vwap * (1 + config.vwapStopBufferPct), 4);
  }
  return null;
}

export function resolveStopLoss(input: {
  detection: EMAPullbackDetection;
  entry: number;
  atr: number | null;
  candles: readonly EMAPullbackCandle[];
  method?: EMAPullbackStopMethod;
  config?: EMAPullbackTradeConfig;
}): {
  stopLoss: number | null;
  method: EMAPullbackStopMethod;
  candidates: EMAPullbackStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: EMAPullbackStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<EMAPullbackStopMethod, "hybrid">,
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
        risk: calculateRiskAmount(input.entry, stop),
      });
    } else if (stop === null) {
      warnings.push(softWarn);
    }
  };

  pushIfValid(
    "atr",
    calculateAtrStop(input.detection, input.entry, input.atr, config),
    "ATR stop unavailable."
  );
  pushIfValid(
    "ema50",
    calculateEma50Stop(input.detection, config),
    "EMA50 stop unavailable."
  );
  pushIfValid(
    "swing_low",
    calculateSwingStop(input.detection, input.candles, config),
    "Swing stop unavailable."
  );
  pushIfValid(
    "vwap",
    calculateVwapStop(input.detection, config),
    "VWAP stop unavailable."
  );

  if (method !== "hybrid") {
    const match = candidates.find((c) => c.method === method);
    if (match) {
      return { stopLoss: match.stopLoss, method, candidates, warnings };
    }
    warnings.push(`Requested stop method ${method} invalid — falling back.`);
  }

  if (candidates.length === 0) {
    return { stopLoss: null, method, candidates, warnings };
  }

  candidates.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk - b.risk;
    const rank = (m: string) =>
      m === "ema50" ? 4 : m === "swing_low" ? 3 : m === "vwap" ? 2 : 1;
    return rank(b.method) - rank(a.method);
  });
  const chosen = candidates[0]!;
  return { stopLoss: chosen.stopLoss, method: "hybrid", candidates, warnings };
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: EMAPullbackDirection;
  config?: EMAPullbackTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
