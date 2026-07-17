/**
 * DesignSystem — aggregated, read-only view of every design token in
 * EquityOS. This is the one place the rest of the application asks for
 * tokens; nothing outside src/design defines colors, spacing, radii,
 * shadows, typography, motion, stacking or breakpoints.
 */

import {
  ANIMATION_PRESETS,
  DURATIONS_MS,
  EASINGS,
} from "./theme/animationTokens";
import { BREAKPOINTS, BREAKPOINT_ORDER } from "./theme/breakpoints";
import type { ThemeColors } from "./theme/colorTokens";
import { RADIUS_SCALE } from "./theme/radiusTokens";
import { buildShadowTokens, type ShadowTokens } from "./theme/shadowTokens";
import { SPACING_SCALE } from "./theme/spacingTokens";
import { getThemeEngine } from "./theme/ThemeEngine";
import type { Theme } from "./theme/themeTokens";
import { TYPOGRAPHY_SCALE } from "./theme/typographyTokens";
import { Z_INDEX } from "./theme/zIndexTokens";

/** Full token set resolved for one theme. */
export interface ThemeTokens {
  themeId: string;
  mode: Theme["mode"];
  colors: ThemeColors;
  shadows: ShadowTokens;
  spacing: typeof SPACING_SCALE;
  radius: typeof RADIUS_SCALE;
  typography: typeof TYPOGRAPHY_SCALE;
  durations: typeof DURATIONS_MS;
  easings: typeof EASINGS;
  animations: typeof ANIMATION_PRESETS;
  zIndex: typeof Z_INDEX;
  breakpoints: typeof BREAKPOINTS;
}

/** Theme-independent parts of the design system. */
export interface DesignSystem {
  themes: readonly Theme[];
  defaultThemeId: string;
  spacing: typeof SPACING_SCALE;
  radius: typeof RADIUS_SCALE;
  typography: typeof TYPOGRAPHY_SCALE;
  durations: typeof DURATIONS_MS;
  easings: typeof EASINGS;
  animations: typeof ANIMATION_PRESETS;
  zIndex: typeof Z_INDEX;
  breakpoints: typeof BREAKPOINTS;
  breakpointOrder: typeof BREAKPOINT_ORDER;
}

/** Public API — token set for the active (or a given) theme. */
export function getThemeTokens(theme?: Theme): ThemeTokens {
  const resolved = theme ?? getThemeEngine().getTheme();
  return Object.freeze({
    themeId: resolved.id,
    mode: resolved.mode,
    colors: resolved.colors,
    shadows: buildShadowTokens(resolved.mode),
    spacing: SPACING_SCALE,
    radius: RADIUS_SCALE,
    typography: TYPOGRAPHY_SCALE,
    durations: DURATIONS_MS,
    easings: EASINGS,
    animations: ANIMATION_PRESETS,
    zIndex: Z_INDEX,
    breakpoints: BREAKPOINTS,
  });
}

/** Public API — the full design system description. */
export function getDesignSystem(): DesignSystem {
  const engine = getThemeEngine();
  return Object.freeze({
    themes: engine.listThemes(),
    defaultThemeId: "institutional-dark",
    spacing: SPACING_SCALE,
    radius: RADIUS_SCALE,
    typography: TYPOGRAPHY_SCALE,
    durations: DURATIONS_MS,
    easings: EASINGS,
    animations: ANIMATION_PRESETS,
    zIndex: Z_INDEX,
    breakpoints: BREAKPOINTS,
    breakpointOrder: BREAKPOINT_ORDER,
  });
}
