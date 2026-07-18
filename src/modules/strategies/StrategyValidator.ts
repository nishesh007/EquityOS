/**
 * Strategy Validator — Sprint 11B.3A.
 * Framework-level gates before strategy-local validate().
 */

import type { BaseStrategy } from "./BaseStrategy";
import {
  DEFAULT_STRATEGY_FRAMEWORK_CONFIG,
  type StrategyFrameworkConfig,
} from "./StrategyConstants";
import type {
  StrategyExecutionContext,
  StrategyValidationIssue,
  StrategyValidationResult,
} from "./StrategyTypes";
import {
  isStrategyEligible,
  isValidMarketInput,
  mergeValidationResults,
  resolveStrategyFrameworkConfig,
} from "./StrategyUtils";

export class StrategyValidator {
  private readonly config: StrategyFrameworkConfig;

  constructor(config?: Partial<StrategyFrameworkConfig>) {
    this.config = resolveStrategyFrameworkConfig(config);
  }

  /**
   * Validate framework prerequisites. Never throws.
   */
  validate(
    strategy: BaseStrategy,
    context: StrategyExecutionContext,
    options: { skipEligibilityCheck?: boolean } = {}
  ): StrategyValidationResult {
    const issues: StrategyValidationIssue[] = [];

    if (!strategy) {
      issues.push({
        code: "MISSING_STRATEGY",
        severity: "error",
        message: "Strategy instance is missing.",
      });
      return finalize(issues);
    }

    if (!strategy.enabled) {
      issues.push({
        code: "DISABLED_STRATEGY",
        severity: "error",
        message: `Strategy "${strategy.id}" is disabled.`,
      });
    }

    if (!context) {
      issues.push({
        code: "MISSING_CONTEXT",
        severity: "error",
        message: "Strategy execution context is missing.",
      });
      return finalize(issues);
    }

    if (!isValidMarketInput(context.input)) {
      issues.push({
        code: "INVALID_INPUT",
        severity: "error",
        message: "Input data is invalid — symbol and positive lastPrice required.",
      });
    }

    if (!context.marketContext) {
      issues.push({
        code: "MISSING_MARKET_CONTEXT",
        severity: "error",
        message: "Market context is missing.",
      });
    } else {
      if (!Number.isFinite(context.marketContext.marketStrength)) {
        issues.push({
          code: "INVALID_MARKET_CONTEXT",
          severity: "error",
          message: "Market context contains invalid market strength.",
        });
      }
      if (!context.marketContext.marketBreadth) {
        issues.push({
          code: "INVALID_MARKET_CONTEXT",
          severity: "warning",
          message: "Market breadth is missing from context.",
        });
      }
    }

    if (!context.regime || !context.regime.regime) {
      issues.push({
        code: "INVALID_REGIME",
        severity: "error",
        message: "Market regime is missing or invalid.",
      });
    }

    if (
      !context.confidence ||
      !Number.isFinite(context.confidence.score) ||
      context.confidence.score < this.config.minimumRegimeConfidence
    ) {
      issues.push({
        code: "LOW_CONFIDENCE",
        severity: "error",
        message: "Regime confidence below strategy framework threshold.",
      });
    }

    if (!context.riskMode) {
      issues.push({
        code: "MISSING_RISK_MODE",
        severity: "error",
        message: "Risk mode is missing.",
      });
    }

    if (!options.skipEligibilityCheck) {
      const eligible = isStrategyEligible(
        strategy.id,
        context.eligibleStrategies ?? [],
        strategy.eligibilityId
      );
      if (!eligible) {
        issues.push({
          code: "NOT_ELIGIBLE",
          severity: "error",
          message: "Strategy is not eligible under current market regime.",
        });
      }
    }

    return finalize(issues);
  }

  /**
   * Framework gates + strategy-local validate().
   */
  validateAll(
    strategy: BaseStrategy,
    context: StrategyExecutionContext,
    options: { skipEligibilityCheck?: boolean } = {}
  ): StrategyValidationResult {
    const framework = this.validate(strategy, context, options);
    if (!framework.valid) {
      return framework;
    }
    try {
      const local = strategy.validate(context);
      return mergeValidationResults(framework, local);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Strategy local validation failed.";
      return mergeValidationResults(framework, {
        valid: false,
        issues: [
          {
            code: "LOCAL_VALIDATION_ERROR",
            severity: "error",
            message,
          },
        ],
        errors: [message],
        warnings: [],
      });
    }
  }
}

function finalize(issues: StrategyValidationIssue[]): StrategyValidationResult {
  const errors = issues
    .filter((i) => i.severity === "error")
    .map((i) => i.message);
  const warnings = issues
    .filter((i) => i.severity === "warning")
    .map((i) => i.message);
  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

export function createDefaultStrategyValidator(): StrategyValidator {
  return new StrategyValidator(DEFAULT_STRATEGY_FRAMEWORK_CONFIG);
}
