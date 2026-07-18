/**
 * Graham Production Integration — Sprint 11B.3V.
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
import type { GrahamConfig } from "./GrahamConstants";
import { GRAHAM_STRATEGY_ID } from "./GrahamConstants";
import { getGrahamMetrics } from "./GrahamMetrics";
import {
  createGrahamStrategyRegistration,
  GrahamStrategy,
} from "./GrahamStrategy";
import type { GrahamStrategyInput } from "./GrahamTypes";
import { isGrahamStrategyInput } from "./GrahamTypes";
import { resolveGrahamConfig } from "./GrahamUtils";

export function ensureGrahamRegistered(
  config?: Partial<GrahamConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(GRAHAM_STRATEGY_ID)) return true;
  return registry.register(createGrahamStrategyRegistration(config));
}

export function getGrahamFromFactory(): GrahamStrategy | null {
  ensureGrahamRegistered();
  const instance = getStrategyFactory().create(GRAHAM_STRATEGY_ID);
  return instance instanceof GrahamStrategy ? instance : null;
}

export function executeGrahamThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureGrahamRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(GRAHAM_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });
  try {
    const strategy = getGrahamFromFactory();
    const setup = strategy?.getLastInvestmentSetup();
    if (setup && isGrahamStrategyInput(context.input)) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getGrahamMetrics().record({
        setup,
        executionTimeMs: ended - started,
        currentRatio: context.input.graham.current.currentRatio,
        debtEquity: context.input.graham.current.debtEquity,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildGrahamContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | GrahamStrategyInput
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

export function executeGrahamWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | GrahamStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildGrahamContextFromPipeline(pipeline, marketInput);
  return executeGrahamThroughEngine(context, options);
}

export function isGrahamExecutableInput(
  input: StrategyMarketInput | GrahamStrategyInput
): input is GrahamStrategyInput {
  return isGrahamStrategyInput(input);
}

export function getGrahamIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureGrahamRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(GRAHAM_STRATEGY_ID),
    strategyId: GRAHAM_STRATEGY_ID,
    factoryReady: factory.has(GRAHAM_STRATEGY_ID),
  };
}

export { resolveGrahamConfig };
