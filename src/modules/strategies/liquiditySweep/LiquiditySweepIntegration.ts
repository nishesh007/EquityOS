/**
 * Liquidity Sweep Production Integration — Sprint 11B.3E.
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
import type { LiquiditySweepConfig } from "./LiquiditySweepConstants";
import { LIQUIDITY_SWEEP_STRATEGY_ID } from "./LiquiditySweepConstants";
import { getLiquiditySweepMetrics } from "./LiquiditySweepMetrics";
import {
  createLiquiditySweepStrategyRegistration,
  LiquiditySweepStrategy,
} from "./LiquiditySweepStrategy";
import type { LiquiditySweepTradeConfig } from "./LiquiditySweepTradeTypes";
import { resolveLiquiditySweepTradeConfig } from "./LiquiditySweepTradeTypes";
import type { LiquiditySweepStrategyInput } from "./LiquiditySweepTypes";
import { isLiquiditySweepStrategyInput } from "./LiquiditySweepTypes";
import { resolveLiquiditySweepConfig } from "./LiquiditySweepUtils";

export function ensureLiquiditySweepRegistered(
  config?: Partial<LiquiditySweepConfig>,
  tradeConfig?: Partial<LiquiditySweepTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(LIQUIDITY_SWEEP_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createLiquiditySweepStrategyRegistration(config, tradeConfig)
  );
}

export function getLiquiditySweepFromFactory(): LiquiditySweepStrategy | null {
  ensureLiquiditySweepRegistered();
  const instance = getStrategyFactory().create(LIQUIDITY_SWEEP_STRATEGY_ID);
  return instance instanceof LiquiditySweepStrategy ? instance : null;
}

export function executeLiquiditySweepThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureLiquiditySweepRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    LIQUIDITY_SWEEP_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getLiquiditySweepFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getLiquiditySweepMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional — never crash.
  }

  return result;
}

export function buildLiquiditySweepContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | LiquiditySweepStrategyInput
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

export function executeLiquiditySweepWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | LiquiditySweepStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildLiquiditySweepContextFromPipeline(pipeline, marketInput);
  return executeLiquiditySweepThroughEngine(context, options);
}

export function isLiquiditySweepExecutableInput(
  input: StrategyMarketInput | LiquiditySweepStrategyInput
): input is LiquiditySweepStrategyInput {
  return isLiquiditySweepStrategyInput(input);
}

export function getLiquiditySweepIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureLiquiditySweepRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(LIQUIDITY_SWEEP_STRATEGY_ID),
    strategyId: LIQUIDITY_SWEEP_STRATEGY_ID,
    factoryReady: factory.has(LIQUIDITY_SWEEP_STRATEGY_ID),
  };
}

export { resolveLiquiditySweepConfig, resolveLiquiditySweepTradeConfig };
