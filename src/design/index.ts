/**
 * EquityOS Design System — public API.
 *
 * Import design tokens, the theme engine and global UI primitives from
 * this barrel only:
 *
 *   import { getTheme, setTheme, toggleTheme, getThemeTokens,
 *            getDesignSystem, ThemeProvider, useTheme,
 *            InstitutionalCard, MetricCard } from "@/src/design";
 */

// Theme engine + public API
export {
  ThemeEngine,
  getThemeEngine,
  getTheme,
  setTheme,
  toggleTheme,
  spaceVar,
  radiusVar,
  zIndexVar,
  THEME_STORAGE_KEY,
  type ThemeChangeListener,
} from "./theme/ThemeEngine";

// Themes
export {
  BUILT_IN_THEMES,
  DEFAULT_THEME_ID,
  type Theme,
  type BuiltInThemeId,
} from "./theme/themeTokens";

// Design system aggregate
export {
  getThemeTokens,
  getDesignSystem,
  type ThemeTokens,
  type DesignSystem,
} from "./DesignSystem";

// Tokens
export {
  COLOR_TOKEN_NAMES,
  contrastRatio,
  meetsContrastAA,
  relativeLuminance,
  hexToRgb,
  hexToRgbTriplet,
  isValidHexColor,
  type ThemeColors,
  type ColorTokenName,
} from "./theme/colorTokens";
export {
  SPACING_SCALE,
  SPACING_VALUES,
  space,
  type SpacingToken,
} from "./theme/spacingTokens";
export { RADIUS_SCALE, radius, type RadiusToken } from "./theme/radiusTokens";
export {
  buildShadowTokens,
  SHADOW_TOKEN_NAMES,
  type ShadowTokens,
  type ShadowToken,
  type ThemeMode,
} from "./theme/shadowTokens";
export {
  FONT_FAMILIES,
  TYPOGRAPHY_SCALE,
  TYPOGRAPHY_ROLES,
  type TypographyRole,
  type TypographyStyle,
} from "./theme/typographyTokens";
export {
  ANIMATION_PRESETS,
  DURATIONS_MS,
  EASINGS,
  transitionFor,
  type AnimationPreset,
  type AnimationPresetName,
  type DurationToken,
  type EasingToken,
} from "./theme/animationTokens";
export { Z_INDEX, Z_INDEX_ORDER, type ZIndexToken } from "./theme/zIndexTokens";
export {
  BREAKPOINTS,
  BREAKPOINT_ORDER,
  mediaQuery,
  resolveBreakpoint,
  type BreakpointToken,
} from "./theme/breakpoints";

// React bindings
export { ThemeProvider } from "./theme/ThemeProvider";
export { ThemeContext, useTheme, type ThemeContextValue } from "./theme/ThemeContext";

// Global UI primitives
export {
  PageContainer,
  SectionHeader,
  InstitutionalCard,
  GlassCard,
  MetricCard,
  DataCard,
  StatusBadge,
  MetricBadge,
  type StatusTone,
} from "./components";
