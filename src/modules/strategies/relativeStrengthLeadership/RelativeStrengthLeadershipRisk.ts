/**
 * Relative Strength Leadership Risk utilities — Sprint 11B.3O.
 */

import { round } from "@/lib/engine/utils";
import type {
  RelativeStrengthLeadershipCandle,
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipDirection,
} from "./RelativeStrengthLeadershipTypes";
import {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG,
  type RelativeStrengthLeadershipStopMethod,
  type RelativeStrengthLeadershipTradeConfig,
} from "./RelativeStrengthLeadershipTradeTypes";

export interface RelativeStrengthLeadershipStopCandidate {
  method: Exclude<RelativeStrengthLeadershipStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: RelativeStrengthLeadershipDirection,
  entry: number,
  stopLoss: number,
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
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

export function findRecentSwingLow(
  candles: readonly RelativeStrengthLeadershipCandle[],
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
  if (swing === null) {
    swing = Math.min(...window.map((c) => c.low));
  }
  return Number.isFinite(swing) && swing > 0 ? round(swing, 4) : null;
}

export function calculateEma20Stop(
  detection: RelativeStrengthLeadershipDetection,
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ema20) || detection.ema20 <= 0) return null;
  return round(detection.ema20 * (1 - config.emaStopBufferPct), 4);
}

export function calculateSwingLowStop(
  candles: readonly RelativeStrengthLeadershipCandle[],
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
): number | null {
  return findRecentSwingLow(candles, config.swingLookbackBars);
}

export function calculateAtrStop(
  detection: RelativeStrengthLeadershipDetection,
  entry: number,
  atr: number | null,
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
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

export function calculateVwapStop(
  detection: RelativeStrengthLeadershipDetection,
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.vwap) || detection.vwap <= 0) return null;
  return round(detection.vwap * (1 - config.vwapStopBufferPct), 4);
}

export function resolveStopLoss(input: {
  detection: RelativeStrengthLeadershipDetection;
  entry: number;
  atr: number | null;
  candles: readonly RelativeStrengthLeadershipCandle[];
  method?: RelativeStrengthLeadershipStopMethod;
  config?: RelativeStrengthLeadershipTradeConfig;
}): {
  stopLoss: number | null;
  method: RelativeStrengthLeadershipStopMethod;
  candidates: RelativeStrengthLeadershipStopCandidate[];
  warnings: string[];
} {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: RelativeStrengthLeadershipStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<RelativeStrengthLeadershipStopMethod, "hybrid">,
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
    "ema20",
    calculateEma20Stop(input.detection, config),
    "EMA20 stop unavailable."
  );
  pushIfValid(
    "swing_low",
    calculateSwingLowStop(input.candles, config),
    "Swing low stop unavailable."
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
      m === "ema20" ? 4 : m === "vwap" ? 3 : m === "swing_low" ? 2 : 1;
    return rank(b.method) - rank(a.method);
  });
  const chosen = candidates[0]!;
  return { stopLoss: chosen.stopLoss, method: "hybrid", candidates, warnings };
}

export function validateTradeRisk(input: {
  entry: number;
  stopLoss: number;
  direction: RelativeStrengthLeadershipDirection;
  config?: RelativeStrengthLeadershipTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
