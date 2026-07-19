/**
 * Strategy Factory — Sprint 11B.3A.
 * Instantiates strategies by id via registry — no switch statements.
 */

import type { BaseStrategy } from "./BaseStrategy";
import type { StrategyExecutionContext } from "./StrategyTypes";
import {
  getStrategyRegistry,
  type StrategyRegistry,
} from "./StrategyRegistry";

export class StrategyFactory {
  constructor(private readonly registry: StrategyRegistry = getStrategyRegistry()) {}

  /**
   * Create a strategy instance by id.
   * Returns null when unknown or factory throws.
   */
  create(strategyId: string): BaseStrategy | null {
    const registration = this.registry.find(strategyId);
    if (!registration) {
      return null;
    }
    try {
      const instance = registration.create();
      if (!instance || instance.id !== registration.id) {
        // Allow instance id to match registration; if mismatched, still return
        // when id is empty only on abstract — concrete must set id.
        if (!instance) return null;
      }
      return instance;
    } catch {
      return null;
    }
  }

  /**
   * Create only when registration exists and is enabled.
   */
  createEnabled(strategyId: string): BaseStrategy | null {
    const registration = this.registry.find(strategyId);
    if (!registration || !registration.enabled) {
      return null;
    }
    return this.create(strategyId);
  }

  /**
   * Build the immutable execution binding consumed by StrategyEngine.
   * Context, regime, eligibility, pipeline, market data, validation, and AI
   * confidence are injected together so callers cannot partially wire a run.
   */
  createForExecution(
    strategyId: string,
    context: StrategyExecutionContext
  ): { strategy: BaseStrategy; context: StrategyExecutionContext } | null {
    if (
      !context.marketContext ||
      !context.regime ||
      !context.pipeline ||
      !context.input
    ) {
      return null;
    }
    const strategy = this.createEnabled(strategyId);
    return strategy ? { strategy, context } : null;
  }

  has(strategyId: string): boolean {
    return this.registry.has(strategyId);
  }
}

let factorySingleton: StrategyFactory | null = null;

export function getStrategyFactory(): StrategyFactory {
  if (!factorySingleton) {
    factorySingleton = new StrategyFactory(getStrategyRegistry());
  }
  return factorySingleton;
}

export function resetStrategyFactory(): void {
  factorySingleton = null;
}
