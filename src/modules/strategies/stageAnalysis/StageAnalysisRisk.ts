/**
 * Stage Analysis Risk utilities — Sprint 11B.3M.
 */

import { round } from "@/lib/engine/utils";
import type {
  StageAnalysisCandle,
  StageAnalysisDetection,
  StageAnalysisDirection,
} from "./StageAnalysisTypes";
import {
  DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG,
  type StageAnalysisStopMethod,
  type StageAnalysisTradeConfig,
} from "./StageAnalysisTradeTypes";

export interface StageAnalysisStopCandidate {
  method: Exclude<StageAnalysisStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findRecentSwingLow(
  candles: readonly StageAnalysisCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const low = Math.min(...window.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

export function findRecentSwingHigh(
  candles: readonly StageAnalysisCandle[],
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
  direction: StageAnalysisDirection,
  entry: number,
  stopLoss: number,
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
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

export function calculateMa30wStop(
  detection: StageAnalysisDetection,
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ma30Week) || detection.ma30Week <= 0) {
    return null;
  }
  if (detection.direction === "BUY") {
    return round(detection.ma30Week * (1 - config.maStopBufferPct), 4);
  }
  if (detection.direction === "SELL") {
    return round(detection.ma30Week * (1 + config.maStopBufferPct), 4);
  }
  return null;
}

export function calculateAtrStop(
  detection: StageAnalysisDetection,
  entry: number,
  atr: number | null,
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
): number | null {
  const atrValue =
    atr !== null && Number.isFinite(atr) && atr > 0
      ? atr
      : detection.atr > 0
        ? detection.atr
        : null;
  if (atrValue === null || !Number.isFinite(entry) || entry <= 0) return null;
  if (detection.direction === "BUY") {
    return round(entry - atrValue * config.atrStopMultiple, 4);
  }
  if (detection.direction === "SELL") {
    return round(entry + atrValue * config.atrStopMultiple, 4);
  }
  return null;
}

export function calculateEma20Stop(
  detection: StageAnalysisDetection,
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
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
  detection: StageAnalysisDetection,
  candles: readonly StageAnalysisCandle[],
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
): number | null {
  if (detection.direction === "BUY") {
    const swing = findRecentSwingLow(candles, config.swingLookbackBars);
    return swing !== null ? round(swing, 4) : null;
  }
  if (detection.direction === "SELL") {
    const swing = findRecentSwingHigh(candles, config.swingLookbackBars);
    return swing !== null ? round(swing, 4) : null;
  }
  return null;
}

export function resolveStopLoss(input: {
  detection: StageAnalysisDetection;
  entry: number;
  atr: number | null;
  candles: readonly StageAnalysisCandle[];
  method?: StageAnalysisStopMethod;
  config?: StageAnalysisTradeConfig;
}): {
  stopLoss: number | null;
  method: StageAnalysisStopMethod;
  candidates: StageAnalysisStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: StageAnalysisStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<StageAnalysisStopMethod, "hybrid">,
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
    "ma30w",
    calculateMa30wStop(input.detection, config),
    "30W MA stop unavailable."
  );
  pushIfValid(
    "swing_low",
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
      m === "ma30w" ? 4 : m === "swing_low" ? 3 : m === "ema20" ? 2 : 1;
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
  direction: StageAnalysisDirection;
  config?: StageAnalysisTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
