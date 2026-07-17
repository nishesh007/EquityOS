/**
 * Visualization theme — the palette every chart, gauge and heatmap uses.
 * Resolves from the active design-system theme so visualizations restyle
 * automatically when the theme changes. No chart defines its own colors.
 */

import { getThemeEngine } from "../theme/ThemeEngine";
import type { Theme } from "../theme/themeTokens";

export interface VisualizationTheme {
  themeId: string;
  /** Ordered categorical series palette. */
  series: readonly string[];
  positive: string;
  negative: string;
  neutral: string;
  accent: string;
  warning: string;
  /** Grid/axis line color. */
  grid: string;
  /** Chart label color. */
  label: string;
  /** Track (unfilled) color for gauges and progress. */
  track: string;
  /** Sequential heat scale, cold → hot. */
  heatScale: readonly string[];
}

/** Public API — visualization palette for the active (or given) theme. */
export function getVisualizationTheme(theme?: Theme): VisualizationTheme {
  const resolved = theme ?? getThemeEngine().getTheme();
  const c = resolved.colors;
  return Object.freeze({
    themeId: resolved.id,
    series: Object.freeze([
      c.accent,
      c.secondary,
      c.success,
      c.warning,
      c.info,
      c.danger,
      c.textMuted,
    ]),
    positive: c.success,
    negative: c.danger,
    neutral: c.textMuted,
    accent: c.accent,
    warning: c.warning,
    grid: c.border,
    label: c.textMuted,
    track: c.muted,
    heatScale: Object.freeze([c.danger, c.warning, c.muted, c.successMuted, c.success]),
  });
}
