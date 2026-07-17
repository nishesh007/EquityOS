/** Sprint 10C.R5 — premium themes, accent engine and appearance tokens. */

export {
  bloomberg,
  tradingDesk,
  carbonBlack,
  PREMIUM_THEMES,
} from "./premiumThemes";

export {
  ACCENT_COLORS,
  getAccentColorById,
  resolveAccentVariables,
  type AccentColor,
  type AccentColorId,
} from "./accentColors";

export {
  setAccentColor,
  getAccentColor,
  subscribeAccent,
  hydrateAccentFromStorage,
  resetAccentForTests,
  ACCENT_STORAGE_KEY,
} from "./accentEngine";

export {
  STATUS_COLORS,
  STATUS_COLOR_ROLES,
  type StatusColorRole,
  type StatusColorSpec,
} from "./statusColors";

export {
  ELEVATION_SHADOWS,
  ELEVATION_ORDER,
  RADIUS_ALIASES,
  ICON_SIZES,
  ICON_STROKE_WIDTHS,
  type ElevationToken,
  type RadiusAlias,
  type IconSizeToken,
} from "./elevationTokens";

export {
  UI_DENSITIES,
  DENSITY_STORAGE_KEY,
  getUiDensity,
  setUiDensity,
  hydrateDensityFromStorage,
  type UiDensity,
} from "./uiDensity";
