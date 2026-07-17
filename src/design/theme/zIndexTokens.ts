/**
 * Stacking-context tokens for the EquityOS design system.
 * Values are intentionally spaced apart so future layers can slot in.
 */

export const Z_INDEX = Object.freeze({
  base: 0,
  raised: 10,
  sticky: 100,
  dropdown: 1000,
  overlay: 1100,
  modal: 1200,
  popover: 1300,
  toast: 1400,
  tooltip: 1500,
} as const);

export type ZIndexToken = keyof typeof Z_INDEX;

/** Layer names ordered from lowest to highest stacking priority. */
export const Z_INDEX_ORDER: readonly ZIndexToken[] = Object.freeze([
  "base",
  "raised",
  "sticky",
  "dropdown",
  "overlay",
  "modal",
  "popover",
  "toast",
  "tooltip",
]);
