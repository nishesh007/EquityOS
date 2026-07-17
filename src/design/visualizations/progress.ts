/**
 * Progress geometry — linear and circular progress used for target
 * completion, holding duration and recommendation lifecycle displays.
 */

export type ProgressVariant = "linear" | "circular";

export interface ProgressRender {
  variant: ProgressVariant;
  /** Clamped progress, 0–100. */
  percent: number;
  /** 0–1 fraction. */
  fraction: number;
  /** Linear: CSS width percentage string. */
  widthPercent: string;
  /** Circular: circumference and dash offset for an SVG ring. */
  circumference: number;
  dashOffset: number;
  /** Semantic tone for coloring by completion. */
  tone: "danger" | "warning" | "accent" | "success";
  /** True when progress is complete. */
  complete: boolean;
}

export interface ProgressOptions {
  variant?: ProgressVariant;
  /** Ring radius for circular variant (default 22). */
  radius?: number;
}

/** Public API — compute progress geometry from a 0–100 value. */
export function renderProgressWidget(
  percent: number,
  options: ProgressOptions = {},
): ProgressRender {
  const variant = options.variant ?? "linear";
  const radius = options.radius ?? 22;
  const clamped = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const fraction = round4(clamped / 100);
  const circumference = round2(2 * Math.PI * radius);

  const tone: ProgressRender["tone"] =
    clamped >= 100 ? "success" : clamped >= 60 ? "accent" : clamped >= 30 ? "warning" : "danger";

  return Object.freeze({
    variant,
    percent: round2(clamped),
    fraction,
    widthPercent: `${round2(clamped)}%`,
    circumference,
    dashOffset: round2(circumference * (1 - fraction)),
    tone,
    complete: clamped >= 100,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
