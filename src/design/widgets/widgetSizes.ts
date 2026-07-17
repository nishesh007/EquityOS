/**
 * Widget sizing model. Widgets declare a preferred size; the dashboard
 * resolves it into grid spans automatically, clamped to the grid it is
 * placed in. Pure TypeScript — testable in Node.
 */

import type { GridColumns } from "../layout/gridSystem";

export type WidgetSize = "xs" | "s" | "m" | "l" | "xl";

export const WIDGET_SIZES: readonly WidgetSize[] = Object.freeze(["xs", "s", "m", "l", "xl"]);

export interface WidgetSizeSpec {
  /** Preferred tracks in a 4-track grid. */
  span: GridColumns;
  /** Minimum content height in px — keeps skeletons from jumping. */
  minContentHeight: number;
  /** Skeleton rows rendered while loading. */
  skeletonRows: number;
}

export const WIDGET_SIZE_SPECS: Readonly<Record<WidgetSize, WidgetSizeSpec>> = Object.freeze({
  xs: { span: 1, minContentHeight: 96, skeletonRows: 2 },
  s: { span: 1, minContentHeight: 160, skeletonRows: 3 },
  m: { span: 2, minContentHeight: 240, skeletonRows: 5 },
  l: { span: 3, minContentHeight: 320, skeletonRows: 7 },
  xl: { span: 4, minContentHeight: 400, skeletonRows: 9 },
});

/**
 * Public API — resolve a widget's preferred size against the grid it is
 * mounted in. The span never exceeds the available tracks.
 */
export function resolveWidgetSize(
  size: WidgetSize,
  availableColumns: GridColumns = 4,
): WidgetSizeSpec {
  const spec = WIDGET_SIZE_SPECS[size];
  const span = Math.min(spec.span, availableColumns) as GridColumns;
  return Object.freeze({ ...spec, span });
}
