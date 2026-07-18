/**
 * Breakout Retest Risk utilities — Sprint 11B.3I.
 */

import { round } from "@/lib/engine/utils";
import type {
  BreakoutRetestCandle,
  BreakoutRetestDetection,
  BreakoutRetestDirection,
} from "./BreakoutRetestTypes";
import {
  DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG,
  type BreakoutRetestStopMethod,
  type BreakoutRetestTradeConfig,
} from "./BreakoutRetestTradeTypes";

export interface BreakoutRetestStopCandidate {
  method: Exclude<BreakoutRetestStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: BreakoutRetestDirection,
  entry: number,
  stopLoss: number,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
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

export function calculateAtrStop(
  detection: BreakoutRetestDetection,
  entry: number,
  atr: number | null,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateRetestLowStop(
  detection: BreakoutRetestDetection,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
): number | null {
  if (detection.retestLow <= 0) return null;
  if (detection.direction === "BUY") {
    return round(
      detection.retestLow * (1 - config.retestStopBufferPct),
      4
    );
  }
  if (detection.direction === "SELL" && detection.retestHigh > 0) {
    return round(
      detection.retestHigh * (1 + config.retestStopBufferPct),
      4
    );
  }
  return null;
}

export function calculateEma20Stop(
  detection: BreakoutRetestDetection,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ema20) || detection.ema20 <= 0) return null;
  if (detection.direction === "BUY") {
    return round(detection.ema20 * (1 - config.emaStopBufferPct), 4);
  }
  if (detection.direction === "SELL") {
    return round(detection.ema20 * (1 + config.emaStopBufferPct), 4);
  }
  return null;
}

export function calculateVwapStop(
  detection: BreakoutRetestDetection,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
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
  detection: BreakoutRetestDetection;
  entry: number;
  atr: number | null;
  candles: readonly BreakoutRetestCandle[];
  method?: BreakoutRetestStopMethod;
  config?: BreakoutRetestTradeConfig;
}): {
  stopLoss: number | null;
  method: BreakoutRetestStopMethod;
  candidates: BreakoutRetestStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: BreakoutRetestStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<BreakoutRetestStopMethod, "hybrid">,
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
    "retest_low",
    calculateRetestLowStop(input.detection, config),
    "Retest low stop unavailable."
  );
  pushIfValid(
    "atr",
    calculateAtrStop(input.detection, input.entry, input.atr, config),
    "ATR stop unavailable."
  );
  pushIfValid(
    "vwap",
    calculateVwapStop(input.detection, config),
    "VWAP stop unavailable."
  );
  pushIfValid(
    "ema20",
    calculateEma20Stop(input.detection, config),
    "EMA20 stop unavailable."
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
    if (b.risk !== a.risk) return b.risk - a.risk;
    const rank = (m: string) =>
      m === "retest_low" ? 5 : m === "ema20" ? 4 : m === "vwap" ? 3 : 2;
    return rank(b.method) - rank(a.method);
  });
  const chosen = candidates[0]!;
  return {
    stopLoss: chosen.stopLoss,
    method: "hybrid",
    candidates,
    warnings,
  };
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: BreakoutRetestDirection;
  config?: BreakoutRetestTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
