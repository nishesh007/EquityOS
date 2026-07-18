/**
 * Flat Base Production Integration — Sprint 11B.3R.
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
import type { FlatBaseConfig } from "./FlatBaseConstants";
import { FLAT_BASE_STRATEGY_ID } from "./FlatBaseConstants";
import { getFlatBaseMetrics } from "./FlatBaseMetrics";
import {
  createFlatBaseStrategyRegistration,
  FlatBaseStrategy,
} from "./FlatBaseStrategy";
import type { FlatBaseTradeConfig } from "./FlatBaseTradeTypes";
import { resolveFlatBaseTradeConfig } from "./FlatBaseTradeTypes";
import type { FlatBaseStrategyInput } from "./FlatBaseTypes";
import { isFlatBaseStrategyInput } from "./FlatBaseTypes";
import { resolveFlatBaseConfig } from "./FlatBaseUtils";

export function ensureFlatBaseRegistered(
  config?: Partial<FlatBaseConfig>,
  tradeConfig?: Partial<FlatBaseTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(FLAT_BASE_STRATEGY_ID)) return true;
  return registry.register(
    createFlatBaseStrategyRegistration(config, tradeConfig)
  );
}

export function getFlatBaseFromFactory(): FlatBaseStrategy | null {
  ensureFlatBaseRegistered();
  const instance = getStrategyFactory().create(FLAT_BASE_STRATEGY_ID);
  return instance instanceof FlatBaseStrategy ? instance : null;
}

export function executeFlatBaseThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureFlatBaseRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(FLAT_BASE_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });
  try {
    const strategy = getFlatBaseFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getFlatBaseMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildFlatBaseContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | FlatBaseStrategyInput
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

export function executeFlatBaseWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | FlatBaseStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildFlatBaseContextFromPipeline(pipeline, marketInput);
  return executeFlatBaseThroughEngine(context, options);
}

export function isFlatBaseExecutableInput(
  input: StrategyMarketInput | FlatBaseStrategyInput
): input is FlatBaseStrategyInput {
  return isFlatBaseStrategyInput(input);
}

export function getFlatBaseIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureFlatBaseRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(FLAT_BASE_STRATEGY_ID),
    strategyId: FLAT_BASE_STRATEGY_ID,
    factoryReady: factory.has(FLAT_BASE_STRATEGY_ID),
  };
}

export { resolveFlatBaseConfig, resolveFlatBaseTradeConfig };
