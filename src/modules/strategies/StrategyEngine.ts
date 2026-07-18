/**
 * Strategy Engine — Sprint 11B.3A.
 * Load → Validate → Execute → Return StrategySignal.
 */

import type { BaseStrategy } from "./BaseStrategy";
import {
  getStrategyFactory,
  resetStrategyFactory,
  StrategyFactory,
} from "./StrategyFactory";
import {
  getStrategyRegistry,
  resetStrategyRegistry,
  StrategyRegistry,
} from "./StrategyRegistry";
import { StrategyValidator } from "./StrategyValidator";
import type {
  StrategyEngineOptions,
  StrategyEngineResult,
  StrategyExecutionContext,
  StrategySignal,
} from "./StrategyTypes";
import {
  createIgnoreSignal,
  nowMs,
  resolveStrategyFrameworkConfig,
} from "./StrategyUtils";

export class StrategyEngine {
  private readonly registry: StrategyRegistry;
  private readonly factory: StrategyFactory;
  private readonly validator: StrategyValidator;

  constructor(
    registry: StrategyRegistry = getStrategyRegistry(),
    factory: StrategyFactory = getStrategyFactory(),
    validator?: StrategyValidator
  ) {
    this.registry = registry;
    this.factory = factory;
    this.validator =
      validator ??
      new StrategyValidator(resolveStrategyFrameworkConfig());
  }

  /**
   * Execute a registered strategy by id.
   * Never crashes — unknown/disabled/invalid paths return IGNORE.
   */
  execute(
    strategyId: string,
    context: StrategyExecutionContext,
    options: StrategyEngineOptions = {}
  ): StrategyEngineResult {
    const started = nowMs();
    const config = resolveStrategyFrameworkConfig({
      ...context.config,
      ...options.config,
    });
    const enrichedContext: StrategyExecutionContext = {
      ...context,
      config,
      timestamp: context.timestamp ?? new Date(),
      riskMode: context.riskMode ?? context.marketContext?.riskMode ?? "Neutral",
    };

    const registration = this.registry.find(strategyId);
    if (!registration) {
      return this.ignoreResult(
        strategyId,
        "Unknown Strategy",
        "Scalp",
        enrichedContext,
        {
          valid: false,
          issues: [
            {
              code: "UNKNOWN_STRATEGY",
              severity: "error",
              message: `Unknown strategy id: ${strategyId}.`,
            },
          ],
          errors: [`Unknown strategy id: ${strategyId}.`],
          warnings: [],
        },
        started,
        ["Created", "Disposed"]
      );
    }

    if (!registration.enabled) {
      return this.ignoreResult(
        registration.id,
        registration.name,
        registration.category,
        enrichedContext,
        {
          valid: false,
          issues: [
            {
              code: "DISABLED_STRATEGY",
              severity: "error",
              message: `Strategy "${registration.id}" is disabled.`,
            },
          ],
          errors: [`Strategy "${registration.id}" is disabled.`],
          warnings: [],
        },
        started,
        ["Created", "Disposed"]
      );
    }

    const strategy = this.factory.create(strategyId);
    if (!strategy) {
      return this.ignoreResult(
        registration.id,
        registration.name,
        registration.category,
        enrichedContext,
        {
          valid: false,
          issues: [
            {
              code: "FACTORY_FAILURE",
              severity: "error",
              message: `Strategy factory failed for id: ${strategyId}.`,
            },
          ],
          errors: [`Strategy factory failed for id: ${strategyId}.`],
          warnings: [],
        },
        started,
        ["Created", "Disposed"]
      );
    }

    return this.executeInstance(strategy, enrichedContext, options, started);
  }

  /**
   * Execute an already-constructed strategy instance.
   */
  executeInstance(
    strategy: BaseStrategy,
    context: StrategyExecutionContext,
    options: StrategyEngineOptions = {},
    startedMs: number = nowMs()
  ): StrategyEngineResult {
    try {
      const validation = this.validator.validateAll(strategy, context, {
        skipEligibilityCheck: options.skipEligibilityCheck,
      });

      if (!validation.valid) {
        strategy.initialize(context);
        const signal = createIgnoreSignal({
          strategyId: strategy.id,
          strategyName: strategy.name,
          category: strategy.category,
          symbol: context.input?.symbol ?? "UNKNOWN",
          reasons: validation.errors,
          warnings: validation.warnings,
          timestamp: context.timestamp ?? new Date(),
          config: context.config,
          metadata: { validation },
        });
        strategy.getLifecycle().dispose();
        strategy.cleanup();
        return {
          signal,
          validation,
          lifecycle: strategy.getLifecycle().snapshot(),
          executionTimeMs: roundMs(nowMs() - startedMs),
        };
      }

      const signal = strategy.execute(context);
      const lifecycle = strategy.getLifecycle().snapshot();
      strategy.cleanup();

      return {
        signal,
        validation,
        lifecycle: {
          ...lifecycle,
          state: "Disposed",
          history: lifecycle.history.includes("Disposed")
            ? lifecycle.history
            : [...lifecycle.history, "Disposed"],
        },
        executionTimeMs: roundMs(nowMs() - startedMs),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Strategy engine failure.";
      try {
        strategy.cleanup();
      } catch {
        // ignore cleanup errors
      }
      return this.ignoreResult(
        strategy.id,
        strategy.name,
        strategy.category,
        context,
        {
          valid: false,
          issues: [
            {
              code: "ENGINE_FAILURE",
              severity: "error",
              message,
            },
          ],
          errors: [message],
          warnings: [],
        },
        startedMs,
        ["Created", "Disposed"]
      );
    }
  }

  /** Convenience: return signal only. */
  run(
    strategyId: string,
    context: StrategyExecutionContext,
    options?: StrategyEngineOptions
  ): StrategySignal {
    return this.execute(strategyId, context, options).signal;
  }

  getRegistry(): StrategyRegistry {
    return this.registry;
  }

  getFactory(): StrategyFactory {
    return this.factory;
  }

  private ignoreResult(
    strategyId: string,
    strategyName: string,
    category: StrategySignal["category"],
    context: StrategyExecutionContext,
    validation: StrategyEngineResult["validation"],
    startedMs: number,
    history: StrategyEngineResult["lifecycle"]["history"]
  ): StrategyEngineResult {
    return {
      signal: createIgnoreSignal({
        strategyId,
        strategyName,
        category,
        symbol: context.input?.symbol ?? "UNKNOWN",
        reasons: validation.errors,
        warnings: validation.warnings,
        timestamp: context.timestamp ?? new Date(),
        config: context.config,
      }),
      validation,
      lifecycle: {
        strategyId,
        state: "Disposed",
        history,
        updatedAt: new Date(),
      },
      executionTimeMs: roundMs(nowMs() - startedMs),
    };
  }
}

function roundMs(ms: number): number {
  return Math.round(ms * 100) / 100;
}

let engineSingleton: StrategyEngine | null = null;

export function getStrategyEngine(): StrategyEngine {
  if (!engineSingleton) {
    engineSingleton = new StrategyEngine();
  }
  return engineSingleton;
}

export function resetStrategyEngine(): void {
  engineSingleton = null;
  resetStrategyFactory();
  resetStrategyRegistry();
}
