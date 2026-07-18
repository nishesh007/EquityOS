/**
 * Liquidity Sweep Risk utilities — Sprint 11B.3E.
 * Stop-loss candidates and risk validation. Pure functions only.
 */

import { round } from "@/lib/engine/utils";
import type {
  LiquiditySweepCandle,
  LiquiditySweepDetection,
  LiquiditySweepDirection,
} from "./LiquiditySweepTypes";
import {
  DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG,
  type LiquiditySweepStopMethod,
  type LiquiditySweepTradeConfig,
} from "./LiquiditySweepTradeTypes";

export interface LiquiditySweepStopCandidate {
  method: Exclude<LiquiditySweepStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findRecentSwingLow(
  candles: readonly LiquiditySweepCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const low = Math.min(...window.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

export function findRecentSwingHigh(
  candles: readonly LiquiditySweepCandle[],
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
  direction: LiquiditySweepDirection,
  entry: number,
  stopLoss: number,
  config: LiquiditySweepTradeConfig = DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG
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
  detection: LiquiditySweepDetection,
  entry: number,
  atr: number | null,
  config: LiquiditySweepTradeConfig = DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateSweepExtremeStop(
  detection: LiquiditySweepDetection,
  config: LiquiditySweepTradeConfig = DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.sweepExtreme) || detection.sweepExtreme <= 0) {
    return null;
  }
  const buffer = detection.sweepExtreme * config.sweepStopBufferPct;
  if (detection.direction === "BUY") {
    return round(detection.sweepExtreme - buffer, 4);
  }
  if (detection.direction === "SELL") {
    return round(detection.sweepExtreme + buffer, 4);
  }
  return null;
}

export function calculateSwingStop(
  detection: LiquiditySweepDetection,
  candles: readonly LiquiditySweepCandle[],
  config: LiquiditySweepTradeConfig = DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG,
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

export function resolveStopLoss(input: {
  detection: LiquiditySweepDetection;
  entry: number;
  atr: number | null;
  candles: readonly LiquiditySweepCandle[];
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  method?: LiquiditySweepStopMethod;
  config?: LiquiditySweepTradeConfig;
}): {
  stopLoss: number | null;
  method: LiquiditySweepStopMethod;
  candidates: LiquiditySweepStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: LiquiditySweepStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<LiquiditySweepStopMethod, "hybrid">,
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
    "sweep_extreme",
    calculateSweepExtremeStop(input.detection, config),
    "Sweep extreme stop unavailable."
  );
  pushIfValid(
    "atr",
    calculateAtrStop(input.detection, input.entry, input.atr, config),
    "ATR stop unavailable."
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
    "Swing stop unavailable."
  );

  if (method !== "hybrid") {
    const match = candidates.find((c) => c.method === method);
    if (match) {
      return {
        stopLoss: match.stopLoss,
        method,
        candidates,
        warnings,
      };
    }
    warnings.push(`Requested stop method ${method} invalid — falling back.`);
  }

  if (candidates.length === 0) {
    return { stopLoss: null, method, candidates, warnings };
  }

  // Hybrid: prefer widest protective distance (safest), prefer sweep_extreme tie-break
  candidates.sort((a, b) => {
    if (b.risk !== a.risk) return b.risk - a.risk;
    const rank = (m: string) =>
      m === "sweep_extreme" ? 3 : m === "swing" ? 2 : 1;
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
  direction: LiquiditySweepDirection;
  config?: LiquiditySweepTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  const riskPct = Math.abs(input.entry - input.stopLoss) / input.entry;
  if (riskPct > config.maxRiskPercentOfPrice) {
    errors.push("Risk exceeds max percent of price.");
  }
  return { valid: errors.length === 0, errors };
}
