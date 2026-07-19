import { getStrategyFactory } from "./StrategyFactory";
import { getStrategyRegistry } from "./StrategyRegistry";

export function getStrategyPlatformStatus() {
  const registry = getStrategyRegistry();
  const factory = getStrategyFactory();
  const strategies = registry.getAll().map((registration) => ({
    strategyId: registration.id,
    name: registration.name,
    category: registration.category,
    timeframe: registration.timeframe ?? "Unspecified",
    risk: registration.risk ?? "Moderate",
    confidence: registration.confidence ?? 0,
    enabled: registration.enabled,
    version: registration.version ?? "Unversioned",
    factoryReady: factory.has(registration.id),
  }));
  return {
    active: strategies.length > 0,
    registrySize: strategies.length,
    duplicateCount:
      strategies.length -
      new Set(strategies.map((strategy) => strategy.strategyId)).size,
    factoryReadyCount: strategies.filter((strategy) => strategy.factoryReady)
      .length,
    strategies,
  };
}
