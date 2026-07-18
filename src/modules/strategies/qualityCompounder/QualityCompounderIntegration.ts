/**
 * Quality Compounder Production Integration — Sprint 11B.3Y.
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
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import { QUALITY_COMPOUNDER_STRATEGY_ID } from "./QualityCompounderConstants";
import { getQualityCompounderMetrics } from "./QualityCompounderMetrics";
import {
  createQualityCompounderStrategyRegistration,
  QualityCompounderStrategy,
} from "./QualityCompounderStrategy";
import type { QualityCompounderStrategyInput } from "./QualityCompounderTypes";
import { isQualityCompounderStrategyInput } from "./QualityCompounderTypes";
import { resolveQualityCompounderConfig } from "./QualityCompounderUtils";

export function ensureQualityCompounderRegistered(
  config?: Partial<QualityCompounderConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(QUALITY_COMPOUNDER_STRATEGY_ID)) return true;
  return registry.register(createQualityCompounderStrategyRegistration(config));
}

export function getQualityCompounderFromFactory(): QualityCompounderStrategy | null {
  ensureQualityCompounderRegistered();
  const instance = getStrategyFactory().create(QUALITY_COMPOUNDER_STRATEGY_ID);
  return instance instanceof QualityCompounderStrategy ? instance : null;
}

export function executeQualityCompounderThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureQualityCompounderRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    QUALITY_COMPOUNDER_STRATEGY_ID,
    context,
    { skipEligibilityCheck: options?.skipEligibilityCheck }
  );
  try {
    const strategy = getQualityCompounderFromFactory();
    const setup = strategy?.getLastInvestmentSetup();
    if (setup && isQualityCompounderStrategyInput(context.input)) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getQualityCompounderMetrics().record({
        setup,
        executionTimeMs: ended - started,
        roic: context.input.qualityCompounder.current.roic,
        roe: context.input.qualityCompounder.current.roe,
        revenueCagr:
          context.input.qualityCompounder.current.revenueCagr ??
          setup.detection.growth.revenueCagr,
        epsCagr:
          context.input.qualityCompounder.current.epsCagr ??
          setup.detection.growth.epsCagr,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildQualityCompounderContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | QualityCompounderStrategyInput
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

export function executeQualityCompounderWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | QualityCompounderStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildQualityCompounderContextFromPipeline(pipeline, marketInput);
  return executeQualityCompounderThroughEngine(context, options);
}

export function isQualityCompounderExecutableInput(
  input: StrategyMarketInput | QualityCompounderStrategyInput
): input is QualityCompounderStrategyInput {
  return isQualityCompounderStrategyInput(input);
}

export function getQualityCompounderIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureQualityCompounderRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(QUALITY_COMPOUNDER_STRATEGY_ID),
    strategyId: QUALITY_COMPOUNDER_STRATEGY_ID,
    factoryReady: factory.has(QUALITY_COMPOUNDER_STRATEGY_ID),
  };
}

export { resolveQualityCompounderConfig };
