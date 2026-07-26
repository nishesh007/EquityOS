import type {
  ComplexityLevel,
  ParameterState,
  RuntimeEstimate,
} from "./types";

function countSteps(
  min: number | undefined,
  max: number | undefined,
  increment: number | undefined
): number {
  if (min == null || max == null || increment == null || increment <= 0) {
    return 1;
  }
  if (max < min) return 1;
  return Math.floor((max - min) / increment) + 1;
}

/**
 * Mock runtime estimation only — not a real optimizer cost model.
 */
export function estimateRuntime(
  parameters: readonly ParameterState[]
): RuntimeEstimate {
  const enabled = parameters.filter((p) => p.enabled);
  const parameterCount = enabled.length;

  let combinationCount = 1;
  for (const p of enabled) {
    if (p.type === "boolean") {
      combinationCount *= 2;
      continue;
    }
    if (p.type === "dropdown") {
      combinationCount *= Math.max(1, p.options?.length ?? 1);
      continue;
    }
    combinationCount *= countSteps(p.min, p.max, p.increment);
  }

  combinationCount = Math.min(combinationCount, 5_000_000);

  // Mock: ~12ms per combination baseline with soft scaling.
  const minutes = Math.max(
    0.5,
    (combinationCount * 0.012) / 60 + parameterCount * 0.15
  );
  const estimatedRuntimeMinutes = Math.round(minutes * 10) / 10;

  let complexity: ComplexityLevel = "Low";
  if (combinationCount > 50_000 || estimatedRuntimeMinutes > 30) {
    complexity = "Very High";
  } else if (combinationCount > 10_000 || estimatedRuntimeMinutes > 10) {
    complexity = "High";
  } else if (combinationCount > 1_000 || estimatedRuntimeMinutes > 3) {
    complexity = "Moderate";
  }

  const cpuCores =
    complexity === "Very High"
      ? "8–16 cores"
      : complexity === "High"
        ? "4–8 cores"
        : complexity === "Moderate"
          ? "2–4 cores"
          : "1–2 cores";

  const memoryGb =
    complexity === "Very High"
      ? "8–16 GB"
      : complexity === "High"
        ? "4–8 GB"
        : complexity === "Moderate"
          ? "2–4 GB"
          : "1–2 GB";

  const estimatedRuntime =
    estimatedRuntimeMinutes < 1
      ? "< 1 min"
      : estimatedRuntimeMinutes < 60
        ? `~${estimatedRuntimeMinutes} min`
        : `~${(estimatedRuntimeMinutes / 60).toFixed(1)} hr`;

  return {
    parameterCount,
    combinationCount,
    estimatedRuntime,
    estimatedRuntimeMinutes,
    cpuEstimate: cpuCores,
    memoryEstimate: memoryGb,
    complexity,
  };
}
