import { afterEach, describe, expect, it } from "vitest";
import {
  getStrategyCatalogSize,
  getStrategyFactory,
  getStrategyRegistry,
  resetStrategyEngine,
} from "./index";

describe("Strategy Platform production catalog", () => {
  afterEach(() => {
    resetStrategyEngine();
  });

  it("auto-registers every concrete strategy exactly once", () => {
    const registry = getStrategyRegistry();
    const registrations = registry.getAll();
    const ids = registrations.map((registration) => registration.id);

    expect(registrations).toHaveLength(24);
    expect(registrations).toHaveLength(getStrategyCatalogSize());
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      registrations.every(
        (registration) =>
          registration.name.length > 0 &&
          registration.category.length > 0 &&
          Boolean(registration.timeframe) &&
          Boolean(registration.risk) &&
          typeof registration.confidence === "number" &&
          Boolean(registration.version)
      )
    ).toBe(true);
  });

  it("creates every registered strategy through the shared factory", () => {
    const registry = getStrategyRegistry();
    const factory = getStrategyFactory();

    for (const registration of registry.getEnabled()) {
      const strategy = factory.createEnabled(registration.id);
      expect(strategy?.id).toBe(registration.id);
      expect(strategy?.name).toBe(registration.name);
    }
  });
});
