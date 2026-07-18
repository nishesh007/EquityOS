/**
 * Peter Lynch Production Integration — Sprint 11B.3W.
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
import type { PeterLynchConfig } from "./PeterLynchConstants";
import { PETER_LYNCH_STRATEGY_ID } from "./PeterLynchConstants";
import { getPeterLynchMetrics } from "./PeterLynchMetrics";
import {
  createPeterLynchStrategyRegistration,
  PeterLynchStrategy,
} from "./PeterLynchStrategy";
import type { PeterLynchStrategyInput } from "./PeterLynchTypes";
import { isPeterLynchStrategyInput } from "./PeterLynchTypes";
import { resolvePeterLynchConfig } from "./PeterLynchUtils";

export function ensurePeterLynchRegistered(
  config?: Partial<PeterLynchConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(PETER_LYNCH_STRATEGY_ID)) return true;
  return registry.register(createPeterLynchStrategyRegistration(config));
}

export function getPeterLynchFromFactory(): PeterLynchStrategy | null {
  ensurePeterLynchRegistered();
  const instance = getStrategyFactory().create(PETER_LYNCH_STRATEGY_ID);
  return instance instanceof PeterLynchStrategy ? instance : null;
}

export function executePeterLynchThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensurePeterLynchRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    PETER_LYNCH_STRATEGY_ID,
    context,
    { skipEligibilityCheck: options?.skipEligibilityCheck }
  );
  try {
    const strategy = getPeterLynchFromFactory();
    const setup = strategy?.getLastInvestmentSetup();
    if (setup && isPeterLynchStrategyInput(context.input)) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getPeterLynchMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildPeterLynchContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | PeterLynchStrategyInput
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

export function executePeterLynchWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | PeterLynchStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildPeterLynchContextFromPipeline(pipeline, marketInput);
  return executePeterLynchThroughEngine(context, options);
}

export function isPeterLynchExecutableInput(
  input: StrategyMarketInput | PeterLynchStrategyInput
): input is PeterLynchStrategyInput {
  return isPeterLynchStrategyInput(input);
}

export function getPeterLynchIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensurePeterLynchRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(PETER_LYNCH_STRATEGY_ID),
    strategyId: PETER_LYNCH_STRATEGY_ID,
    factoryReady: factory.has(PETER_LYNCH_STRATEGY_ID),
  };
}

export { resolvePeterLynchConfig };
