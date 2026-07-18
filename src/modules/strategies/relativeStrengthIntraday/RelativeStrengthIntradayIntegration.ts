/**
 * Relative Strength Intraday Production Integration — Sprint 11B.3G.
 */

import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";
import { getStrategyEngine } from "../StrategyEngine";
import { getStrategyFactory } from "../StrategyFactory";
import { getStrategyRegistry } from "../StrategyRegistry";
import type {
  StrategyEngineResult,
  StrategyExecutionContext,
  StrategyMarketInput,
} from "../StrategyTypes";
import type { RelativeStrengthIntradayConfig } from "./RelativeStrengthIntradayConstants";
import { RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID } from "./RelativeStrengthIntradayConstants";
import { getRelativeStrengthIntradayMetrics } from "./RelativeStrengthIntradayMetrics";
import {
  createRelativeStrengthIntradayStrategyRegistration,
  RelativeStrengthIntradayStrategy,
} from "./RelativeStrengthIntradayStrategy";
import type { RelativeStrengthIntradayTradeConfig } from "./RelativeStrengthIntradayTradeTypes";
import { resolveRelativeStrengthIntradayTradeConfig } from "./RelativeStrengthIntradayTradeTypes";
import type { RelativeStrengthIntradayStrategyInput } from "./RelativeStrengthIntradayTypes";
import { isRelativeStrengthIntradayStrategyInput } from "./RelativeStrengthIntradayTypes";
import { resolveRelativeStrengthIntradayConfig } from "./RelativeStrengthIntradayUtils";

export function ensureRelativeStrengthIntradayRegistered(
  config?: Partial<RelativeStrengthIntradayConfig>,
  tradeConfig?: Partial<RelativeStrengthIntradayTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createRelativeStrengthIntradayStrategyRegistration(config, tradeConfig)
  );
}

export function getRelativeStrengthIntradayFromFactory(): RelativeStrengthIntradayStrategy | null {
  ensureRelativeStrengthIntradayRegistered();
  const instance = getStrategyFactory().create(
    RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID
  );
  return instance instanceof RelativeStrengthIntradayStrategy ? instance : null;
}

export function executeRelativeStrengthIntradayThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureRelativeStrengthIntradayRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getRelativeStrengthIntradayFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getRelativeStrengthIntradayMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildRelativeStrengthIntradayContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | RelativeStrengthIntradayStrategyInput
): StrategyExecutionContext {
  return {
    input: marketInput,
    marketContext: pipeline.context,
    regime: pipeline.regime,
    confidence: pipeline.confidence,
    eligibleStrategies: pipeline.eligibleStrategies,
    riskMode: pipeline.context.riskMode,
    timestamp: pipeline.timestamp,
  };
}

export function executeRelativeStrengthIntradayWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | RelativeStrengthIntradayStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildRelativeStrengthIntradayContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeRelativeStrengthIntradayThroughEngine(context, options);
}

export function isRelativeStrengthIntradayExecutableInput(
  input: StrategyMarketInput | RelativeStrengthIntradayStrategyInput
): input is RelativeStrengthIntradayStrategyInput {
  return isRelativeStrengthIntradayStrategyInput(input);
}

export function getRelativeStrengthIntradayIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureRelativeStrengthIntradayRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID),
    strategyId: RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
    factoryReady: factory.has(RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID),
  };
}

export {
  resolveRelativeStrengthIntradayConfig,
  resolveRelativeStrengthIntradayTradeConfig,
};
