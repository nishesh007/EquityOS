/**
 * VCP Production Integration — Sprint 11B.3L.
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
import type { VCPConfig } from "./VCPConstants";
import { VCP_STRATEGY_ID } from "./VCPConstants";
import { getVCPMetrics } from "./VCPMetrics";
import {
  createVCPStrategyRegistration,
  VCPStrategy,
} from "./VCPStrategy";
import type { VCPTradeConfig } from "./VCPTradeTypes";
import { resolveVCPTradeConfig } from "./VCPTradeTypes";
import type { VCPStrategyInput } from "./VCPTypes";
import { isVCPStrategyInput } from "./VCPTypes";
import { resolveVCPConfig } from "./VCPUtils";

export function ensureVCPRegistered(
  config?: Partial<VCPConfig>,
  tradeConfig?: Partial<VCPTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(VCP_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createVCPStrategyRegistration(config, tradeConfig)
  );
}

export function getVCPFromFactory(): VCPStrategy | null {
  ensureVCPRegistered();
  const instance = getStrategyFactory().create(VCP_STRATEGY_ID);
  return instance instanceof VCPStrategy ? instance : null;
}

export function executeVCPThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureVCPRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(VCP_STRATEGY_ID, context, {
    skipEligibilityCheck: options?.skipEligibilityCheck,
  });

  try {
    const strategy = getVCPFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getVCPMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildVCPContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | VCPStrategyInput
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

export function executeVCPWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | VCPStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildVCPContextFromPipeline(pipeline, marketInput);
  return executeVCPThroughEngine(context, options);
}

export function isVCPExecutableInput(
  input: StrategyMarketInput | VCPStrategyInput
): input is VCPStrategyInput {
  return isVCPStrategyInput(input);
}

export function getVCPIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureVCPRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(VCP_STRATEGY_ID),
    strategyId: VCP_STRATEGY_ID,
    factoryReady: factory.has(VCP_STRATEGY_ID),
  };
}

export { resolveVCPConfig, resolveVCPTradeConfig };
