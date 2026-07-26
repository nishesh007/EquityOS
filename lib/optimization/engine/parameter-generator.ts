import type { ParameterState } from "@/lib/optimization/types";

function roundTo(value: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) return value;
  const precision = Math.max(
    0,
    (String(increment).split(".")[1] ?? "").length
  );
  return Number((Math.round(value / increment) * increment).toFixed(precision));
}

/**
 * Expand a single enabled parameter into discrete candidate values.
 */
export function expandParameterValues(
  param: ParameterState
): Array<number | boolean | string> {
  if (!param.enabled) {
    return [param.current];
  }

  if (param.type === "boolean") {
    return [true, false];
  }

  if (param.type === "dropdown") {
    return [...(param.options ?? [String(param.current)])];
  }

  const min = param.min ?? Number(param.current);
  const max = param.max ?? Number(param.current);
  const increment = param.increment ?? 1;

  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return [Number(param.current)];
  }

  const values: number[] = [];
  const steps = Math.floor((max - min) / increment) + 1;
  const capped = Math.min(steps, 200);

  for (let i = 0; i < capped; i += 1) {
    let v = roundTo(min + i * increment, increment);
    if (param.type === "integer") v = Math.round(v);
    if (v > max + 1e-9) break;
    values.push(v);
  }

  if (values.length === 0) {
    values.push(Number(param.current));
  }

  return values;
}

export function formatParameterValue(
  param: ParameterState,
  value: number | boolean | string
): string {
  if (param.type === "boolean") return value ? "True" : "False";
  if (param.type === "percentage") return `${value}${param.unit ?? "%"}`;
  if (param.unit) return `${value} ${param.unit}`;
  return String(value);
}

export function countExpandedValues(parameters: readonly ParameterState[]): number {
  return parameters
    .filter((p) => p.enabled)
    .reduce((acc, p) => acc * Math.max(1, expandParameterValues(p).length), 1);
}
