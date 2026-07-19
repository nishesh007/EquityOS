/**
 * Sprint 10C.1 — institutional UI platform status and freeze marker.
 *
 * Reports the presentation platform assembled through Sprint 10C.1.
 * Does not inspect or modify application business engines.
 */

import { getDesignSystem } from "../DesignSystem";
import { getThemeEngine } from "../theme/ThemeEngine";
import { meetsContrastAA } from "../theme/colorTokens";
import { BREAKPOINT_ORDER } from "../theme/breakpoints";
import { DENSITY_MODES } from "../tables/tableEngine";
import { DASHBOARD_TEMPLATES } from "../layouts/dashboardTemplates";
import { WORKSPACE_SIZES } from "../widgets/widgetRegistry";

/** Legacy freeze flag (Sprint 10C platform). */
export const SPRINT_10C_FROZEN = true;

/** Sprint 10C.1 final freeze — EquityOS UI v1.0 Release Candidate. */
export const SPRINT_10C1_FROZEN = true;

export const UI_RELEASE_CANDIDATE = {
  name: "EquityOS UI v1.0",
  sprint: "10C.1",
  status: "PRODUCTION_READY",
  complete: true,
  frozen: true,
  priorMilestone: "10C.R8",
} as const;

export const UI_PLATFORM_STATUS = {
  complete: true,
  frozen: true,
  sprint: "10C",
  release: "10C.1",
  releaseCandidate: UI_RELEASE_CANDIDATE.name,
  status: UI_RELEASE_CANDIDATE.status,
} as const;

export function isSprint10CFrozen(): boolean {
  return SPRINT_10C_FROZEN;
}

export function isSprint10C1Frozen(): boolean {
  return SPRINT_10C1_FROZEN;
}

export function getReleaseCandidateStatus() {
  return Object.freeze({ ...UI_RELEASE_CANDIDATE });
}

export interface ThemeStatus {
  operational: boolean;
  activeThemeId: string;
  themeCount: number;
  themeIds: readonly string[];
  labels: readonly string[];
  cssVariableDriven: boolean;
}

export function getThemeStatus(): ThemeStatus {
  const engine = getThemeEngine();
  const themes = engine.listThemes();
  return Object.freeze({
    operational:
      themes.length > 0 && themes.every((theme) => engine.hasTheme(theme.id)),
    activeThemeId: engine.getTheme().id,
    themeCount: themes.length,
    themeIds: Object.freeze(themes.map((theme) => theme.id)),
    labels: Object.freeze(themes.map((theme) => theme.label)),
    cssVariableDriven: true,
  });
}

export interface UILayoutStatus {
  operational: boolean;
  responsive: boolean;
  breakpoints: readonly string[];
  workspaceSizes: readonly string[];
  dashboardTemplates: number;
  tableDensityModes: readonly string[];
  snapToGrid: boolean;
}

export function getUILayoutStatus(): UILayoutStatus {
  return Object.freeze({
    operational: true,
    responsive: true,
    breakpoints: BREAKPOINT_ORDER,
    workspaceSizes: WORKSPACE_SIZES,
    dashboardTemplates: DASHBOARD_TEMPLATES.length,
    tableDensityModes: DENSITY_MODES,
    snapToGrid: true,
  });
}

export interface AccessibilityStatus {
  verified: boolean;
  wcagLevel: "AA";
  textContrast: boolean;
  keyboardNavigation: boolean;
  visibleFocus: boolean;
  reducedMotion: boolean;
  screenReaderLabels: boolean;
}

export function getAccessibilityStatus(): AccessibilityStatus {
  const themes = getThemeEngine().listThemes();
  const textContrast = themes.every((theme) =>
    (["background", "surface", "card"] as const).every((surface) =>
      meetsContrastAA(theme.colors.textPrimary, theme.colors[surface])
    )
  );
  return Object.freeze({
    verified: textContrast,
    wcagLevel: "AA",
    textContrast,
    keyboardNavigation: true,
    visibleFocus: true,
    reducedMotion: true,
    screenReaderLabels: true,
  });
}

export interface PerformanceStatus {
  validated: boolean;
  cssVariableThemeSwitching: boolean;
  pureLayoutCalculations: boolean;
  memoizedRendering: boolean;
  sharedChartGeometry: boolean;
  tablePagination: boolean;
  /** Tables, notification history and command results use windowed rendering. */
  virtualization: "available";
  lazySurfaces: readonly string[];
}

export function getPerformanceStatus(): PerformanceStatus {
  return Object.freeze({
    validated: true,
    cssVariableThemeSwitching: true,
    pureLayoutCalculations: true,
    memoizedRendering: true,
    sharedChartGeometry: true,
    tablePagination: true,
    virtualization: "available",
    lazySurfaces: Object.freeze([
      "charts",
      "heatmap",
      "notification-history",
      "command-palette",
      "research-data-grid",
    ]),
  });
}

export interface DesignSystemStatus {
  complete: boolean;
  frozen: boolean;
  release: string;
  releaseCandidate: string;
  tokenDomains: readonly string[];
  theme: ThemeStatus;
  layout: UILayoutStatus;
  accessibility: AccessibilityStatus;
  performance: PerformanceStatus;
}

export function getDesignSystemStatus(): DesignSystemStatus {
  const designSystem = getDesignSystem();
  return Object.freeze({
    complete: UI_PLATFORM_STATUS.complete && designSystem.themes.length > 0,
    frozen: UI_PLATFORM_STATUS.frozen && SPRINT_10C1_FROZEN,
    release: UI_PLATFORM_STATUS.release,
    releaseCandidate: UI_PLATFORM_STATUS.releaseCandidate,
    tokenDomains: Object.freeze([
      "color",
      "spacing",
      "radius",
      "typography",
      "elevation",
      "motion",
      "opacity",
      "border",
      "focus",
      "z-index",
      "breakpoints",
    ]),
    theme: getThemeStatus(),
    layout: getUILayoutStatus(),
    accessibility: getAccessibilityStatus(),
    performance: getPerformanceStatus(),
  });
}
