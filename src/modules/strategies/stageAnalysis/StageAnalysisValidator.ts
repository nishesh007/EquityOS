/**
 * Stage Analysis Validator — Sprint 11B.3M.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_STAGE_ANALYSIS_CONFIG,
  STAGE_ANALYSIS_STRATEGY_ID,
  type StageAnalysisConfig,
} from "./StageAnalysisConstants";
import type {
  StageAnalysisDetectionContext,
  StageAnalysisValidationResult,
} from "./StageAnalysisTypes";
import {
  isValidMarketHours,
  resolveStageAnalysisConfig,
} from "./StageAnalysisUtils";

export class StageAnalysisValidator {
  private readonly config: StageAnalysisConfig;

  constructor(config?: Partial<StageAnalysisConfig>) {
    this.config = resolveStageAnalysisConfig(config);
  }

  validate(
    context: StageAnalysisDetectionContext | null | undefined
  ): StageAnalysisValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Stage Analysis detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.stageAnalysis;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Stage Analysis market data payload."],
        warnings: [],
      };
    }

    if ((data.candlesWeekly ?? []).length < this.config.minimumWeeklyCandles) {
      errors.push("Enough Candles missing — insufficient weekly OHLC sample.");
    }
    if ((data.candlesDaily ?? []).length < this.config.minimumDailyCandles) {
      warnings.push("Daily OHLC sample short for Stage Analysis.");
    }

    if (data.ema20 === null || !Number.isFinite(data.ema20)) {
      errors.push("EMA20 missing.");
    }
    if (data.ema50 === null || !Number.isFinite(data.ema50)) {
      errors.push("EMA50 missing.");
    }
    if (
      (data.ma30Week === null || !Number.isFinite(data.ma30Week)) &&
      (data.candlesWeekly ?? []).length < 30
    ) {
      errors.push("30W MA missing.");
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
      STAGE_ANALYSIS_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Stage Analysis.");
    }

    const probeTime =
      context.timestamp ??
      data.candlesDaily[data.candlesDaily.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for Stage Analysis.");
    }

    const invalidBar = [...(data.candlesWeekly ?? []), ...(data.candlesDaily ?? [])].find(
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

export function createStageAnalysisValidator(
  config?: Partial<StageAnalysisConfig>
): StageAnalysisValidator {
  return new StageAnalysisValidator(config ?? DEFAULT_STAGE_ANALYSIS_CONFIG);
}
