/**
 * Buffett Production Integration — Sprint 11B.3U.
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
import type { BuffettConfig } from "./BuffettConstants";
import { BUFFETT_STRATEGY_ID } from "./BuffettConstants";
import { getBuffettMetrics } from "./BuffettMetrics";
import {
  createBuffettStrategyRegistration,
  BuffettStrategy,
} from "./BuffettStrategy";
import type { BuffettStrategyInput } from "./BuffettTypes";
import { isBuffettStrategyInput } from "./BuffettTypes";
import { resolveBuffettConfig } from "./BuffettUtils";

export function ensureBuffettRegistered(
  config?: Partial<BuffettConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(BUFFETT_STRATEGY_ID)) return true;
  return registry.register(createBuffettStrategyRegistration(config));
}

export function getBuffettFromFactory(): BuffettStrategy | null {
  ensureBuffettRegistered();
  const instance = getStrategyFactory().create(BUFFETT_STRATEGY_ID);
  return instance instanceof BuffettStrategy ? instance : null;
}

export function executeBuffettThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureBuffettRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(BUFFETT_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });
  try {
    const strategy = getBuffettFromFactory();
    const setup = strategy?.getLastInvestmentSetup();
    if (setup && isBuffettStrategyInput(context.input)) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getBuffettMetrics().record({
        setup,
        executionTimeMs: ended - started,
        roe: context.input.buffett.current.roe,
        roce: context.input.buffett.current.roce,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildBuffettContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | BuffettStrategyInput
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

export function executeBuffettWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | BuffettStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildBuffettContextFromPipeline(pipeline, marketInput);
  return executeBuffettThroughEngine(context, options);
}

export function isBuffettExecutableInput(
  input: StrategyMarketInput | BuffettStrategyInput
): input is BuffettStrategyInput {
  return isBuffettStrategyInput(input);
}

export function getBuffettIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureBuffettRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(BUFFETT_STRATEGY_ID),
    strategyId: BUFFETT_STRATEGY_ID,
    factoryReady: factory.has(BUFFETT_STRATEGY_ID),
  };
}

export { resolveBuffettConfig };
