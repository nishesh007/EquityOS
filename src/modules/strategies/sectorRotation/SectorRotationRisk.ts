/**
 * Sector Rotation Risk utilities — Sprint 11B.3J.
 */

import { round } from "@/lib/engine/utils";
import type {
  SectorRotationCandle,
  SectorRotationDetection,
  SectorRotationDirection,
} from "./SectorRotationTypes";
import {
  DEFAULT_SECTOR_ROTATION_TRADE_CONFIG,
  type SectorRotationStopMethod,
  type SectorRotationTradeConfig,
} from "./SectorRotationTradeTypes";

export interface SectorRotationStopCandidate {
  method: Exclude<SectorRotationStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findRecentSwingLow(
  candles: readonly SectorRotationCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const low = Math.min(...window.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

export function findRecentSwingHigh(
  candles: readonly SectorRotationCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const high = Math.max(...window.map((c) => c.high));
  return Number.isFinite(high) ? high : null;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: SectorRotationDirection,
  entry: number,
  stopLoss: number,
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
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
  detection: SectorRotationDetection,
  entry: number,
  atr: number | null,
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateEma20Stop(
  detection: SectorRotationDetection,
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
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

export function calculateSwingStop(
  detection: SectorRotationDetection,
  candles: readonly SectorRotationCandle[],
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
): number | null {
  if (detection.direction === "BUY") {
    const swing = findRecentSwingLow(candles, config.swingLookbackBars);
    return swing !== null && Number.isFinite(swing) ? round(swing, 4) : null;
  }
  if (detection.direction === "SELL") {
    const swing = findRecentSwingHigh(candles, config.swingLookbackBars);
    return swing !== null && Number.isFinite(swing) ? round(swing, 4) : null;
  }
  return null;
}

export function calculateVwapStop(
  detection: SectorRotationDetection,
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
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
  detection: SectorRotationDetection;
  entry: number;
  atr: number | null;
  candles: readonly SectorRotationCandle[];
  method?: SectorRotationStopMethod;
  config?: SectorRotationTradeConfig;
}): {
  stopLoss: number | null;
  method: SectorRotationStopMethod;
  candidates: SectorRotationStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: SectorRotationStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<SectorRotationStopMethod, "hybrid">,
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
    "swing",
    calculateSwingStop(input.detection, input.candles, config),
    "Swing stop unavailable."
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
    if (b.risk !== a.risk) return b.risk - a.risk;
    const rank = (m: string) =>
      m === "swing" ? 4 : m === "vwap" ? 3 : m === "ema20" ? 2 : 1;
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
  direction: SectorRotationDirection;
  config?: SectorRotationTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
