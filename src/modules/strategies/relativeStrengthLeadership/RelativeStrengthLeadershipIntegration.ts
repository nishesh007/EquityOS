/**
 * Relative Strength Leadership Production Integration — Sprint 11B.3O.
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
import type { RelativeStrengthLeadershipConfig } from "./RelativeStrengthLeadershipConstants";
import { RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID } from "./RelativeStrengthLeadershipConstants";
import { getRelativeStrengthLeadershipMetrics } from "./RelativeStrengthLeadershipMetrics";
import {
  createRelativeStrengthLeadershipStrategyRegistration,
  RelativeStrengthLeadershipStrategy,
} from "./RelativeStrengthLeadershipStrategy";
import type { RelativeStrengthLeadershipTradeConfig } from "./RelativeStrengthLeadershipTradeTypes";
import { resolveRelativeStrengthLeadershipTradeConfig } from "./RelativeStrengthLeadershipTradeTypes";
import type { RelativeStrengthLeadershipStrategyInput } from "./RelativeStrengthLeadershipTypes";
import { isRelativeStrengthLeadershipStrategyInput } from "./RelativeStrengthLeadershipTypes";
import { resolveRelativeStrengthLeadershipConfig } from "./RelativeStrengthLeadershipUtils";

export function ensureRelativeStrengthLeadershipRegistered(
  config?: Partial<RelativeStrengthLeadershipConfig>,
  tradeConfig?: Partial<RelativeStrengthLeadershipTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID)) return true;
  return registry.register(
    createRelativeStrengthLeadershipStrategyRegistration(config, tradeConfig)
  );
}

export function getRelativeStrengthLeadershipFromFactory(): RelativeStrengthLeadershipStrategy | null {
  ensureRelativeStrengthLeadershipRegistered();
  const instance = getStrategyFactory().create(
    RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID
  );
  return instance instanceof RelativeStrengthLeadershipStrategy
    ? instance
    : null;
}

export function executeRelativeStrengthLeadershipThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureRelativeStrengthLeadershipRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );
  try {
    const strategy = getRelativeStrengthLeadershipFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getRelativeStrengthLeadershipMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildRelativeStrengthLeadershipContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput:
    | StrategyMarketInput
    | RelativeStrengthLeadershipStrategyInput
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

export function executeRelativeStrengthLeadershipWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput:
    | StrategyMarketInput
    | RelativeStrengthLeadershipStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildRelativeStrengthLeadershipContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeRelativeStrengthLeadershipThroughEngine(context, options);
}

export function isRelativeStrengthLeadershipExecutableInput(
  input: StrategyMarketInput | RelativeStrengthLeadershipStrategyInput
): input is RelativeStrengthLeadershipStrategyInput {
  return isRelativeStrengthLeadershipStrategyInput(input);
}

export function getRelativeStrengthLeadershipIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureRelativeStrengthLeadershipRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID),
    strategyId: RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
    factoryReady: factory.has(RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID),
  };
}

export {
  resolveRelativeStrengthLeadershipConfig,
  resolveRelativeStrengthLeadershipTradeConfig,
};
