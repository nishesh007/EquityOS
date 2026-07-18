/**
 * ORB Production Integration — Sprint 11B.3B.3.
 * Registers ORB with StrategyRegistry / Factory / Engine and adapts pipeline output.
 * Does not modify framework or TradingPipeline internals.
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
import type { ORBConfig } from "./ORBConstants";
import { ORB_STRATEGY_ID } from "./ORBConstants";
import { getORBMetrics } from "./ORBMetrics";
import {
  createORBStrategyRegistration,
  ORBStrategy,
} from "./ORBStrategy";
import type { ORBTradeConfig } from "./ORBTradeTypes";
import type { ORBStrategyInput } from "./ORBTypes";
import { isORBStrategyInput } from "./ORBTypes";
import { resolveORBConfig } from "./ORBUtils";
import { resolveORBTradeConfig } from "./ORBTradeTypes";

/**
 * Ensure ORB is registered once in the shared StrategyRegistry.
 */
export function ensureORBRegistered(
  config?: Partial<ORBConfig>,
  tradeConfig?: Partial<ORBTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(ORB_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createORBStrategyRegistration(config, tradeConfig)
  );
}

export function getORBFromFactory(): ORBStrategy | null {
  ensureORBRegistered();
  const instance = getStrategyFactory().create(ORB_STRATEGY_ID);
  return instance instanceof ORBStrategy ? instance : null;
}

/**
 * Execute ORB through the shared StrategyEngine.
 */
export function executeORBThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureORBRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(ORB_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });

  try {
    const strategy = getORBFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getORBMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

/**
 * Adapt TradingPipelineResult + symbol market input into StrategyExecutionContext.
 */
export function buildORBContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | ORBStrategyInput
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

/**
 * Run ORB end-to-end from a pipeline snapshot (no pipeline mutation).
 */
export function executeORBWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | ORBStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildORBContextFromPipeline(pipeline, marketInput);
  return executeORBThroughEngine(context, options);
}

export function isORBExecutableInput(
  input: StrategyMarketInput | ORBStrategyInput
): input is ORBStrategyInput {
  return isORBStrategyInput(input);
}

export function getORBIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureORBRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(ORB_STRATEGY_ID),
    strategyId: ORB_STRATEGY_ID,
    factoryReady: factory.has(ORB_STRATEGY_ID),
  };
}

export { resolveORBConfig, resolveORBTradeConfig };
