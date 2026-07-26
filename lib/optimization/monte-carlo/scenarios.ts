import { STRESS_SCENARIOS, type StressScenarioDefinition, type StressScenarioId } from "./types";

export function getScenario(
  id: StressScenarioId,
  custom?: { returnShock: number; volShock: number }
): StressScenarioDefinition {
  if (id === "custom" && custom) {
    return {
      ...STRESS_SCENARIOS.find((s) => s.id === "custom")!,
      returnShock: custom.returnShock,
      volatilityShock: custom.volShock,
    };
  }
  return (
    STRESS_SCENARIOS.find((s) => s.id === id) ??
    STRESS_SCENARIOS.find((s) => s.id === "sideways")!
  );
}

export function resolveScenarios(
  ids: readonly StressScenarioId[],
  custom?: { returnShock: number; volShock: number }
): StressScenarioDefinition[] {
  const unique = Array.from(new Set(ids));
  return unique.map((id) => getScenario(id, custom));
}

/**
 * Combine multiple scenarios into a blended shock (average + mild compounding).
 */
export function combineScenarios(
  scenarios: readonly StressScenarioDefinition[]
): StressScenarioDefinition {
  if (scenarios.length === 0) {
    return getScenario("sideways");
  }
  if (scenarios.length === 1) return scenarios[0]!;

  const n = scenarios.length;
  const returnShock =
    scenarios.reduce((s, x) => s + x.returnShock, 0) / n -
    0.02 * Math.max(0, n - 1);
  const volatilityShock =
    scenarios.reduce((s, x) => s + x.volatilityShock, 0) / n +
    0.05 * Math.max(0, n - 1);
  const gapBoost = scenarios.reduce((s, x) => s + x.gapBoost, 0) / n;
  const liquidityPenalty =
    scenarios.reduce((s, x) => s + x.liquidityPenalty, 0) / n;

  return {
    id: "custom",
    label: scenarios.map((s) => s.label).join(" + "),
    description: "Combined stress overlay.",
    returnShock,
    volatilityShock,
    gapBoost,
    liquidityPenalty,
  };
}
