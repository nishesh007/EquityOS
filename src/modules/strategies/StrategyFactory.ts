/**
 * Strategy Factory — Sprint 11B.3A.
 * Instantiates strategies by id via registry — no switch statements.
 */

import type { BaseStrategy } from "./BaseStrategy";
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
