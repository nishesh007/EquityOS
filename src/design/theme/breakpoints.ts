/**
 * Responsive breakpoints for the EquityOS design system.
 * Min-width based, matching Tailwind's mobile-first model.
 */

export const BREAKPOINTS = Object.freeze({
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
  ultrawide: 1920,
} as const);

export type BreakpointToken = keyof typeof BREAKPOINTS;

/** Breakpoints ordered from narrowest to widest. */
export const BREAKPOINT_ORDER: readonly BreakpointToken[] = Object.freeze([
  "mobile",
  "tablet",
  "laptop",
  "desktop",
  "ultrawide",
]);

/** Resolve which breakpoint a viewport width falls into. */
export function resolveBreakpoint(width: number): BreakpointToken {
  if (Number.isNaN(width) || width < 0) return "mobile";
  let match: BreakpointToken = "mobile";
  for (const token of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[token]) match = token;
  }
  return match;
}

/** Min-width media query for a breakpoint. */
export function mediaQuery(token: BreakpointToken): string {
  return `(min-width: ${BREAKPOINTS[token]}px)`;
}
