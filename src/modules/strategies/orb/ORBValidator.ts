/**
 * ORB Validator — Sprint 11B.3B.1.
 * Structural gates before detection (hours, candles, eligibility, regime).
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_ORB_CONFIG,
  ORB_STRATEGY_ID,
  type ORBConfig,
} from "./ORBConstants";
import type {
  ORBDetectionContext,
  ORBValidationResult,
} from "./ORBTypes";
import {
  isValidMarketHours,
  resolveORBConfig,
  sessionMinutesOf,
} from "./ORBUtils";

export class ORBValidator {
  private readonly config: ORBConfig;

  constructor(config?: Partial<ORBConfig>) {
    this.config = resolveORBConfig(config);
  }

  validate(context: ORBDetectionContext | null | undefined): ORBValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["ORB detection context is missing."],
        warnings: [],
      };
    }

    const candles = context.input?.orb?.candles5m ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Missing candles — insufficient 5-minute OHLC sample.");
    }

    const hasVolume = candles.some(
      (c) => Number.isFinite(c.volume) && c.volume > 0
    );
    if (candles.length > 0 && !hasVolume) {
      errors.push("Missing volume on session candles.");
    }

    if (!context.marketContext) {
      errors.push("Missing market context.");
    }

    if (!context.regime?.regime) {
      errors.push("Missing market regime.");
    }

    if (
      !context.confidence ||
      !Number.isFinite(context.confidence.score)
    ) {
      errors.push("Missing regime confidence.");
    }

    const eligible = isStrategyEligible(
      ORB_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("ORB strategy is not eligible under current conditions.");
    }

    const probeTime =
      context.timestamp ??
      candles[candles.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Invalid market hours for ORB detection.");
    }

    // Opening range window must be able to exist in sample
    const rangeStart = this.config.rangeStart;
    const inRange = candles.filter((c) => {
      const minutes = sessionMinutesOf(
        c.timestamp,
        this.config.sessionUtcOffsetMinutes
      );
      const start =
        Number(rangeStart.split(":")[0]) * 60 +
        Number(rangeStart.split(":")[1]);
      const endParts = this.config.rangeEnd.split(":");
      const end = Number(endParts[0]) * 60 + Number(endParts[1]);
      return minutes >= start && minutes < end;
    });
    if (candles.length >= this.config.minimumSessionCandles && rangeStart) {
      if (inRange.length < this.config.minimumRangeCandles) {
        errors.push("Opening range does not exist in candle sample.");
      }
    }

    if (context.input.orb.relativeVolume === null) {
      warnings.push("Relative volume missing — volume confirmation may fail.");
    }
    if (context.input.orb.vwap === null) {
      warnings.push("VWAP missing — informational only for this sprint.");
    }
    if (context.input.orb.atr === null) {
      warnings.push("ATR missing — liquidity band uses soft confirmation.");
    }

    // Data quality: NaN OHLC
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

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function createORBValidator(
  config?: Partial<ORBConfig>
): ORBValidator {
  return new ORBValidator(config ?? DEFAULT_ORB_CONFIG);
}
