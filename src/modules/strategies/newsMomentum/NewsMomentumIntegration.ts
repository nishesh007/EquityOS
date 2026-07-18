/**
 * News Momentum Production Integration — Sprint 11B.3K.
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
import type { NewsMomentumConfig } from "./NewsMomentumConstants";
import { NEWS_MOMENTUM_STRATEGY_ID } from "./NewsMomentumConstants";
import { getNewsMomentumMetrics } from "./NewsMomentumMetrics";
import {
  createNewsMomentumStrategyRegistration,
  NewsMomentumStrategy,
} from "./NewsMomentumStrategy";
import type { NewsMomentumTradeConfig } from "./NewsMomentumTradeTypes";
import { resolveNewsMomentumTradeConfig } from "./NewsMomentumTradeTypes";
import type { NewsMomentumStrategyInput } from "./NewsMomentumTypes";
import { isNewsMomentumStrategyInput } from "./NewsMomentumTypes";
import { resolveNewsMomentumConfig } from "./NewsMomentumUtils";

export function ensureNewsMomentumRegistered(
  config?: Partial<NewsMomentumConfig>,
  tradeConfig?: Partial<NewsMomentumTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(NEWS_MOMENTUM_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createNewsMomentumStrategyRegistration(config, tradeConfig)
  );
}

export function getNewsMomentumFromFactory(): NewsMomentumStrategy | null {
  ensureNewsMomentumRegistered();
  const instance = getStrategyFactory().create(NEWS_MOMENTUM_STRATEGY_ID);
  return instance instanceof NewsMomentumStrategy ? instance : null;
}

export function executeNewsMomentumThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureNewsMomentumRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    NEWS_MOMENTUM_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getNewsMomentumFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getNewsMomentumMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildNewsMomentumContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | NewsMomentumStrategyInput
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

export function executeNewsMomentumWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | NewsMomentumStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildNewsMomentumContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeNewsMomentumThroughEngine(context, options);
}

export function isNewsMomentumExecutableInput(
  input: StrategyMarketInput | NewsMomentumStrategyInput
): input is NewsMomentumStrategyInput {
  return isNewsMomentumStrategyInput(input);
}

export function getNewsMomentumIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureNewsMomentumRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(NEWS_MOMENTUM_STRATEGY_ID),
    strategyId: NEWS_MOMENTUM_STRATEGY_ID,
    factoryReady: factory.has(NEWS_MOMENTUM_STRATEGY_ID),
  };
}

export {
  resolveNewsMomentumConfig,
  resolveNewsMomentumTradeConfig,
};
