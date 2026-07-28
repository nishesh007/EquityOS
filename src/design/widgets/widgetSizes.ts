/**
 * Sprint 10C — four card/widget sizes only.
 * SMALL · MEDIUM · LARGE · FULL WIDTH
 * Legacy xs/s/m/l/xl aliases resolve to the same system.
 */

import type { GridColumns } from "../layout/gridSystem";

export type WidgetSize = "small" | "medium" | "large" | "full";

/** @deprecated Prefer small|medium|large|full */
export type LegacyWidgetSize = "xs" | "s" | "m" | "l" | "xl";

export type AnyWidgetSize = WidgetSize | LegacyWidgetSize;

export const WIDGET_SIZES: readonly WidgetSize[] = Object.freeze([
  "small",
  "medium",
  "large",
  "full",
]);

export interface WidgetSizeSpec {
  span: GridColumns;
  minContentHeight: number;
  skeletonRows: number;
}

const SPECS: Record<WidgetSize, WidgetSizeSpec> = {
  small: { span: 1, minContentHeight: 160, skeletonRows: 3 },
  medium: { span: 2, minContentHeight: 240, skeletonRows: 5 },
  large: { span: 3, minContentHeight: 320, skeletonRows: 7 },
  full: { span: 4, minContentHeight: 400, skeletonRows: 9 },
};

const LEGACY: Record<LegacyWidgetSize, WidgetSize> = {
  xs: "small",
  s: "small",
  m: "medium",
  l: "large",
  xl: "full",
};

/** Specs keyed by canonical + legacy size ids. */
export const WIDGET_SIZE_SPECS: Readonly<
  Record<AnyWidgetSize, WidgetSizeSpec>
> = Object.freeze({
  ...SPECS,
  xs: SPECS.small,
  s: SPECS.small,
  m: SPECS.medium,
  l: SPECS.large,
  xl: SPECS.full,
});

function normalizeSize(size: string): WidgetSize {
  if (size in SPECS) return size as WidgetSize;
  if (size in LEGACY) return LEGACY[size as LegacyWidgetSize];
  return "medium";
}

export function resolveWidgetSize(
  size: AnyWidgetSize | string,
  availableColumns: GridColumns = 4
): WidgetSizeSpec {
  const normalized = normalizeSize(size);
  const spec = SPECS[normalized];
  const span = Math.min(spec.span, availableColumns) as GridColumns;
  return Object.freeze({ ...spec, span });
}
