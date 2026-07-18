/**
 * 52-Week High Production Integration — Sprint 11B.3S.
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
import type { FiftyTwoWeekHighConfig } from "./FiftyTwoWeekHighConstants";
import { FIFTY_TWO_WEEK_HIGH_STRATEGY_ID } from "./FiftyTwoWeekHighConstants";
import { getFiftyTwoWeekHighMetrics } from "./FiftyTwoWeekHighMetrics";
import {
  createFiftyTwoWeekHighStrategyRegistration,
  FiftyTwoWeekHighStrategy,
} from "./FiftyTwoWeekHighStrategy";
import type { FiftyTwoWeekHighTradeConfig } from "./FiftyTwoWeekHighTradeTypes";
import { resolveFiftyTwoWeekHighTradeConfig } from "./FiftyTwoWeekHighTradeTypes";
import type { FiftyTwoWeekHighStrategyInput } from "./FiftyTwoWeekHighTypes";
import { isFiftyTwoWeekHighStrategyInput } from "./FiftyTwoWeekHighTypes";
import { resolveFiftyTwoWeekHighConfig } from "./FiftyTwoWeekHighUtils";

export function ensureFiftyTwoWeekHighRegistered(
  config?: Partial<FiftyTwoWeekHighConfig>,
  tradeConfig?: Partial<FiftyTwoWeekHighTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(FIFTY_TWO_WEEK_HIGH_STRATEGY_ID)) return true;
  return registry.register(
    createFiftyTwoWeekHighStrategyRegistration(config, tradeConfig)
  );
}

export function getFiftyTwoWeekHighFromFactory(): FiftyTwoWeekHighStrategy | null {
  ensureFiftyTwoWeekHighRegistered();
  const instance = getStrategyFactory().create(FIFTY_TWO_WEEK_HIGH_STRATEGY_ID);
  return instance instanceof FiftyTwoWeekHighStrategy ? instance : null;
}

export function executeFiftyTwoWeekHighThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureFiftyTwoWeekHighRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );
  try {
    const strategy = getFiftyTwoWeekHighFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getFiftyTwoWeekHighMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildFiftyTwoWeekHighContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | FiftyTwoWeekHighStrategyInput
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

export function executeFiftyTwoWeekHighWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | FiftyTwoWeekHighStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildFiftyTwoWeekHighContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeFiftyTwoWeekHighThroughEngine(context, options);
}

export function isFiftyTwoWeekHighExecutableInput(
  input: StrategyMarketInput | FiftyTwoWeekHighStrategyInput
): input is FiftyTwoWeekHighStrategyInput {
  return isFiftyTwoWeekHighStrategyInput(input);
}

export function getFiftyTwoWeekHighIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureFiftyTwoWeekHighRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(FIFTY_TWO_WEEK_HIGH_STRATEGY_ID),
    strategyId: FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
    factoryReady: factory.has(FIFTY_TWO_WEEK_HIGH_STRATEGY_ID),
  };
}

export { resolveFiftyTwoWeekHighConfig, resolveFiftyTwoWeekHighTradeConfig };
