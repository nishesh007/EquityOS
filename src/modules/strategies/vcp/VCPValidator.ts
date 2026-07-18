/**
 * VCP Validator — Sprint 11B.3L.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_VCP_CONFIG,
  VCP_STRATEGY_ID,
  type VCPConfig,
} from "./VCPConstants";
import type {
  VCPDetectionContext,
  VCPValidationResult,
} from "./VCPTypes";
import { isValidMarketHours, resolveVCPConfig } from "./VCPUtils";

export class VCPValidator {
  private readonly config: VCPConfig;

  constructor(config?: Partial<VCPConfig>) {
    this.config = resolveVCPConfig(config);
  }

  validate(
    context: VCPDetectionContext | null | undefined
  ): VCPValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["VCP detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.vcp;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing VCP market data payload."],
        warnings: [],
      };
    }

    const candles = data.candlesDaily ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Enough Candles missing — insufficient daily OHLC sample.");
    }

    if (data.ema20 === null || !Number.isFinite(data.ema20)) {
      errors.push("EMA20 missing.");
    }
    if (data.ema50 === null || !Number.isFinite(data.ema50)) {
      errors.push("EMA50 missing.");
    }
    if (data.ema150 === null || !Number.isFinite(data.ema150)) {
      errors.push("EMA150 missing.");
    }
    if (data.ema200 === null || !Number.isFinite(data.ema200)) {
      errors.push("EMA200 missing.");
    }
    if (data.atr === null || !Number.isFinite(data.atr)) {
      errors.push("ATR missing.");
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
    if (!context.confidence || !Number.isFinite(context.confidence.score)) {
      errors.push("Valid Context incomplete — regime confidence missing.");
    }

    const eligible = isStrategyEligible(
      VCP_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for VCP.");
    }

    const probeTime =
      context.timestamp ?? candles[candles.length - 1]?.timestamp ?? null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for VCP daily bar.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for VCP.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for VCP.");
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

export function createVCPValidator(
  config?: Partial<VCPConfig>
): VCPValidator {
  return new VCPValidator(config ?? DEFAULT_VCP_CONFIG);
}
