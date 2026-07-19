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
  StrategyEngineBatchResult,
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

    const execution = enrichedContext.pipeline
      ? this.factory.createForExecution(strategyId, enrichedContext)
      : null;
    const strategy = execution?.strategy ?? this.factory.create(strategyId);
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
          marketRegime: context.regime.regime,
          eligibility: {
            eligible: false,
            score: 0,
            reasons: validation.errors,
          },
          evidence: validation.issues.map((issue) => issue.message),
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

  /**
   * Execute the pipeline-approved registry set, rank actionable signals, and
   * remove duplicate strategy/symbol/direction results.
   */
  executeEligible(
    context: StrategyExecutionContext,
    strategyIds?: readonly string[],
    options: StrategyEngineOptions = {}
  ): StrategyEngineBatchResult {
    const started = nowMs();
    const requested = strategyIds
      ? new Set(strategyIds)
      : new Set(
          context.eligibleStrategies
            .filter((strategy) => strategy.eligible)
            .map((strategy) => strategy.strategyId)
        );
    const registrations = this.registry
      .getEnabled()
      .filter(
        (registration) =>
          requested.has(registration.eligibilityId ?? registration.id) ||
          requested.has(registration.id)
      );
    const results = registrations.map((registration) =>
      this.execute(registration.id, context, options)
    );
    const ranked = results
      .map((result) => result.signal)
      .sort(
        (left, right) =>
          signalPriority(right) - signalPriority(left) ||
          right.quality - left.quality ||
          right.confidence - left.confidence ||
          right.riskReward - left.riskReward
      );
    const seen = new Set<string>();
    const signals = ranked.filter((signal) => {
      const key = `${signal.strategyId}:${signal.symbol}:${signal.signal}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return signal.signal !== "IGNORE";
    });
    return {
      symbol: context.input.symbol,
      results,
      signals,
      rejected: ranked.filter((signal) => signal.signal === "IGNORE"),
      executionTimeMs: roundMs(nowMs() - started),
      timestamp: context.timestamp ?? new Date(),
    };
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
        marketRegime: context.regime?.regime ?? "Unknown",
        eligibility: {
          eligible: false,
          score: 0,
          reasons: validation.errors,
        },
        evidence: validation.issues.map((issue) => issue.message),
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

function signalPriority(signal: StrategySignal): number {
  if (signal.signal === "BUY" || signal.signal === "SELL") return 3;
  if (signal.signal === "WATCHLIST") return 2;
  return 1;
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
