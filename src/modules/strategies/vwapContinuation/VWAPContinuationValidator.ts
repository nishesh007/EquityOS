/**
 * VWAP Continuation Validator — Sprint 11B.3C.1.
 * Structural gates before detection (hours, candles, VWAP, eligibility, regime).
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_VWAP_CONTINUATION_CONFIG,
  VWAP_CONTINUATION_STRATEGY_ID,
  type VWAPContinuationConfig,
} from "./VWAPContinuationConstants";
import type {
  VWAPContinuationDetectionContext,
  VWAPContinuationValidationResult,
} from "./VWAPContinuationTypes";
import {
  isValidMarketHours,
  resolveVWAPContinuationConfig,
} from "./VWAPContinuationUtils";

export class VWAPContinuationValidator {
  private readonly config: VWAPContinuationConfig;

  constructor(config?: Partial<VWAPContinuationConfig>) {
    this.config = resolveVWAPContinuationConfig(config);
  }

  validate(
    context: VWAPContinuationDetectionContext | null | undefined
  ): VWAPContinuationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["VWAP Continuation detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.vwapContinuation;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing VWAP Continuation market data payload."],
        warnings: [],
      };
    }

    const candles = data.candles5m ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Enough Candles missing — insufficient 5-minute OHLC sample.");
    }

    const hasVolume = candles.some(
      (c) => Number.isFinite(c.volume) && c.volume > 0
    );
    if (candles.length > 0 && !hasVolume) {
      errors.push("Valid Volume missing on session candles.");
    }

    if (!Number.isFinite(data.vwap) || data.vwap <= 0) {
      errors.push("Valid VWAP missing.");
    }

    if (!context.marketContext) {
      errors.push("Valid Context missing — market context absent.");
    }

    if (!context.regime?.regime) {
      errors.push("Compatible Regime missing — market regime absent.");
    }

    if (
      !context.confidence ||
      !Number.isFinite(context.confidence.score)
    ) {
      errors.push("Valid Context incomplete — regime confidence missing.");
    }

    const eligible = isStrategyEligible(
      VWAP_CONTINUATION_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for VWAP Continuation.");
    }

    const probeTime =
      context.timestamp ??
      candles[candles.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for VWAP Continuation detection.");
    }

    if (data.relativeVolume === null) {
      warnings.push("Relative volume missing — volume confirmation may fail.");
    }
    if (data.atr === null) {
      warnings.push("ATR missing — informational only for this sprint.");
    }

    const invalidBar = candles.find(
      (c) =>
        !Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close)
    );
    if (invalidBar) {
      errors.push("Data quality failure — invalid OHLC values present.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for VWAP Continuation.`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function createVWAPContinuationValidator(
  config?: Partial<VWAPContinuationConfig>
): VWAPContinuationValidator {
  return new VWAPContinuationValidator(config ?? DEFAULT_VWAP_CONTINUATION_CONFIG);
}
