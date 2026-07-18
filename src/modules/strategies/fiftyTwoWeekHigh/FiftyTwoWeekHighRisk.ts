/**
 * 52-Week High Risk utilities — Sprint 11B.3S.
 */

import { round } from "@/lib/engine/utils";
import type {
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighDirection,
} from "./FiftyTwoWeekHighTypes";
import {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG,
  type FiftyTwoWeekHighStopMethod,
  type FiftyTwoWeekHighTradeConfig,
} from "./FiftyTwoWeekHighTradeTypes";

export interface FiftyTwoWeekHighStopCandidate {
  method: Exclude<FiftyTwoWeekHighStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: FiftyTwoWeekHighDirection,
  entry: number,
  stopLoss: number,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): boolean {
  if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || entry <= 0) {
    return false;
  }
  if (direction === "BUY" && stopLoss >= entry) return false;
  const riskPct = Math.abs(entry - stopLoss) / entry;
  if (riskPct > config.maxRiskPercentOfPrice) return false;
  if (riskPct < config.priceEpsilon) return false;
  return true;
}

export function calculateBreakoutLevelStop(
  detection: FiftyTwoWeekHighDetection,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): number | null {
  if (
    !Number.isFinite(detection.currentBreakoutLevel) ||
    detection.currentBreakoutLevel <= 0
  ) {
    return null;
  }
  return round(
    detection.currentBreakoutLevel * (1 - config.breakoutStopBufferPct),
    4
  );
}

export function calculateAtrStop(
  detection: FiftyTwoWeekHighDetection,
  entry: number,
  atr: number | null,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): number | null {
  const atrValue =
    atr !== null && Number.isFinite(atr) && atr > 0
      ? atr
      : detection.atr > 0
        ? detection.atr
        : null;
  if (atrValue === null || entry <= 0) return null;
  return round(entry - atrValue * config.atrStopMultiple, 4);
}

export function calculateEma20Stop(
  detection: FiftyTwoWeekHighDetection,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ema20) || detection.ema20 <= 0) return null;
  return round(detection.ema20 * (1 - config.emaStopBufferPct), 4);
}

export function calculateVwapStop(
  detection: FiftyTwoWeekHighDetection,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.vwap) || detection.vwap <= 0) return null;
  return round(detection.vwap * (1 - config.vwapStopBufferPct), 4);
}

export function calculateSwingLowStop(
  detection: FiftyTwoWeekHighDetection,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.swingLow) || detection.swingLow <= 0) {
    return null;
  }
  return round(detection.swingLow * (1 - config.swingLowStopBufferPct), 4);
}

export function resolveStopLoss(input: {
  detection: FiftyTwoWeekHighDetection;
  entry: number;
  atr: number | null;
  method?: FiftyTwoWeekHighStopMethod;
  config?: FiftyTwoWeekHighTradeConfig;
}): {
  stopLoss: number | null;
  method: FiftyTwoWeekHighStopMethod;
  candidates: FiftyTwoWeekHighStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: FiftyTwoWeekHighStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<FiftyTwoWeekHighStopMethod, "hybrid">,
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
    "breakout_level",
    calculateBreakoutLevelStop(input.detection, config),
    "Breakout level stop unavailable."
  );
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
    calculateSwingLowStop(input.detection, config),
    "Swing low stop unavailable."
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
      m === "breakout_level"
        ? 5
        : m === "swing_low"
          ? 4
          : m === "ema20"
            ? 3
            : m === "vwap"
              ? 2
              : 1;
    return rank(b.method) - rank(a.method);
  });
  const chosen = candidates[0]!;
  return { stopLoss: chosen.stopLoss, method: "hybrid", candidates, warnings };
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: FiftyTwoWeekHighDirection;
  config?: FiftyTwoWeekHighTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
