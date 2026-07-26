import type { ParameterState } from "@/lib/optimization/types";
import {
  expandParameterValues,
  formatParameterValue,
} from "./parameter-generator";
import type { ParameterCombination } from "./types";

type AxisItem = {
  param: ParameterState;
  value: number | boolean | string;
};

/**
 * Generate combinations with an early stop once `max` is reached.
 * Avoids materializing the full cartesian product in memory.
 */
function cappedCartesian(axes: AxisItem[][], max: number): AxisItem[][] {
  if (axes.length === 0) return [[]];
  let acc: AxisItem[][] = [[]];
  for (const axis of axes) {
    const next: AxisItem[][] = [];
    for (const prefix of acc) {
      for (const item of axis) {
        next.push([...prefix, item]);
        if (next.length >= max) return next;
      }
    }
    acc = next;
    if (acc.length >= max) return acc.slice(0, max);
  }
  return acc;
}

/**
 * Generate all valid parameter combinations from enabled parameters.
 * Disabled parameters keep their current value in every combination.
 */
export function generateCombinations(
  parameters: readonly ParameterState[],
  options?: { maxCombinations?: number }
): ParameterCombination[] {
  const max = options?.maxCombinations ?? 10_000;
  const enabled = parameters.filter((p) => p.enabled);
  const disabled = parameters.filter((p) => !p.enabled);

  if (enabled.length === 0) {
    const values: Record<string, number | boolean | string> = {};
    const labels: Record<string, string> = {};
    for (const p of parameters) {
      values[p.id] = p.current;
      labels[p.label] = formatParameterValue(p, p.current);
    }
    return [{ id: "combo-0", values, labels }];
  }

  const axes = enabled.map((p) =>
    expandParameterValues(p).map((value) => ({ param: p, value }))
  );

  const raw = cappedCartesian(axes, max);

  return raw.map((combo, index) => {
    const values: Record<string, number | boolean | string> = {};
    const labels: Record<string, string> = {};

    for (const { param, value } of combo) {
      values[param.id] = value;
      labels[param.label] = formatParameterValue(param, value);
    }
    for (const p of disabled) {
      values[p.id] = p.current;
      labels[p.label] = formatParameterValue(p, p.current);
    }

    return {
      id: `combo-${index}`,
      values,
      labels,
    };
  });
}

export function estimateCombinationCount(
  parameters: readonly ParameterState[]
): number {
  const enabled = parameters.filter((p) => p.enabled);
  if (enabled.length === 0) return 1;
  return enabled.reduce(
    (acc, p) => acc * Math.max(1, expandParameterValues(p).length),
    1
  );
}
