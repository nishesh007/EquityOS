/**
 * Momentum Continuation Production Integration — Sprint 11B.3F.
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
import type { MomentumContinuationConfig } from "./MomentumContinuationConstants";
import { MOMENTUM_CONTINUATION_STRATEGY_ID } from "./MomentumContinuationConstants";
import { getMomentumContinuationMetrics } from "./MomentumContinuationMetrics";
import {
  createMomentumContinuationStrategyRegistration,
  MomentumContinuationStrategy,
} from "./MomentumContinuationStrategy";
import type { MomentumContinuationTradeConfig } from "./MomentumContinuationTradeTypes";
import { resolveMomentumContinuationTradeConfig } from "./MomentumContinuationTradeTypes";
import type { MomentumContinuationStrategyInput } from "./MomentumContinuationTypes";
import { isMomentumContinuationStrategyInput } from "./MomentumContinuationTypes";
import { resolveMomentumContinuationConfig } from "./MomentumContinuationUtils";

export function ensureMomentumContinuationRegistered(
  config?: Partial<MomentumContinuationConfig>,
  tradeConfig?: Partial<MomentumContinuationTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(MOMENTUM_CONTINUATION_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createMomentumContinuationStrategyRegistration(config, tradeConfig)
  );
}

export function getMomentumContinuationFromFactory(): MomentumContinuationStrategy | null {
  ensureMomentumContinuationRegistered();
  const instance = getStrategyFactory().create(
    MOMENTUM_CONTINUATION_STRATEGY_ID
  );
  return instance instanceof MomentumContinuationStrategy ? instance : null;
}

export function executeMomentumContinuationThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureMomentumContinuationRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    MOMENTUM_CONTINUATION_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getMomentumContinuationFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getMomentumContinuationMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildMomentumContinuationContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | MomentumContinuationStrategyInput
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

export function executeMomentumContinuationWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | MomentumContinuationStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildMomentumContinuationContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeMomentumContinuationThroughEngine(context, options);
}

export function isMomentumContinuationExecutableInput(
  input: StrategyMarketInput | MomentumContinuationStrategyInput
): input is MomentumContinuationStrategyInput {
  return isMomentumContinuationStrategyInput(input);
}

export function getMomentumContinuationIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureMomentumContinuationRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(MOMENTUM_CONTINUATION_STRATEGY_ID),
    strategyId: MOMENTUM_CONTINUATION_STRATEGY_ID,
    factoryReady: factory.has(MOMENTUM_CONTINUATION_STRATEGY_ID),
  };
}

export {
  resolveMomentumContinuationConfig,
  resolveMomentumContinuationTradeConfig,
};
