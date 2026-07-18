/**
 * Pipeline validator — Sprint 11B.2D.
 * Validates structural integrity of TradingPipelineResult.
 */

import { PIPELINE_STAGE_ORDER } from "./TradingPipelineTypes";
import type {
  PipelineValidationIssue,
  PipelineValidationResult,
  TradingPipelineConfig,
  TradingPipelineResult,
} from "./TradingPipelineTypes";
import { DEFAULT_TRADING_PIPELINE_CONFIG } from "./TradingPipelineTypes";

function pushIssue(
  issues: PipelineValidationIssue[],
  issue: PipelineValidationIssue
): void {
  issues.push(issue);
}

/**
 * Validate a completed pipeline result.
 * Never throws.
 */
export function validatePipelineResult(
  result: TradingPipelineResult | null | undefined,
  config: TradingPipelineConfig = DEFAULT_TRADING_PIPELINE_CONFIG
): PipelineValidationResult {
  const issues: PipelineValidationIssue[] = [];

  if (!result) {
    pushIssue(issues, {
      code: "MISSING_RESULT",
      severity: "error",
      message: "Pipeline result is missing.",
    });
    return finalize(issues);
  }

  if (!result.context) {
    pushIssue(issues, {
      code: "MISSING_CONTEXT",
      severity: "error",
      message: "Institutional market context object is missing.",
      stage: "Market Context",
    });
  }

  if (!result.regime) {
    pushIssue(issues, {
      code: "MISSING_REGIME",
      severity: "error",
      message: "Market regime object is missing.",
      stage: "Market Regime",
    });
  }

  if (!result.confidence) {
    pushIssue(issues, {
      code: "MISSING_CONFIDENCE",
      severity: "error",
      message: "Regime confidence analysis is missing.",
      stage: "Confidence",
    });
  }

  if (!Array.isArray(result.eligibleStrategies)) {
    pushIssue(issues, {
      code: "MISSING_ELIGIBILITY",
      severity: "error",
      message: "Eligible strategies array is missing.",
      stage: "Eligibility",
    });
  }

  if (result.regime) {
    if (!result.regime.regime) {
      pushIssue(issues, {
        code: "INVALID_REGIME",
        severity: "error",
        message: "Regime label is invalid or empty.",
        stage: "Market Regime",
      });
    }
    if (
      !Number.isFinite(result.regime.confidence) ||
      result.regime.confidence < config.minValidConfidence ||
      result.regime.confidence > config.maxValidConfidence
    ) {
      pushIssue(issues, {
        code: "INVALID_REGIME_CONFIDENCE",
        severity: "error",
        message: "Regime confidence is outside valid 0–100 range.",
        stage: "Market Regime",
      });
    }
  }

  if (result.confidence) {
    if (
      !Number.isFinite(result.confidence.score) ||
      result.confidence.score < config.minValidConfidence ||
      result.confidence.score > config.maxValidConfidence
    ) {
      pushIssue(issues, {
        code: "INVALID_CONFIDENCE",
        severity: "error",
        message: "Confidence score is outside valid 0–100 range.",
        stage: "Confidence",
      });
    }
  }

  if (Array.isArray(result.eligibleStrategies)) {
    const seen = new Set<string>();
    for (const strategy of result.eligibleStrategies) {
      if (!strategy || !strategy.strategyId) {
        pushIssue(issues, {
          code: "NULL_STRATEGY",
          severity: "error",
          message: "Eligible strategy entry contains null or missing id.",
          stage: "Eligibility",
        });
        continue;
      }
      if (seen.has(strategy.strategyId)) {
        pushIssue(issues, {
          code: "DUPLICATE_STRATEGY",
          severity: "error",
          message: `Duplicate eligible strategy id: ${strategy.strategyId}.`,
          stage: "Eligibility",
        });
      }
      seen.add(strategy.strategyId);
    }
  }

  validateStageExecution(result, issues);
  validateTimestamps(result, config, issues);
  validateNoNullCoreFields(result, issues);

  return finalize(issues);
}

function validateStageExecution(
  result: TradingPipelineResult,
  issues: PipelineValidationIssue[]
): void {
  if (!Array.isArray(result.stages) || result.stages.length === 0) {
    pushIssue(issues, {
      code: "MISSING_STAGES",
      severity: "warning",
      message: "Pipeline stage execution records are missing.",
    });
    return;
  }

  const seen = new Set<string>();
  const orders: number[] = [];

  for (const stage of result.stages) {
    if (seen.has(stage.stage)) {
      pushIssue(issues, {
        code: "DUPLICATE_EXECUTION",
        severity: "error",
        message: `Stage "${stage.stage}" executed more than once.`,
        stage: stage.stage,
      });
    }
    seen.add(stage.stage);
    orders.push(stage.order);

    const expectedIndex = PIPELINE_STAGE_ORDER.indexOf(stage.stage);
    if (expectedIndex === -1) {
      pushIssue(issues, {
        code: "UNKNOWN_STAGE",
        severity: "error",
        message: `Unknown pipeline stage: ${stage.stage}.`,
      });
    } else if (stage.order !== expectedIndex) {
      pushIssue(issues, {
        code: "OUT_OF_ORDER",
        severity: "error",
        message: `Stage "${stage.stage}" executed out of fixed order.`,
        stage: stage.stage,
      });
    }
  }

  // Circular / non-monotonic order detection
  for (let i = 1; i < orders.length; i += 1) {
    if (orders[i]! <= orders[i - 1]!) {
      pushIssue(issues, {
        code: "CIRCULAR_DEPENDENCY",
        severity: "error",
        message: "Pipeline stage order is non-increasing (circular dependency risk).",
      });
      break;
    }
  }
}

function validateTimestamps(
  result: TradingPipelineResult,
  config: TradingPipelineConfig,
  issues: PipelineValidationIssue[]
): void {
  const pipelineTs = result.timestamp?.getTime?.();
  const contextTs = result.context?.timestamp?.getTime?.();
  const regimeTs = result.regime?.timestamp?.getTime?.();

  if (!Number.isFinite(pipelineTs)) {
    pushIssue(issues, {
      code: "INVALID_TIMESTAMP",
      severity: "error",
      message: "Pipeline timestamp is invalid.",
    });
    return;
  }

  if (Number.isFinite(contextTs) && Number.isFinite(regimeTs)) {
    const skew = Math.abs((contextTs as number) - (regimeTs as number));
    if (skew > config.maxTimestampSkewMs) {
      pushIssue(issues, {
        code: "INCONSISTENT_TIMESTAMPS",
        severity: "warning",
        message: "Context and regime timestamps diverge beyond tolerance.",
      });
    }
  }
}

function validateNoNullCoreFields(
  result: TradingPipelineResult,
  issues: PipelineValidationIssue[]
): void {
  if (result.context) {
    const required: Array<keyof typeof result.context> = [
      "marketTrend",
      "marketStrength",
      "marketBreadth",
      "volatility",
      "riskMode",
      "healthScore",
    ];
    for (const key of required) {
      if (result.context[key] === null || result.context[key] === undefined) {
        pushIssue(issues, {
          code: "NULL_CONTEXT_FIELD",
          severity: "error",
          message: `Context field "${String(key)}" is null.`,
          stage: "Market Context",
        });
      }
    }
  }

  if (
    !Number.isFinite(result.pipelineHealth) ||
    !Number.isFinite(result.pipelineConfidence)
  ) {
    pushIssue(issues, {
      code: "INVALID_PIPELINE_SCORES",
      severity: "error",
      message: "Pipeline health or confidence score is not a finite number.",
    });
  }
}

function finalize(issues: PipelineValidationIssue[]): PipelineValidationResult {
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

export class PipelineValidator {
  constructor(
    private readonly config: TradingPipelineConfig = DEFAULT_TRADING_PIPELINE_CONFIG
  ) {}

  validate(
    result: TradingPipelineResult | null | undefined
  ): PipelineValidationResult {
    return validatePipelineResult(result, this.config);
  }
}
