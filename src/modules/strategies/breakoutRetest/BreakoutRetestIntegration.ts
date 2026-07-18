/**
 * Breakout Retest Production Integration — Sprint 11B.3I.
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
import type { BreakoutRetestConfig } from "./BreakoutRetestConstants";
import { BREAKOUT_RETEST_STRATEGY_ID } from "./BreakoutRetestConstants";
import { getBreakoutRetestMetrics } from "./BreakoutRetestMetrics";
import {
  createBreakoutRetestStrategyRegistration,
  BreakoutRetestStrategy,
} from "./BreakoutRetestStrategy";
import type { BreakoutRetestTradeConfig } from "./BreakoutRetestTradeTypes";
import { resolveBreakoutRetestTradeConfig } from "./BreakoutRetestTradeTypes";
import type { BreakoutRetestStrategyInput } from "./BreakoutRetestTypes";
import { isBreakoutRetestStrategyInput } from "./BreakoutRetestTypes";
import { resolveBreakoutRetestConfig } from "./BreakoutRetestUtils";

export function ensureBreakoutRetestRegistered(
  config?: Partial<BreakoutRetestConfig>,
  tradeConfig?: Partial<BreakoutRetestTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(BREAKOUT_RETEST_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createBreakoutRetestStrategyRegistration(config, tradeConfig)
  );
}

export function getBreakoutRetestFromFactory(): BreakoutRetestStrategy | null {
  ensureBreakoutRetestRegistered();
  const instance = getStrategyFactory().create(BREAKOUT_RETEST_STRATEGY_ID);
  return instance instanceof BreakoutRetestStrategy ? instance : null;
}

export function executeBreakoutRetestThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureBreakoutRetestRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    BREAKOUT_RETEST_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getBreakoutRetestFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getBreakoutRetestMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildBreakoutRetestContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | BreakoutRetestStrategyInput
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

export function executeBreakoutRetestWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | BreakoutRetestStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildBreakoutRetestContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeBreakoutRetestThroughEngine(context, options);
}

export function isBreakoutRetestExecutableInput(
  input: StrategyMarketInput | BreakoutRetestStrategyInput
): input is BreakoutRetestStrategyInput {
  return isBreakoutRetestStrategyInput(input);
}

export function getBreakoutRetestIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureBreakoutRetestRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(BREAKOUT_RETEST_STRATEGY_ID),
    strategyId: BREAKOUT_RETEST_STRATEGY_ID,
    factoryReady: factory.has(BREAKOUT_RETEST_STRATEGY_ID),
  };
}

export { resolveBreakoutRetestConfig, resolveBreakoutRetestTradeConfig };
