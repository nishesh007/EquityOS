/**
 * Flat Base Risk utilities — Sprint 11B.3R.
 */

import { round } from "@/lib/engine/utils";
import type { FlatBaseDetection, FlatBaseDirection } from "./FlatBaseTypes";
import {
  DEFAULT_FLAT_BASE_TRADE_CONFIG,
  type FlatBaseStopMethod,
  type FlatBaseTradeConfig,
} from "./FlatBaseTradeTypes";

export interface FlatBaseStopCandidate {
  method: Exclude<FlatBaseStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: FlatBaseDirection,
  entry: number,
  stopLoss: number,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
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

export function calculateBaseLowStop(
  detection: FlatBaseDetection,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.baseLow) || detection.baseLow <= 0) {
    return null;
  }
  return round(detection.baseLow * (1 - config.baseStopBufferPct), 4);
}

export function calculateAtrStop(
  detection: FlatBaseDetection,
  entry: number,
  atr: number | null,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
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
  detection: FlatBaseDetection,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ema20) || detection.ema20 <= 0) return null;
  return round(detection.ema20 * (1 - config.emaStopBufferPct), 4);
}

export function calculateVwapStop(
  detection: FlatBaseDetection,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.vwap) || detection.vwap <= 0) return null;
  return round(detection.vwap * (1 - config.vwapStopBufferPct), 4);
}

export function resolveStopLoss(input: {
  detection: FlatBaseDetection;
  entry: number;
  atr: number | null;
  method?: FlatBaseStopMethod;
  config?: FlatBaseTradeConfig;
}): {
  stopLoss: number | null;
  method: FlatBaseStopMethod;
  candidates: FlatBaseStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_FLAT_BASE_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: FlatBaseStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<FlatBaseStopMethod, "hybrid">,
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
    "base_low",
    calculateBaseLowStop(input.detection, config),
    "Base low stop unavailable."
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
      m === "base_low" ? 4 : m === "ema20" ? 3 : m === "vwap" ? 2 : 1;
    return rank(b.method) - rank(a.method);
  });
  const chosen = candidates[0]!;
  return { stopLoss: chosen.stopLoss, method: "hybrid", candidates, warnings };
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: FlatBaseDirection;
  config?: FlatBaseTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_FLAT_BASE_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
