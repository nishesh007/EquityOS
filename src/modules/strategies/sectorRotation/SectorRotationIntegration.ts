/**
 * Sector Rotation Production Integration — Sprint 11B.3J.
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
import type { SectorRotationConfig } from "./SectorRotationConstants";
import { SECTOR_ROTATION_STRATEGY_ID } from "./SectorRotationConstants";
import { getSectorRotationMetrics } from "./SectorRotationMetrics";
import {
  createSectorRotationStrategyRegistration,
  SectorRotationStrategy,
} from "./SectorRotationStrategy";
import type { SectorRotationTradeConfig } from "./SectorRotationTradeTypes";
import { resolveSectorRotationTradeConfig } from "./SectorRotationTradeTypes";
import type { SectorRotationStrategyInput } from "./SectorRotationTypes";
import { isSectorRotationStrategyInput } from "./SectorRotationTypes";
import { resolveSectorRotationConfig } from "./SectorRotationUtils";

export function ensureSectorRotationRegistered(
  config?: Partial<SectorRotationConfig>,
  tradeConfig?: Partial<SectorRotationTradeConfig>
): boolean {
  const registry = getStrategyRegistry();
  if (registry.has(SECTOR_ROTATION_STRATEGY_ID)) {
    return true;
  }
  return registry.register(
    createSectorRotationStrategyRegistration(config, tradeConfig)
  );
}

export function getSectorRotationFromFactory(): SectorRotationStrategy | null {
  ensureSectorRotationRegistered();
  const instance = getStrategyFactory().create(SECTOR_ROTATION_STRATEGY_ID);
  return instance instanceof SectorRotationStrategy ? instance : null;
}

export function executeSectorRotationThroughEngine(
  context: StrategyExecutionContext,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  ensureSectorRotationRegistered();
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = getStrategyEngine().execute(
    SECTOR_ROTATION_STRATEGY_ID,
    context,
    {
      skipEligibilityCheck: options?.skipEligibilityCheck,
    }
  );

  try {
    const strategy = getSectorRotationFromFactory();
    const setup = strategy?.getLastTradeSetup();
    if (setup) {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getSectorRotationMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    }
  } catch {
    // Metrics optional.
  }

  return result;
}

export function buildSectorRotationContextFromPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | SectorRotationStrategyInput
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

export function executeSectorRotationWithPipeline(
  pipeline: TradingPipelineResult,
  marketInput: StrategyMarketInput | SectorRotationStrategyInput,
  options?: { skipEligibilityCheck?: boolean }
): StrategyEngineResult {
  const context = buildSectorRotationContextFromPipeline(
    pipeline,
    marketInput
  );
  return executeSectorRotationThroughEngine(context, options);
}

export function isSectorRotationExecutableInput(
  input: StrategyMarketInput | SectorRotationStrategyInput
): input is SectorRotationStrategyInput {
  return isSectorRotationStrategyInput(input);
}

export function getSectorRotationIntegrationStatus(): {
  registered: boolean;
  strategyId: string;
  factoryReady: boolean;
} {
  ensureSectorRotationRegistered();
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  return {
    registered: registry.has(SECTOR_ROTATION_STRATEGY_ID),
    strategyId: SECTOR_ROTATION_STRATEGY_ID,
    factoryReady: factory.has(SECTOR_ROTATION_STRATEGY_ID),
  };
}

export {
  resolveSectorRotationConfig,
  resolveSectorRotationTradeConfig,
};
