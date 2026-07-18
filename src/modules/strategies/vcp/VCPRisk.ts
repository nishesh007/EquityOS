/**
 * VCP Risk utilities — Sprint 11B.3L.
 */

import { round } from "@/lib/engine/utils";
import type { VCPDetection, VCPDirection } from "./VCPTypes";
import {
  DEFAULT_VCP_TRADE_CONFIG,
  type VCPStopMethod,
  type VCPTradeConfig,
} from "./VCPTradeTypes";

export interface VCPStopCandidate {
  method: Exclude<VCPStopMethod, "hybrid">;
  stopLoss: number;
  risk: number;
}

export function calculateRiskAmount(entry: number, stopLoss: number): number {
  return round(Math.abs(entry - stopLoss), 4);
}

export function isValidStop(
  direction: VCPDirection,
  entry: number,
  stopLoss: number,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
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

export function calculatePivotLowStop(
  detection: VCPDetection,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.pivotLow) || detection.pivotLow <= 0) {
    return null;
  }
  return round(detection.pivotLow * (1 - config.pivotStopBufferPct), 4);
}

export function calculateLastContractionLowStop(
  detection: VCPDetection,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
): number | null {
  if (
    !Number.isFinite(detection.lastContractionLow) ||
    detection.lastContractionLow <= 0
  ) {
    return null;
  }
  return round(
    detection.lastContractionLow * (1 - config.pivotStopBufferPct),
    4
  );
}

export function calculateAtrStop(
  detection: VCPDetection,
  entry: number,
  atr: number | null,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
): number | null {
  const atrValue =
    atr !== null && Number.isFinite(atr) && atr > 0
      ? atr
      : detection.atr > 0
        ? detection.atr
        : null;
  if (atrValue === null || !Number.isFinite(entry) || entry <= 0) return null;
  return round(entry - atrValue * config.atrStopMultiple, 4);
}

export function calculateEma20Stop(
  detection: VCPDetection,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
): number | null {
  if (!Number.isFinite(detection.ema20) || detection.ema20 <= 0) return null;
  return round(detection.ema20 * (1 - config.emaStopBufferPct), 4);
}

export function resolveStopLoss(input: {
  detection: VCPDetection;
  entry: number;
  atr: number | null;
  method?: VCPStopMethod;
  config?: VCPTradeConfig;
}): {
  stopLoss: number | null;
  method: VCPStopMethod;
  candidates: VCPStopCandidate[];
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_VCP_TRADE_CONFIG;
  const method = input.method ?? config.stopMethod;
  const warnings: string[] = [];
  const candidates: VCPStopCandidate[] = [];

  const pushIfValid = (
    stopMethod: Exclude<VCPStopMethod, "hybrid">,
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
    "pivot_low",
    calculatePivotLowStop(input.detection, config),
    "Pivot low stop unavailable."
  );
  pushIfValid(
    "last_contraction_low",
    calculateLastContractionLowStop(input.detection, config),
    "Last contraction low stop unavailable."
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

  // Hybrid: prefer tighter valid institutional stop with pivot preference
  candidates.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk - b.risk;
    const rank = (m: string) =>
      m === "last_contraction_low"
        ? 4
        : m === "pivot_low"
          ? 3
          : m === "ema20"
            ? 2
            : 1;
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
  direction: VCPDirection;
  config?: VCPTradeConfig;
}): { valid: boolean; errors: string[] } {
  const config = input.config ?? DEFAULT_VCP_TRADE_CONFIG;
  const errors: string[] = [];
  if (!isValidStop(input.direction, input.entry, input.stopLoss, config)) {
    errors.push("Invalid stop.");
  }
  return { valid: errors.length === 0, errors };
}
