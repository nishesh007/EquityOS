/**
 * Institutional grid system — the single source of truth for dashboard
 * column layouts. Pure TypeScript so it is testable in Node; components
 * consume the class maps, never hand-rolled grid classes.
 *
 * Tailwind requires statically analyzable class names, so every
 * column/gap/span variant is enumerated here once. No page defines its
 * own grid classes — that is what keeps layouts from being duplicated.
 */

import { BREAKPOINTS, type BreakpointToken } from "../theme/breakpoints";
import { SPACING_SCALE } from "../theme/spacingTokens";

export type GridColumns = 1 | 2 | 3 | 4;

export const GRID_COLUMN_OPTIONS: readonly GridColumns[] = Object.freeze([1, 2, 3, 4]);

/**
 * Responsive class per column count. Mobile always collapses to one
 * column; wider breakpoints fan out proportionally.
 */
export const GRID_COLUMN_CLASSES: Readonly<Record<GridColumns, string>> = Object.freeze({
  1: "grid-cols-1",
  2: "grid-cols-1 lg:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
});

/** Column-span classes for widgets inside a 4-track grid. */
export const GRID_SPAN_CLASSES: Readonly<Record<GridColumns, string>> = Object.freeze({
  1: "col-span-1",
  2: "col-span-1 md:col-span-2",
  3: "col-span-1 md:col-span-2 xl:col-span-3",
  4: "col-span-1 md:col-span-2 xl:col-span-4",
});

/** Grid gap classes derived from the spacing scale (16px / 24px). */
export const GRID_GAP_CLASSES = Object.freeze({
  compact: "gap-3",
  standard: "gap-4",
  spacious: "gap-6",
} as const);

export type GridGap = keyof typeof GRID_GAP_CLASSES;

/** Pixel value behind each gap token, sourced from the spacing scale. */
export const GRID_GAP_PX: Readonly<Record<GridGap, number>> = Object.freeze({
  compact: SPACING_SCALE.md,
  standard: SPACING_SCALE.lg,
  spacious: SPACING_SCALE["2xl"],
});

/**
 * How many grid tracks are actually available at a viewport breakpoint
 * for a grid declared with `columns` tracks. Mirrors GRID_COLUMN_CLASSES.
 */
export function resolveGridColumns(
  columns: GridColumns,
  breakpoint: BreakpointToken,
): number {
  const width = BREAKPOINTS[breakpoint];
  if (columns === 1) return 1;
  if (columns === 2) return width >= BREAKPOINTS.laptop ? 2 : 1;
  // 3- and 4-track grids: two tracks from tablet, full fan-out at desktop.
  if (width >= BREAKPOINTS.desktop) return columns;
  if (width >= BREAKPOINTS.tablet) return 2;
  return 1;
}

/**
 * The institutional main-grid split: primary work column vs. context rail.
 * Declared once — 70/30 on desktop, stacked below the laptop breakpoint.
 */
export const MAIN_GRID_SPLIT = Object.freeze({
  /** Total fractional tracks in the split. */
  tracks: 10,
  /** Left (primary) column tracks — 70%. */
  primary: 7,
  /** Right (context rail) tracks — 30%. */
  secondary: 3,
  container: "grid grid-cols-1 xl:grid-cols-10",
  primaryClass: "xl:col-span-7 min-w-0",
  secondaryClass: "xl:col-span-3 min-w-0",
} as const);

export interface DashboardGridConfig {
  columns: readonly GridColumns[];
  columnClasses: typeof GRID_COLUMN_CLASSES;
  spanClasses: typeof GRID_SPAN_CLASSES;
  gaps: typeof GRID_GAP_PX;
  mainSplit: typeof MAIN_GRID_SPLIT;
}

/** Public API — the full grid configuration used by every dashboard page. */
export function getDashboardGrid(): DashboardGridConfig {
  return Object.freeze({
    columns: GRID_COLUMN_OPTIONS,
    columnClasses: GRID_COLUMN_CLASSES,
    spanClasses: GRID_SPAN_CLASSES,
    gaps: GRID_GAP_PX,
    mainSplit: MAIN_GRID_SPLIT,
  });
}
