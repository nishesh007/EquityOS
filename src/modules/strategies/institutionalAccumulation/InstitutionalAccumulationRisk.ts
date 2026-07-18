/**
 * Institutional Accumulation Risk utilities — Sprint 11B.3H.
 */

import { round } from "@/lib/engine/utils";
import type {
  InstitutionalAccumulationCandle,
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationDirection,
} from "./InstitutionalAccumulationTypes";
import {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG,
  type InstitutionalAccumulationStopMethod,
  type InstitutionalAccumulationTradeConfig,
} from "./InstitutionalAccumulationTradeTypes";

export interface InstitutionalAccumulationStopCandidate {
  method: Exclude<InstitutionalAccumulationStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function findRecentSwingLow(
  candles: readonly InstitutionalAccumulationCandle[],
  lookback: number
): number | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-Math.max(lookback, 1));
  const low = Math.min(...window.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

export function findRecentSwingHigh(
  candles: readonly InstitutionalAccumulationCandle[],
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
  direction: InstitutionalAccumulationDirection,
  entry: number,
  stopLoss: number,
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
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
  detection: InstitutionalAccumulationDetection,
  entry: number,
  atr: number | null,
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
): number | null {
  if (atr === null || !Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(entry) || entry <= 0) return null;
  const distance = atr * config.atrStopMultiple;
  if (detection.direction === "BUY") return round(entry - distance, 4);
  if (detection.direction === "SELL") return round(entry + distance, 4);
  return null;
}

export function calculateDemandZoneStop(
  detection: InstitutionalAccumulationDetection,
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
): number | null {
  if (detection.demandZoneLow <= 0) return null;
  if (detection.direction === "BUY") {
    return round(
      detection.demandZoneLow * (1 - config.demandZoneBufferPct),
      4
    );
  }
  if (detection.direction === "SELL" && detection.demandZoneHigh > 0) {
    return round(
      detection.demandZoneHigh * (1 + config.demandZoneBufferPct),
      4
    );
  }
  return null;
}

export function calculateSwingStop(
  detection: InstitutionalAccumulationDetection,
  candles: readonly InstitutionalAccumulationCandle[],
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
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
  detection: InstitutionalAccumulationDetection,
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
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
  detection: InstitutionalAccumulationDetection;
  entry: number;
  atr: number | null;
  candles: readonly InstitutionalAccumulationCandle[];
  method?: InstitutionalAccumulationStopMethod;
  config?: InstitutionalAccumulationTradeConfig;
}): {
  stopLoss: number | null;
  method: InstitutionalAccumulationStopMethod;
  candidates: InstitutionalAccumulationStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: InstitutionalAccumulationStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<InstitutionalAccumulationStopMethod, "hybrid">,
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
    "demand_zone",
    calculateDemandZoneStop(input.detection, config),
    "Demand zone stop unavailable."
  );
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

  // Hybrid: widest protective distance (safest stop)
  candidates.sort((a, b) => {
    if (b.risk !== a.risk) return b.risk - a.risk;
    const rank = (m: string) =>
      m === "demand_zone" ? 5 : m === "swing" ? 4 : m === "vwap" ? 3 : 2;
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
  direction: InstitutionalAccumulationDirection;
  config?: InstitutionalAccumulationTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
