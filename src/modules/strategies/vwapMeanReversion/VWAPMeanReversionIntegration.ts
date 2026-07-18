/**
 * VWAP Mean Reversion Production Integration — Sprint 11B.3D.3.
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
import type { VWAPMeanReversionConfig } from "./VWAPMeanReversionConstants";
import { VWAP_MEAN_REVERSION_STRATEGY_ID } from "./VWAPMeanReversionConstants";
import { getVWAPMeanReversionMetrics } from "./VWAPMeanReversionMetrics";
import {
  createVWAPMeanReversionStrategyRegistration,
  VWAPMeanReversionStrategy,
} from "./VWAPMeanReversionStrategy";
import type { VWAPMeanReversionTradeConfig } from "./VWAPMeanReversionTradeTypes";
import { resolveVWAPMeanReversionTradeConfig } from "./VWAPMeanReversionTradeTypes";
import type { VWAPMeanReversionStrategyInput } from "./VWAPMeanReversionTypes";
import { isVWAPMeanReversionStrategyInput } from "./VWAPMeanReversionTypes";
import { resolveVWAPMeanReversionConfig } from "./VWAPMeanReversionUtils";

export function ensureVWAPMeanReversionRegistered(
  config?: Partial<VWAPMeanReversionConfig>,
  tradeConfig?: Partial<VWAPMeanReversionTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(VWAP_MEAN_REVERSION_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createVWAPMeanReversionStrategyRegistration(config, tradeConfig)
  );
}

export function getVWAPMeanReversionFromFactory(): VWAPMeanReversionStrategy | null {
  ensureVWAPMeanReversionRegistered();
  const instance = getStrategyFactory().create(VWAP_MEAN_REVERSION_STRATEGY_ID);
  return instance instanceof VWAPMeanReversionStrategy ? instance : null;
}

export function executeVWAPMeanReversionThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureVWAPMeanReversionRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    VWAP_MEAN_REVERSION_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getVWAPMeanReversionFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getVWAPMeanReversionMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional — never crash.
  }

  return result;
}

export function buildVWAPMeanReversionContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | VWAPMeanReversionStrategyInput
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

export function executeVWAPMeanReversionWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | VWAPMeanReversionStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildVWAPMeanReversionContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeVWAPMeanReversionThroughEngine(context, options);
}

export function isVWAPMeanReversionExecutableInput(
  input: StrategyMarketInput | VWAPMeanReversionStrategyInput
): input is VWAPMeanReversionStrategyInput {
  return isVWAPMeanReversionStrategyInput(input);
}

export function getVWAPMeanReversionIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureVWAPMeanReversionRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(VWAP_MEAN_REVERSION_STRATEGY_ID),
    strategyId: VWAP_MEAN_REVERSION_STRATEGY_ID,
    factoryReady: factory.has(VWAP_MEAN_REVERSION_STRATEGY_ID),
  };
}

export {
  resolveVWAPMeanReversionConfig,
  resolveVWAPMeanReversionTradeConfig,
};
