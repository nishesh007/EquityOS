/**
 * Magic Formula Production Integration — Sprint 11B.3X.
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
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import { MAGIC_FORMULA_STRATEGY_ID } from "./MagicFormulaConstants";
import { getMagicFormulaMetrics } from "./MagicFormulaMetrics";
import {
  createMagicFormulaStrategyRegistration,
  MagicFormulaStrategy,
} from "./MagicFormulaStrategy";
import type { MagicFormulaStrategyInput } from "./MagicFormulaTypes";
import { isMagicFormulaStrategyInput } from "./MagicFormulaTypes";
import { resolveMagicFormulaConfig } from "./MagicFormulaUtils";

export function ensureMagicFormulaRegistered(
  config?: Partial<MagicFormulaConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(MAGIC_FORMULA_STRATEGY_ID)) return true;
  return registry.register(createMagicFormulaStrategyRegistration(config));
}

export function getMagicFormulaFromFactory(): MagicFormulaStrategy | null {
  ensureMagicFormulaRegistered();
  const instance = getStrategyFactory().create(MAGIC_FORMULA_STRATEGY_ID);
  return instance instanceof MagicFormulaStrategy ? instance : null;
}

export function executeMagicFormulaThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureMagicFormulaRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    MAGIC_FORMULA_STRATEGY_ID,
    context,
    { skipEligibilityCheck: options?.skipEligibilityCheck }
  );
  try {
    const strategy = getMagicFormulaFromFactory();
    const setup = strategy?.getLastInvestmentSetup();
    if (setup && isMagicFormulaStrategyInput(context.input)) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getMagicFormulaMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }
  return result;
}

export function buildMagicFormulaContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | MagicFormulaStrategyInput
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

export function executeMagicFormulaWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | MagicFormulaStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildMagicFormulaContextFromPipeline(pipeline, marketInput);
  return executeMagicFormulaThroughEngine(context, options);
}

export function isMagicFormulaExecutableInput(
  input: StrategyMarketInput | MagicFormulaStrategyInput
): input is MagicFormulaStrategyInput {
  return isMagicFormulaStrategyInput(input);
}

export function getMagicFormulaIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureMagicFormulaRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(MAGIC_FORMULA_STRATEGY_ID),
    strategyId: MAGIC_FORMULA_STRATEGY_ID,
    factoryReady: factory.has(MAGIC_FORMULA_STRATEGY_ID),
  };
}

export { resolveMagicFormulaConfig };
