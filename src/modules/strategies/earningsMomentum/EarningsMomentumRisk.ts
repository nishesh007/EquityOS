/**
 * Earnings Momentum Risk utilities — Sprint 11B.3T.
 */

import { round } from "@/lib/engine/utils";
import type {
  EarningsMomentumCandle,
  EarningsMomentumDetection,
  EarningsMomentumDirection,
} from "./EarningsMomentumTypes";
import {
  DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG,
  type EarningsMomentumStopMethod,
  type EarningsMomentumTradeConfig,
} from "./EarningsMomentumTradeTypes";

export interface EarningsMomentumStopCandidate {
  method: Exclude<EarningsMomentumStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: EarningsMomentumDirection,
  entry: number,
  stopLoss: number,
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
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
  detection: EarningsMomentumDetection,
  entry: number,
  atr: number | null,
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
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

export function calculateEma20Stop(
  detection: EarningsMomentumDetection,
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
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
  detection: EarningsMomentumDetection,
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
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

export function calculateSwingStop(
  detection: EarningsMomentumDetection,
  _candles: readonly EarningsMomentumCandle[],
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
): number | null {
  if (detection.direction === "BUY") {
    if (!(detection.swingLow > 0)) return null;
    return round(detection.swingLow * (1 - config.emaStopBufferPct), 4);
  }
  if (detection.direction === "SELL") {
    if (!(detection.swingHigh > 0)) return null;
    return round(detection.swingHigh * (1 + config.emaStopBufferPct), 4);
  }
  return null;
}

export function resolveStopLoss(input: {
  detection: EarningsMomentumDetection;
  entry: number;
  atr: number | null;
  candles: readonly EarningsMomentumCandle[];
  method?: EarningsMomentumStopMethod;
  config?: EarningsMomentumTradeConfig;
}): {
  stopLoss: number | null;
  method: EarningsMomentumStopMethod;
  candidates: EarningsMomentumStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: EarningsMomentumStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<EarningsMomentumStopMethod, "hybrid">,
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
    "ema20",
    calculateEma20Stop(input.detection, config),
    "EMA20 stop unavailable."
  );
  pushIfValid(
    "vwap",
    calculateVwapStop(input.detection, config),
    "VWAP stop unavailable."
  );
  pushIfValid(
    "swing_low",
    calculateSwingStop(input.detection, input.candles, config),
    "Swing stop unavailable."
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
      m === "swing_low" ? 4 : m === "ema20" ? 3 : m === "vwap" ? 2 : 1;
    return rank(b.method) - rank(a.method);
  });
  const chosen = candidates[0]!;
  return { stopLoss: chosen.stopLoss, method: "hybrid", candidates, warnings };
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: EarningsMomentumDirection;
  config?: EarningsMomentumTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
