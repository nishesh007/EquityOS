/**
 * Stage Analysis Production Integration — Sprint 11B.3M.
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
import type { StageAnalysisConfig } from "./StageAnalysisConstants";
import { STAGE_ANALYSIS_STRATEGY_ID } from "./StageAnalysisConstants";
import { getStageAnalysisMetrics } from "./StageAnalysisMetrics";
import {
  createStageAnalysisStrategyRegistration,
  StageAnalysisStrategy,
} from "./StageAnalysisStrategy";
import type { StageAnalysisTradeConfig } from "./StageAnalysisTradeTypes";
import { resolveStageAnalysisTradeConfig } from "./StageAnalysisTradeTypes";
import type { StageAnalysisStrategyInput } from "./StageAnalysisTypes";
import { isStageAnalysisStrategyInput } from "./StageAnalysisTypes";
import { resolveStageAnalysisConfig } from "./StageAnalysisUtils";

export function ensureStageAnalysisRegistered(
  config?: Partial<StageAnalysisConfig>,
  tradeConfig?: Partial<StageAnalysisTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(STAGE_ANALYSIS_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createStageAnalysisStrategyRegistration(config, tradeConfig)
  );
}

export function getStageAnalysisFromFactory(): StageAnalysisStrategy | null {
  ensureStageAnalysisRegistered();
  const instance = getStrategyFactory().create(STAGE_ANALYSIS_STRATEGY_ID);
  return instance instanceof StageAnalysisStrategy ? instance : null;
}

export function executeStageAnalysisThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureStageAnalysisRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    STAGE_ANALYSIS_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getStageAnalysisFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getStageAnalysisMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildStageAnalysisContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | StageAnalysisStrategyInput
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

export function executeStageAnalysisWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | StageAnalysisStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildStageAnalysisContextFromPipeline(pipeline, marketInput);
  return executeStageAnalysisThroughEngine(context, options);
}

export function isStageAnalysisExecutableInput(
  input: StrategyMarketInput | StageAnalysisStrategyInput
): input is StageAnalysisStrategyInput {
  return isStageAnalysisStrategyInput(input);
}

export function getStageAnalysisIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureStageAnalysisRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(STAGE_ANALYSIS_STRATEGY_ID),
    strategyId: STAGE_ANALYSIS_STRATEGY_ID,
    factoryReady: factory.has(STAGE_ANALYSIS_STRATEGY_ID),
  };
}

export { resolveStageAnalysisConfig, resolveStageAnalysisTradeConfig };
