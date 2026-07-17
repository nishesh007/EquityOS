/** Corner radius scale for the EquityOS design system. */

export const RADIUS_SCALE = Object.freeze({
  small: 6,
  medium: 10,
  large: 14,
  xl: 20,
  pill: 9999,
} as const);

export type RadiusToken = keyof typeof RADIUS_SCALE;

/** Resolve a radius token to a CSS pixel string. */
export function radius(token: RadiusToken): string {
  return `${RADIUS_SCALE[token]}px`;
}
