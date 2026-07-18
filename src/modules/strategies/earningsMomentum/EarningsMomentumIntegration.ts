/**
 * Earnings Momentum Production Integration — Sprint 11B.3T.
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
import type { EarningsMomentumConfig } from "./EarningsMomentumConstants";
import { EARNINGS_MOMENTUM_STRATEGY_ID } from "./EarningsMomentumConstants";
import { getEarningsMomentumMetrics } from "./EarningsMomentumMetrics";
import {
  createEarningsMomentumStrategyRegistration,
  EarningsMomentumStrategy,
} from "./EarningsMomentumStrategy";
import type { EarningsMomentumTradeConfig } from "./EarningsMomentumTradeTypes";
import { resolveEarningsMomentumTradeConfig } from "./EarningsMomentumTradeTypes";
import type { EarningsMomentumStrategyInput } from "./EarningsMomentumTypes";
import { isEarningsMomentumStrategyInput } from "./EarningsMomentumTypes";
import { resolveEarningsMomentumConfig } from "./EarningsMomentumUtils";

export function ensureEarningsMomentumRegistered(
  config?: Partial<EarningsMomentumConfig>,
  tradeConfig?: Partial<EarningsMomentumTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(EARNINGS_MOMENTUM_STRATEGY_ID)) return true;
  return registry.register(
    createEarningsMomentumStrategyRegistration(config, tradeConfig)
  );
}

export function getEarningsMomentumFromFactory(): EarningsMomentumStrategy | null {
  ensureEarningsMomentumRegistered();
  const instance = getStrategyFactory().create(EARNINGS_MOMENTUM_STRATEGY_ID);
  return instance instanceof EarningsMomentumStrategy ? instance : null;
}

export function executeEarningsMomentumThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureEarningsMomentumRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    EARNINGS_MOMENTUM_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );
  try {
    const strategy = getEarningsMomentumFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getEarningsMomentumMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildEarningsMomentumContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | EarningsMomentumStrategyInput
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

export function executeEarningsMomentumWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | EarningsMomentumStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildEarningsMomentumContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeEarningsMomentumThroughEngine(context, options);
}

export function isEarningsMomentumExecutableInput(
  input: StrategyMarketInput | EarningsMomentumStrategyInput
): input is EarningsMomentumStrategyInput {
  return isEarningsMomentumStrategyInput(input);
}

export function getEarningsMomentumIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureEarningsMomentumRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(EARNINGS_MOMENTUM_STRATEGY_ID),
    strategyId: EARNINGS_MOMENTUM_STRATEGY_ID,
    factoryReady: factory.has(EARNINGS_MOMENTUM_STRATEGY_ID),
  };
}

export {
  resolveEarningsMomentumConfig,
  resolveEarningsMomentumTradeConfig,
};
