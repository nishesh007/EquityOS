/**
 * VWAP Mean Reversion Validator — Sprint 11B.3D.1.
 * Structural gates before detection.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_VWAP_MEAN_REVERSION_CONFIG,
  VWAP_MEAN_REVERSION_STRATEGY_ID,
  type VWAPMeanReversionConfig,
} from "./VWAPMeanReversionConstants";
import type {
  VWAPMeanReversionDetectionContext,
  VWAPMeanReversionValidationResult,
} from "./VWAPMeanReversionTypes";
import {
  calculateVWAPBands,
  isValidMarketHours,
  resolveVWAPMeanReversionConfig,
} from "./VWAPMeanReversionUtils";

export class VWAPMeanReversionValidator {
  private readonly config: VWAPMeanReversionConfig;

  constructor(config?: Partial<VWAPMeanReversionConfig>) {
    this.config = resolveVWAPMeanReversionConfig(config);
  }

  validate(
    context: VWAPMeanReversionDetectionContext | null | undefined
  ): VWAPMeanReversionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["VWAP Mean Reversion detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.vwapMeanReversion;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing VWAP Mean Reversion market data payload."],
        warnings: [],
      };
    }

    const candles = data.candles5m ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Enough Candles missing — insufficient 5-minute OHLC sample.");
    }

    if (!Number.isFinite(data.vwap) || data.vwap <= 0) {
      errors.push("Valid VWAP missing.");
    }

    const bands =
      data.bands &&
      Number.isFinite(data.bands.sigma) &&
      data.bands.sigma > 0
        ? data.bands
        : calculateVWAPBands(
            candles,
            data.vwap,
            data.vwapStdDev,
            this.config.bandSigma
          );
    if (!bands) {
      errors.push("Standard Deviation Bands missing or invalid.");
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
      VWAP_MEAN_REVERSION_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for VWAP Mean Reversion.");
    }

    const probeTime =
      context.timestamp ??
      candles[candles.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for VWAP Mean Reversion detection.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for mean reversion.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Valid Liquidity failed — volatility too high for mean reversion.");
    }

    if (
      data.relativeVolume !== null &&
      Number.isFinite(data.relativeVolume) &&
      data.relativeVolume < this.config.minRelativeVolumeLiquidity
    ) {
      warnings.push("Low liquidity relative volume.");
    }

    if (data.rsi === null || data.rsi === undefined) {
      warnings.push("RSI missing — will derive from closes when possible.");
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

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function createVWAPMeanReversionValidator(
  config?: Partial<VWAPMeanReversionConfig>
): VWAPMeanReversionValidator {
  return new VWAPMeanReversionValidator(
    config ?? DEFAULT_VWAP_MEAN_REVERSION_CONFIG
  );
}
