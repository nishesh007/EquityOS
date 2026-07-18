/**
 * Momentum Continuation Risk utilities — Sprint 11B.3F.
 */

import { round } from "@/lib/engine/utils";
import type {
  MomentumContinuationCandle,
  MomentumContinuationDetection,
  MomentumContinuationDirection,
} from "./MomentumContinuationTypes";
import {
  DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG,
  type MomentumContinuationStopMethod,
  type MomentumContinuationTradeConfig,
} from "./MomentumContinuationTradeTypes";

export interface MomentumContinuationStopCandidate {
  method: Exclude<MomentumContinuationStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: MomentumContinuationDirection,
  entry: number,
  stopLoss: number,
  config: MomentumContinuationTradeConfig = DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG
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
  detection: MomentumContinuationDetection,
  entry: number,
  atr: number | null,
  config: MomentumContinuationTradeConfig = DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculatePullbackStop(
  detection: MomentumContinuationDetection,
  config: MomentumContinuationTradeConfig = DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG
): number | null {
  if (detection.direction === "BUY") {
    if (!Number.isFinite(detection.pullbackLow) || detection.pullbackLow <= 0) {
      return null;
    }
    return round(
      detection.pullbackLow * (1 - config.pullbackStopBufferPct),
      4
    );
  }
  if (detection.direction === "SELL") {
    if (!Number.isFinite(detection.pullbackHigh) || detection.pullbackHigh <= 0) {
      return null;
    }
    return round(
      detection.pullbackHigh * (1 + config.pullbackStopBufferPct),
      4
    );
  }
  return null;
}

export function calculateEma20Stop(
  detection: MomentumContinuationDetection,
  config: MomentumContinuationTradeConfig = DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG
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

export function resolveStopLoss(input: {
  detection: MomentumContinuationDetection;
  entry: number;
  atr: number | null;
  candles: readonly MomentumContinuationCandle[];
  method?: MomentumContinuationStopMethod;
  config?: MomentumContinuationTradeConfig;
}): {
  stopLoss: number | null;
  method: MomentumContinuationStopMethod;
  candidates: MomentumContinuationStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: MomentumContinuationStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<MomentumContinuationStopMethod, "hybrid">,
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
    "pullback",
    calculatePullbackStop(input.detection, config),
    "Pullback stop unavailable."
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
    if (b.risk !== a.risk) return b.risk - a.risk;
    const rank = (m: string) =>
      m === "pullback" ? 3 : m === "ema20" ? 2 : 1;
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
  direction: MomentumContinuationDirection;
  config?: MomentumContinuationTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
