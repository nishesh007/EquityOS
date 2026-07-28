/**
 * Sprint 10C — single spacing scale.
 * 4 · 8 · 12 · 16 · 24 · 32 · 48 — no arbitrary spacing.
 */

export const SPACING_SCALE = Object.freeze({
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const);

export type SpacingToken = keyof typeof SPACING_SCALE;

/** Allowed pixel values, ascending. */
export const SPACING_VALUES: readonly number[] = Object.freeze([
  4, 8, 12, 16, 24, 32, 48,
]);

export function space(token: SpacingToken): string {
  return `${SPACING_SCALE[token]}px`;
}
