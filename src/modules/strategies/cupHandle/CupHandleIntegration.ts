/**
 * Cup & Handle Production Integration — Sprint 11B.3Q.
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
import type { CupHandleConfig } from "./CupHandleConstants";
import { CUP_HANDLE_STRATEGY_ID } from "./CupHandleConstants";
import { getCupHandleMetrics } from "./CupHandleMetrics";
import {
  createCupHandleStrategyRegistration,
  CupHandleStrategy,
} from "./CupHandleStrategy";
import type { CupHandleTradeConfig } from "./CupHandleTradeTypes";
import { resolveCupHandleTradeConfig } from "./CupHandleTradeTypes";
import type { CupHandleStrategyInput } from "./CupHandleTypes";
import { isCupHandleStrategyInput } from "./CupHandleTypes";
import { resolveCupHandleConfig } from "./CupHandleUtils";

export function ensureCupHandleRegistered(
  config?: Partial<CupHandleConfig>,
  tradeConfig?: Partial<CupHandleTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(CUP_HANDLE_STRATEGY_ID)) return true;
  return registry.register(
    createCupHandleStrategyRegistration(config, tradeConfig)
  );
}

export function getCupHandleFromFactory(): CupHandleStrategy | null {
  ensureCupHandleRegistered();
  const instance = getStrategyFactory().create(CUP_HANDLE_STRATEGY_ID);
  return instance instanceof CupHandleStrategy ? instance : null;
}

export function executeCupHandleThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureCupHandleRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(CUP_HANDLE_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });
  try {
    const strategy = getCupHandleFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getCupHandleMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildCupHandleContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | CupHandleStrategyInput
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

export function executeCupHandleWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | CupHandleStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildCupHandleContextFromPipeline(pipeline, marketInput);
  return executeCupHandleThroughEngine(context, options);
}

export function isCupHandleExecutableInput(
  input: StrategyMarketInput | CupHandleStrategyInput
): input is CupHandleStrategyInput {
  return isCupHandleStrategyInput(input);
}

export function getCupHandleIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureCupHandleRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(CUP_HANDLE_STRATEGY_ID),
    strategyId: CUP_HANDLE_STRATEGY_ID,
    factoryReady: factory.has(CUP_HANDLE_STRATEGY_ID),
  };
}

export { resolveCupHandleConfig, resolveCupHandleTradeConfig };
