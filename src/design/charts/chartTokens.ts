/**
 * Chart color tokens as CSS-variable colors so charts restyle live when
 * the theme changes. Mirrors the ordering of VisualizationTheme.series.
 */

export const CHART_SERIES_COLORS: readonly string[] = Object.freeze([
  "rgb(var(--eos-color-accent))",
  "rgb(var(--eos-color-secondary))",
  "rgb(var(--eos-color-success))",
  "rgb(var(--eos-color-warning))",
  "rgb(var(--eos-color-info))",
  "rgb(var(--eos-color-danger))",
  "rgb(var(--eos-color-text-muted))",
]);

export const CHART_COLORS = Object.freeze({
  positive: "rgb(var(--eos-color-success))",
  negative: "rgb(var(--eos-color-danger))",
  neutral: "rgb(var(--eos-color-text-muted))",
  accent: "rgb(var(--eos-color-accent))",
  grid: "rgb(var(--eos-color-border))",
  track: "rgb(var(--eos-color-muted))",
} as const);

/** Tone → color class maps shared by gauges, meters and progress. */
export const TONE_TEXT_CLASS = Object.freeze({
  success: "text-gain",
  accent: "text-accent",
  info: "text-info",
  warning: "text-warning",
  danger: "text-loss",
} as const);

export const TONE_STROKE_COLOR = Object.freeze({
  success: "rgb(var(--eos-color-success))",
  accent: "rgb(var(--eos-color-accent))",
  info: "rgb(var(--eos-color-info))",
  warning: "rgb(var(--eos-color-warning))",
  danger: "rgb(var(--eos-color-danger))",
} as const);

export type ChartTone = keyof typeof TONE_STROKE_COLOR;
