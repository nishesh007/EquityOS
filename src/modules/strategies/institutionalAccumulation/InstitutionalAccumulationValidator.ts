/**
 * Institutional Accumulation Validator — Sprint 11B.3H.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG,
  INSTITUTIONAL_ACCUMULATION_STRATEGY_ID,
  type InstitutionalAccumulationConfig,
} from "./InstitutionalAccumulationConstants";
import type {
  InstitutionalAccumulationDetectionContext,
  InstitutionalAccumulationValidationResult,
} from "./InstitutionalAccumulationTypes";
import {
  isValidMarketHours,
  resolveInstitutionalAccumulationConfig,
} from "./InstitutionalAccumulationUtils";

export class InstitutionalAccumulationValidator {
  private readonly config: InstitutionalAccumulationConfig;

  constructor(config?: Partial<InstitutionalAccumulationConfig>) {
    this.config = resolveInstitutionalAccumulationConfig(config);
  }

  validate(
    context: InstitutionalAccumulationDetectionContext | null | undefined
  ): InstitutionalAccumulationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Institutional Accumulation detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.institutionalAccumulation;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Institutional Accumulation market data payload."],
        warnings: [],
      };
    }

    const candles = data.candles5m ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Enough Candles missing — insufficient 5-minute OHLC sample.");
    }

    if (data.ema20 === null || !Number.isFinite(data.ema20)) {
      errors.push("EMA20 missing.");
    }
    if (data.ema50 === null || !Number.isFinite(data.ema50)) {
      errors.push("EMA50 missing.");
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
      INSTITUTIONAL_ACCUMULATION_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Institutional Accumulation.");
    }

    const probeTime =
      context.timestamp ?? candles[candles.length - 1]?.timestamp ?? null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for Institutional Accumulation detection.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for accumulation.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for institutional accumulation.");
    }

    if (
      data.relativeVolume !== null &&
      Number.isFinite(data.relativeVolume) &&
      data.relativeVolume < this.config.minRelativeVolume
    ) {
      warnings.push("Low relative volume.");
    }

    if (data.newsDriven === true) {
      errors.push("News-driven move — accumulation rejected.");
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

export function createInstitutionalAccumulationValidator(
  config?: Partial<InstitutionalAccumulationConfig>
): InstitutionalAccumulationValidator {
  return new InstitutionalAccumulationValidator(
    config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG
  );
}
