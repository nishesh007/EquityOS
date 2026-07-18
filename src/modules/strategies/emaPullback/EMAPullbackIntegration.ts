/**
 * EMA Pullback Production Integration — Sprint 11B.3P.
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
import type { EMAPullbackConfig } from "./EMAPullbackConstants";
import { EMA_PULLBACK_STRATEGY_ID } from "./EMAPullbackConstants";
import { getEMAPullbackMetrics } from "./EMAPullbackMetrics";
import {
  createEMAPullbackStrategyRegistration,
  EMAPullbackStrategy,
} from "./EMAPullbackStrategy";
import type { EMAPullbackTradeConfig } from "./EMAPullbackTradeTypes";
import { resolveEMAPullbackTradeConfig } from "./EMAPullbackTradeTypes";
import type { EMAPullbackStrategyInput } from "./EMAPullbackTypes";
import { isEMAPullbackStrategyInput } from "./EMAPullbackTypes";
import { resolveEMAPullbackConfig } from "./EMAPullbackUtils";

export function ensureEMAPullbackRegistered(
  config?: Partial<EMAPullbackConfig>,
  tradeConfig?: Partial<EMAPullbackTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(EMA_PULLBACK_STRATEGY_ID)) return true;
  return registry.register(
    createEMAPullbackStrategyRegistration(config, tradeConfig)
  );
}

export function getEMAPullbackFromFactory(): EMAPullbackStrategy | null {
  ensureEMAPullbackRegistered();
  const instance = getStrategyFactory().create(EMA_PULLBACK_STRATEGY_ID);
  return instance instanceof EMAPullbackStrategy ? instance : null;
}

export function executeEMAPullbackThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureEMAPullbackRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(EMA_PULLBACK_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });
  try {
    const strategy = getEMAPullbackFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getEMAPullbackMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildEMAPullbackContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | EMAPullbackStrategyInput
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

export function executeEMAPullbackWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | EMAPullbackStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildEMAPullbackContextFromPipeline(pipeline, marketInput);
  return executeEMAPullbackThroughEngine(context, options);
}

export function isEMAPullbackExecutableInput(
  input: StrategyMarketInput | EMAPullbackStrategyInput
): input is EMAPullbackStrategyInput {
  return isEMAPullbackStrategyInput(input);
}

export function getEMAPullbackIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureEMAPullbackRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(EMA_PULLBACK_STRATEGY_ID),
    strategyId: EMA_PULLBACK_STRATEGY_ID,
    factoryReady: factory.has(EMA_PULLBACK_STRATEGY_ID),
  };
}

export { resolveEMAPullbackConfig, resolveEMAPullbackTradeConfig };
