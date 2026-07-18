/**
 * Liquidity Sweep Validator — Sprint 11B.3E.
 * Structural gates before detection.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_LIQUIDITY_SWEEP_CONFIG,
  LIQUIDITY_SWEEP_STRATEGY_ID,
  type LiquiditySweepConfig,
} from "./LiquiditySweepConstants";
import type {
  LiquiditySweepDetectionContext,
  LiquiditySweepValidationResult,
} from "./LiquiditySweepTypes";
import {
  isValidMarketHours,
  resolveLiquiditySweepConfig,
} from "./LiquiditySweepUtils";

export class LiquiditySweepValidator {
  private readonly config: LiquiditySweepConfig;

  constructor(config?: Partial<LiquiditySweepConfig>) {
    this.config = resolveLiquiditySweepConfig(config);
  }

  validate(
    context: LiquiditySweepDetectionContext | null | undefined
  ): LiquiditySweepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Liquidity Sweep detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.liquiditySweep;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Liquidity Sweep market data payload."],
        warnings: [],
      };
    }

    const candles = data.candles5m ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Enough Candles missing — insufficient 5-minute OHLC sample.");
    }

    if (!Number.isFinite(data.vwap) || data.vwap <= 0) {
      warnings.push("VWAP missing — targets may use swing/ATR fallbacks.");
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
      LIQUIDITY_SWEEP_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Liquidity Sweep.");
    }

    const probeTime =
      context.timestamp ?? candles[candles.length - 1]?.timestamp ?? null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for Liquidity Sweep detection.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for liquidity sweep.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (
      Number.isFinite(vol) &&
      vol! < this.config.minVolatilityScore
    ) {
      errors.push(
        "Valid Liquidity failed — volatility too low for liquidity sweeps."
      );
    }

    if (
      data.relativeVolume !== null &&
      Number.isFinite(data.relativeVolume) &&
      data.relativeVolume < this.config.minRelativeVolume
    ) {
      warnings.push("Low liquidity relative volume.");
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

export function createLiquiditySweepValidator(
  config?: Partial<LiquiditySweepConfig>
): LiquiditySweepValidator {
  return new LiquiditySweepValidator(
    config ?? DEFAULT_LIQUIDITY_SWEEP_CONFIG
  );
}
