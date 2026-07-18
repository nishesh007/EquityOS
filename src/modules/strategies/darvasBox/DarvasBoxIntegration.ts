/**
 * Darvas Box Production Integration — Sprint 11B.3N.
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
import type { DarvasBoxConfig } from "./DarvasBoxConstants";
import { DARVAS_BOX_STRATEGY_ID } from "./DarvasBoxConstants";
import { getDarvasBoxMetrics } from "./DarvasBoxMetrics";
import {
  createDarvasBoxStrategyRegistration,
  DarvasBoxStrategy,
} from "./DarvasBoxStrategy";
import type { DarvasBoxTradeConfig } from "./DarvasBoxTradeTypes";
import { resolveDarvasBoxTradeConfig } from "./DarvasBoxTradeTypes";
import type { DarvasBoxStrategyInput } from "./DarvasBoxTypes";
import { isDarvasBoxStrategyInput } from "./DarvasBoxTypes";
import { resolveDarvasBoxConfig } from "./DarvasBoxUtils";

export function ensureDarvasBoxRegistered(
  config?: Partial<DarvasBoxConfig>,
  tradeConfig?: Partial<DarvasBoxTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(DARVAS_BOX_STRATEGY_ID)) return true;
  return registry.register(
    createDarvasBoxStrategyRegistration(config, tradeConfig)
  );
}

export function getDarvasBoxFromFactory(): DarvasBoxStrategy | null {
  ensureDarvasBoxRegistered();
  const instance = getStrategyFactory().create(DARVAS_BOX_STRATEGY_ID);
  return instance instanceof DarvasBoxStrategy ? instance : null;
}

export function executeDarvasBoxThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureDarvasBoxRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(DARVAS_BOX_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });
  try {
    const strategy = getDarvasBoxFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getDarvasBoxMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildDarvasBoxContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | DarvasBoxStrategyInput
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

export function executeDarvasBoxWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | DarvasBoxStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildDarvasBoxContextFromPipeline(pipeline, marketInput);
  return executeDarvasBoxThroughEngine(context, options);
}

export function isDarvasBoxExecutableInput(
  input: StrategyMarketInput | DarvasBoxStrategyInput
): input is DarvasBoxStrategyInput {
  return isDarvasBoxStrategyInput(input);
}

export function getDarvasBoxIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureDarvasBoxRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(DARVAS_BOX_STRATEGY_ID),
    strategyId: DARVAS_BOX_STRATEGY_ID,
    factoryReady: factory.has(DARVAS_BOX_STRATEGY_ID),
  };
}

export { resolveDarvasBoxConfig, resolveDarvasBoxTradeConfig };
