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
  SectionDivider,
  AccentContainer,
  InstitutionalCard,
  GlassCard,
  MetricCard,
  DataCard,
  StatusBadge,
  statusToneFromLabel,
  MetricBadge,
  type StatusTone,
} from "./components";

// Layout / grid system
export {
  DashboardGrid,
  GridItem,
  MainGrid,
  GRID_COLUMN_OPTIONS,
  GRID_COLUMN_CLASSES,
  GRID_SPAN_CLASSES,
  GRID_GAP_CLASSES,
  GRID_GAP_PX,
  MAIN_GRID_SPLIT,
  resolveGridColumns,
  getDashboardGrid,
  TABLE_CLASSES,
  TABLE_CLASS_TOKENS,
  type GridColumns,
  type GridGap,
  type DashboardGridConfig,
  type TableClassToken,
} from "./layout";

// Widget framework
export {
  Widget,
  WidgetEmptyState,
  WidgetSkeleton,
  WIDGET_SIZES,
  WIDGET_SIZE_SPECS,
  resolveWidgetSize,
  type WidgetProps,
  type WidgetSize,
  type WidgetSizeSpec,
} from "./widgets";

// Dashboard layout registry
export {
  DASHBOARD_REGIONS,
  PRIORITY_RANK,
  getDashboardLayout,
  getWidgetLayout,
  sortByHierarchy,
  type DashboardLayout,
  type DashboardRegion,
  type WidgetLayout,
  type WidgetPriority,
} from "./dashboard";

// Visualization math (pure) + public APIs
export {
  getVisualizationTheme,
  renderSparkline,
  renderGauge,
  renderHeatmap,
  renderAllocationChart,
  renderProgressWidget,
  classifyBand,
  describeArc,
  CONVICTION_BANDS,
  RISK_BANDS,
  GAUGE_START_ANGLE,
  GAUGE_END_ANGLE,
  GAUGE_SWEEP,
  type VisualizationTheme,
  type SparklineRender,
  type SparklineOptions,
  type TrendDirection,
  type GaugeBand,
  type GaugeRender,
  type HeatmapCell,
  type HeatmapCellInput,
  type HeatmapOptions,
  type HeatmapRender,
  type AllocationRender,
  type AllocationSegment,
  type AllocationSliceInput,
  type AllocationOptions,
  type ProgressRender,
  type ProgressOptions,
  type ProgressVariant,
} from "./visualizations";

// Charts
export {
  Sparkline,
  GaugeChart,
  AllocationRing,
  Heatmap,
  ProgressBar,
  ProgressRing,
  ScoreDistribution,
  TimelineChart,
  CHART_SERIES_COLORS,
  CHART_COLORS,
  TONE_TEXT_CLASS,
  TONE_STROKE_COLOR,
  type ChartTone,
  type ScoreBucket,
  type TimelineEvent,
} from "./charts";

// Advanced widgets
export {
  KpiTile,
  ConvictionMeter,
  RiskGauge,
  HeatMeter,
  StatusIndicator,
  WidgetToolbar,
  type IndicatorState,
  type WidgetToolbarProps,
} from "./widgets";

// Institutional table framework (Sprint 10C.R4)
export {
  createInstitutionalTable,
  registerColumn,
  processTable,
  sortRows,
  searchRows,
  filterRows,
  paginateRows,
  visibleColumns,
  columnValue,
  toggleColumnVisibility,
  moveColumn,
  setColumnWidth,
  resetTableLayout,
  moveFocus,
  toCsv,
  cycleDensity,
  isColumnSearchable,
  defaultColumnAlign,
  saveTablePreferences,
  restoreTablePreferences,
  clearTablePreferences,
  applyTablePreferences,
  tablePreferencesFromState,
  InstitutionalTable,
  DENSITY_MODES,
  DENSITY_LABELS,
  DENSITY_CELL_CLASSES,
  NUMERIC_CELL_KINDS,
  type BulkAction,
  type CellKind,
  type CellAlign,
  type CellPosition,
  type DensityMode,
  type InstitutionalTableConfig,
  type InstitutionalTableDef,
  type ProcessedTable,
  type SortDirection,
  type TableColumn,
  type TableState,
  type TablePreferences,
} from "./tables";

// Institutional cell rendering (Sprint 10C.R4)
export {
  renderCell,
  CellRenderer,
  CELL_TONE_TEXT_CLASS,
  CELL_TONE_PILL_CLASS,
  type CellTone,
  type RenderedCell,
  type RenderCellOptions,
} from "./cells";

// Table toolbars (Sprint 10C.R4)
export { TableToolbar } from "./toolbars";

// Premium themes, accent engine and appearance tokens (Sprint 10C.R5)
export {
  PREMIUM_THEMES,
  ACCENT_COLORS,
  getAccentColorById,
  resolveAccentVariables,
  setAccentColor,
  getAccentColor,
  subscribeAccent,
  hydrateAccentFromStorage,
  ACCENT_STORAGE_KEY,
  STATUS_COLORS,
  STATUS_COLOR_ROLES,
  ELEVATION_SHADOWS,
  ELEVATION_ORDER,
  RADIUS_ALIASES,
  ICON_SIZES,
  ICON_STROKE_WIDTHS,
  UI_DENSITIES,
  getUiDensity,
  setUiDensity,
  hydrateDensityFromStorage,
  type AccentColor,
  type AccentColorId,
  type StatusColorRole,
  type StatusColorSpec,
  type ElevationToken,
  type RadiusAlias,
  type IconSizeToken,
  type UiDensity,
} from "./themes";

// Motion system (Sprint 10C.R5)
export {
  MOTION_PREFERENCES,
  MOTION_CLASSES,
  MOTION_PRESET_NAMES,
  getMotionPreference,
  setMotionPreference,
  hydrateMotionFromStorage,
  resolveEffectiveMotion,
  CountUp,
  type MotionPreference,
  type MotionPresetName,
} from "./motion";

// Typography system (Sprint 10C.R5)
export {
  TYPE_SCALE,
  TYPE_CLASSES,
  TYPE_VARIANTS,
  FONT_SCALES,
  FONT_SCALE_LABELS,
  FONT_SCALE_ROOT_PX,
  getFontScale,
  setFontScale,
  hydrateFontScaleFromStorage,
  Text,
  type TypeVariant,
  type FontScale,
} from "./typography";

// Glassmorphism (Sprint 10C.R5)
export {
  GLASS_SURFACE,
  GLASS_CLASSES,
  GLASS_SURFACE_TOKENS,
  GlassPanel,
  GlassToolbar,
  GlassModal,
  GlassDropdown,
  GlassSidebar,
  GlassTooltip,
  GlassBadge,
  type GlassSurfaceToken,
} from "./glass";

// Skeleton loaders (Sprint 10C.R5)
export { Skeleton, type SkeletonVariant } from "./components/Skeleton";

// Workspace engine + customizable dashboard (Sprint 10C.R6)
export {
  createWorkspace,
  saveWorkspace,
  loadWorkspace,
  listWorkspaces,
  loadWorkspaceStore,
  saveWorkspaceStore,
  getActiveWorkspace,
  setActiveWorkspace,
  getDefaultWorkspace,
  duplicateWorkspace,
  renameWorkspace,
  deleteWorkspace,
  resetWorkspace,
  applyTemplate,
  exportWorkspace,
  importWorkspace,
  moveWidget,
  swapWidgets,
  resizeWidget,
  setWidgetVisible,
  setWidgetPinned,
  setWidgetCollapsed,
  hiddenWidgets,
  restoreHiddenWidgets,
  addWidgetToWorkspace,
  removeWidgetFromWorkspace,
  placementsForRegion,
  WORKSPACE_SHORTCUTS,
  matchShortcut,
  WorkspaceDashboard,
  type Workspace,
  type WorkspaceStore,
  type WorkspaceStorage,
  type WorkspaceExport,
  type WorkspaceShortcut,
  type WorkspaceShortcutId,
  type ShortcutKeyEvent,
} from "./workspace";

// Dockable widget registry (Sprint 10C.R6)
export {
  WORKSPACE_REGIONS,
  WORKSPACE_SIZES,
  WORKSPACE_SIZE_SPANS,
  WORKSPACE_SIZE_LABELS,
  sizeFromSpan,
  registerWidget,
  getWidgetDefinition,
  listWidgetDefinitions,
  searchWidgets,
  type WorkspaceRegion,
  type WorkspaceSize,
  type WidgetCategory,
  type WidgetDefinition,
} from "./widgets";

// Dashboard templates (Sprint 10C.R6)
export {
  DASHBOARD_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  searchTemplates,
  type DashboardTemplate,
  type WidgetPlacement,
} from "./layouts";

// Command palette & global search (Sprint 10C.R7)
export {
  fuzzyScore,
  fuzzyScoreAll,
  registerCommand,
  registerQuickAction,
  registerSearchProvider,
  unregisterSearchProvider,
  searchEverything,
  listCommands,
  getCommand,
  COMMAND_CATEGORY_LABELS,
  GLOBAL_SHORTCUTS,
  matchGlobalShortcut,
  emitUiEvent,
  onUiEvent,
  openCommandPalette,
  showNotificationCenter,
  showShortcutHelp,
  showHelpCenter,
  CommandPalette,
  TerminalExperience,
  type CommandCategory,
  type CommandItem,
  type SearchResult,
  type SearchProvider,
  type GlobalShortcut,
  type GlobalShortcutId,
  type GlobalKeyEvent,
  type UiEventName,
} from "./command";

// Navigation: breadcrumbs, transitions, status bar (Sprint 10C.R7)
export {
  getBreadcrumbs,
  Breadcrumbs,
  PageTransition,
  StatusBar,
  APP_VERSION,
  getMarketSession,
  type Breadcrumb,
  type MarketSession,
} from "./navigation";

// Productivity: notifications, activity, recents (Sprint 10C.R7)
export {
  recordRecent,
  getRecents,
  clearRecents,
  toggleFavorite,
  isFavorite,
  getFavorites,
  pushNotification,
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  pinNotification,
  dismissNotification,
  clearNotifications,
  subscribeNotifications,
  recordActivity,
  getActivityFeed,
  clearActivityFeed,
  NOTIFICATION_CATEGORIES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  NotificationCenter,
  SmartEmptyState,
  ContextMenu,
  FloatingActionMenu,
  type RecentItem,
  type RecentKind,
  type FavoriteItem,
  type AppNotification,
  type NotificationCategory,
  type ActivityCategory,
  type ActivityEvent,
  type SmartEmptyStateProps,
  type EmptyStateAction,
  type ContextMenuItem,
  type ContextMenuProps,
} from "./productivity";

// Help center, onboarding & rich tooltips (Sprint 10C.R7)
export {
  getShortcutGroups,
  GLOSSARY,
  GUIDES,
  FAQ,
  RELEASE_NOTES,
  ONBOARDING_STEPS,
  shouldShowOnboarding,
  dismissOnboarding,
  resetOnboarding,
  HelpCenter,
  OnboardingTour,
  RichTooltip,
  type HelpShortcutGroup,
  type GlossaryEntry,
  type HelpGuide,
  type FaqEntry,
  type ReleaseNote,
  type OnboardingStep,
  type RichTooltipProps,
} from "./help";

// Final UI platform integration status and Sprint 10C freeze (R8)
export {
  SPRINT_10C_FROZEN,
  UI_PLATFORM_STATUS,
  isSprint10CFrozen,
  getDesignSystemStatus,
  getThemeStatus,
  getUILayoutStatus,
  getAccessibilityStatus,
  getPerformanceStatus,
  type DesignSystemStatus,
  type ThemeStatus,
  type UILayoutStatus,
  type AccessibilityStatus,
  type PerformanceStatus,
} from "./status";
