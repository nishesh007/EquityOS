/**
 * Strategy Registry — Sprint 11B.3A.
 * Central catalog of strategy constructors / factories.
 */

import type { StrategyCategory, StrategyRegistration } from "./StrategyTypes";
import { registerAllStrategies } from "./StrategyAutoRegistration";

export class StrategyRegistry {
  private readonly registrations = new Map<string, StrategyRegistration>();

  /**
   * Register a strategy. Rejects duplicates (returns false).
   */
  register(registration: StrategyRegistration): boolean {
    if (!registration?.id || typeof registration.create !== "function") {
      return false;
    }
    if (this.registrations.has(registration.id)) {
      return false;
    }
    this.registrations.set(registration.id, {
      ...registration,
      enabled: registration.enabled !== false,
      timeframe:
        registration.timeframe ?? defaultTimeframe(registration.category),
      risk: registration.risk ?? defaultRisk(registration.category),
      confidence:
        registration.confidence ?? defaultConfidence(registration.category),
    });
    return true;
  }

  /**
   * Remove a strategy from the registry.
   */
  unregister(strategyId: string): boolean {
    return this.registrations.delete(strategyId);
  }

  find(strategyId: string): StrategyRegistration | undefined {
    return this.registrations.get(strategyId);
  }

  findByCategory(category: StrategyCategory): StrategyRegistration[] {
    return [...this.registrations.values()].filter(
      (item) => item.category === category
    );
  }

  getEnabled(): StrategyRegistration[] {
    return [...this.registrations.values()].filter((item) => item.enabled);
  }

  getAll(): StrategyRegistration[] {
    return [...this.registrations.values()];
  }

  has(strategyId: string): boolean {
    return this.registrations.has(strategyId);
  }

  size(): number {
    return this.registrations.size;
  }

  clear(): void {
    this.registrations.clear();
  }

  setEnabled(strategyId: string, enabled: boolean): boolean {
    const existing = this.registrations.get(strategyId);
    if (!existing) return false;
    this.registrations.set(strategyId, { ...existing, enabled });
    return true;
  }
}

let registrySingleton: StrategyRegistry | null = null;

export function getStrategyRegistry(): StrategyRegistry {
  if (!registrySingleton) {
    registrySingleton = new StrategyRegistry();
    registerAllStrategies(registrySingleton);
  }
  return registrySingleton;
}

export function resetStrategyRegistry(): void {
  if (registrySingleton) registrySingleton.clear();
  registrySingleton = null;
}

function defaultTimeframe(category: StrategyCategory): string {
  if (category === "Scalp") return "1m–15m";
  if (category === "Intraday") return "5m–1D";
  if (category === "Swing") return "1D–1W";
  return "1W–1Y";
}

function defaultRisk(
  category: StrategyCategory
): NonNullable<StrategyRegistration["risk"]> {
  if (category === "Scalp") return "Very High";
  if (category === "Intraday") return "High";
  if (category === "Swing") return "Moderate";
  return "Low";
}

function defaultConfidence(category: StrategyCategory): number {
  if (category === "Scalp") return 65;
  if (category === "Intraday") return 62;
  if (category === "Swing") return 60;
  return 58;
}
