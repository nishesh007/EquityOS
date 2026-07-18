/**
 * VWAP Continuation Production Integration — Sprint 11B.3C.3.
 * Registers with StrategyRegistry / Factory / Engine and adapts pipeline output.
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
import type { VWAPContinuationConfig } from "./VWAPContinuationConstants";
import { VWAP_CONTINUATION_STRATEGY_ID } from "./VWAPContinuationConstants";
import { getVWAPContinuationMetrics } from "./VWAPContinuationMetrics";
import {
  createVWAPContinuationStrategyRegistration,
  VWAPContinuationStrategy,
} from "./VWAPContinuationStrategy";
import type { VWAPContinuationTradeConfig } from "./VWAPContinuationTradeTypes";
import { resolveVWAPContinuationTradeConfig } from "./VWAPContinuationTradeTypes";
import type { VWAPContinuationStrategyInput } from "./VWAPContinuationTypes";
import { isVWAPContinuationStrategyInput } from "./VWAPContinuationTypes";
import { resolveVWAPContinuationConfig } from "./VWAPContinuationUtils";

/**
 * Ensure VWAP Continuation is registered once in the shared StrategyRegistry.
 */
export function ensureVWAPContinuationRegistered(
  config?: Partial<VWAPContinuationConfig>,
  tradeConfig?: Partial<VWAPContinuationTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(VWAP_CONTINUATION_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createVWAPContinuationStrategyRegistration(config, tradeConfig)
  );
}

export function getVWAPContinuationFromFactory(): VWAPContinuationStrategy | null {
  ensureVWAPContinuationRegistered();
  const instance = getStrategyFactory().create(VWAP_CONTINUATION_STRATEGY_ID);
  return instance instanceof VWAPContinuationStrategy ? instance : null;
}

/**
 * Execute VWAP Continuation through the shared StrategyEngine.
 */
export function executeVWAPContinuationThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureVWAPContinuationRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    VWAP_CONTINUATION_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getVWAPContinuationFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getVWAPContinuationMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional — never crash.
  }

  return result;
}

/**
 * Adapt TradingPipelineResult + symbol market input into StrategyExecutionContext.
 */
export function buildVWAPContinuationContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | VWAPContinuationStrategyInput
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
 * Run VWAP Continuation end-to-end from a pipeline snapshot (no pipeline mutation).
 */
export function executeVWAPContinuationWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | VWAPContinuationStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildVWAPContinuationContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeVWAPContinuationThroughEngine(context, options);
}

export function isVWAPContinuationExecutableInput(
  input: StrategyMarketInput | VWAPContinuationStrategyInput
): input is VWAPContinuationStrategyInput {
  return isVWAPContinuationStrategyInput(input);
}

export function getVWAPContinuationIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureVWAPContinuationRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(VWAP_CONTINUATION_STRATEGY_ID),
    strategyId: VWAP_CONTINUATION_STRATEGY_ID,
    factoryReady: factory.has(VWAP_CONTINUATION_STRATEGY_ID),
  };
}

export { resolveVWAPContinuationConfig, resolveVWAPContinuationTradeConfig };
