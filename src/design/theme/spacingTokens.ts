/**
 * Spacing scale for the EquityOS design system.
 * All layout spacing must come from this scale — no hardcoded pixel values.
 */

export const SPACING_SCALE = Object.freeze({
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const);

export type SpacingToken = keyof typeof SPACING_SCALE;

/** Allowed pixel values, ascending. */
export const SPACING_VALUES: readonly number[] = Object.freeze([
  4, 8, 12, 16, 20, 24, 32, 40, 48, 64,
]);

/** Resolve a spacing token to a CSS pixel string. */
export function space(token: SpacingToken): string {
  return `${SPACING_SCALE[token]}px`;
}
