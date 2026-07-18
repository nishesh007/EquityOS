/**
 * Institutional Accumulation Production Integration — Sprint 11B.3H.
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
import type { InstitutionalAccumulationConfig } from "./InstitutionalAccumulationConstants";
import { INSTITUTIONAL_ACCUMULATION_STRATEGY_ID } from "./InstitutionalAccumulationConstants";
import { getInstitutionalAccumulationMetrics } from "./InstitutionalAccumulationMetrics";
import {
  createInstitutionalAccumulationStrategyRegistration,
  InstitutionalAccumulationStrategy,
} from "./InstitutionalAccumulationStrategy";
import type { InstitutionalAccumulationTradeConfig } from "./InstitutionalAccumulationTradeTypes";
import { resolveInstitutionalAccumulationTradeConfig } from "./InstitutionalAccumulationTradeTypes";
import type { InstitutionalAccumulationStrategyInput } from "./InstitutionalAccumulationTypes";
import { isInstitutionalAccumulationStrategyInput } from "./InstitutionalAccumulationTypes";
import { resolveInstitutionalAccumulationConfig } from "./InstitutionalAccumulationUtils";

export function ensureInstitutionalAccumulationRegistered(
  config?: Partial<InstitutionalAccumulationConfig>,
  tradeConfig?: Partial<InstitutionalAccumulationTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createInstitutionalAccumulationStrategyRegistration(config, tradeConfig)
  );
}

export function getInstitutionalAccumulationFromFactory(): InstitutionalAccumulationStrategy | null {
  ensureInstitutionalAccumulationRegistered();
  const instance = getStrategyFactory().create(
    INSTITUTIONAL_ACCUMULATION_STRATEGY_ID
  );
  return instance instanceof InstitutionalAccumulationStrategy ? instance : null;
}

export function executeInstitutionalAccumulationThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureInstitutionalAccumulationRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    INSTITUTIONAL_ACCUMULATION_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getInstitutionalAccumulationFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getInstitutionalAccumulationMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildInstitutionalAccumulationContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | InstitutionalAccumulationStrategyInput
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

export function executeInstitutionalAccumulationWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | InstitutionalAccumulationStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildInstitutionalAccumulationContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeInstitutionalAccumulationThroughEngine(context, options);
}

export function isInstitutionalAccumulationExecutableInput(
  input: StrategyMarketInput | InstitutionalAccumulationStrategyInput
): input is InstitutionalAccumulationStrategyInput {
  return isInstitutionalAccumulationStrategyInput(input);
}

export function getInstitutionalAccumulationIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureInstitutionalAccumulationRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID),
    strategyId: INSTITUTIONAL_ACCUMULATION_STRATEGY_ID,
    factoryReady: factory.has(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID),
  };
}

export {
  resolveInstitutionalAccumulationConfig,
  resolveInstitutionalAccumulationTradeConfig,
};
