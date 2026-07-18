/**
 * Sprint 10C.R8 — final institutional UI integration and freeze tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  ANIMATION_PRESETS,
  BREAKPOINT_ORDER,
  BUILT_IN_THEMES,
  COLOR_TOKEN_NAMES,
  DASHBOARD_TEMPLATES,
  DENSITY_MODES,
  ELEVATION_ORDER,
  ELEVATION_SHADOWS,
  InstitutionalCard,
  InstitutionalTable,
  MetricCard,
  PageContainer,
  RADIUS_SCALE,
  SPACING_VALUES,
  SPRINT_10C_FROZEN,
  SectionHeader,
  TYPE_VARIANTS,
  TYPOGRAPHY_ROLES,
  UI_PLATFORM_STATUS,
  WIDGET_SIZES,
  WORKSPACE_SIZE_SPANS,
  WORKSPACE_SIZES,
  Widget,
  WidgetToolbar,
  createInstitutionalTable,
  getAccessibilityStatus,
  getDesignSystem,
  getDesignSystemStatus,
  getPerformanceStatus,
  getThemeEngine,
  getThemeStatus,
  getUILayoutStatus,
  isSprint10CFrozen,
  meetsContrastAA,
  processTable,
  renderGauge,
  renderSparkline,
  resolveBreakpoint,
  resolveWidgetSize,
} from "./index";
import { DEFAULT_THEME_ID } from "./theme/themeTokens";

beforeEach(() => {
  getThemeEngine().setTheme(DEFAULT_THEME_ID);
});

describe("Sprint 10C.R8 — platform freeze", () => {
  it("freezes Sprint 10C through the public constant and API", () => {
    expect(SPRINT_10C_FROZEN).toBe(true);
    expect(isSprint10CFrozen()).toBe(true);
  });

  it("marks the UI platform complete and frozen", () => {
    expect(UI_PLATFORM_STATUS).toMatchObject({
      complete: true,
      frozen: true,
      sprint: "10C",
      release: "10C.R8",
    });
  });

  it("publishes an immutable aggregate status", () => {
    const status = getDesignSystemStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status).toMatchObject({ complete: true, frozen: true, release: "10C.R8" });
  });
});

describe("Sprint 10C.R8 — themes and accessibility", () => {
  it("reports the canonical eight-theme catalog", () => {
    const status = getThemeStatus();
    expect(status.themeCount).toBe(8);
    expect(status.themeIds).toEqual(BUILT_IN_THEMES.map((theme) => theme.id));
  });

  it("activates every registered theme without losing registration", () => {
    const engine = getThemeEngine();
    for (const theme of BUILT_IN_THEMES) {
      expect(engine.setTheme(theme.id)).toBe(true);
      expect(engine.getTheme().id).toBe(theme.id);
    }
    expect(engine.listThemes()).toHaveLength(8);
  });

  it("compiles every semantic color into CSS variables for every theme", () => {
    const engine = getThemeEngine();
    for (const theme of BUILT_IN_THEMES) {
      const variables = engine.getCssVariables(theme);
      for (const token of COLOR_TOKEN_NAMES) {
        const cssName = token.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        expect(variables[`--eos-color-${cssName}`]).toBeTruthy();
      }
    }
  });

  it("meets AA primary-text contrast across every surface and theme", () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const surface of ["background", "surface", "card"] as const) {
        expect(
          meetsContrastAA(theme.colors.textPrimary, theme.colors[surface]),
          `${theme.id}: textPrimary on ${surface}`,
        ).toBe(true);
      }
    }
    expect(getAccessibilityStatus().textContrast).toBe(true);
  });

  it("reports keyboard, focus, reduced-motion and screen-reader support", () => {
    expect(getAccessibilityStatus()).toMatchObject({
      verified: true,
      wcagLevel: "AA",
      keyboardNavigation: true,
      visibleFocus: true,
      reducedMotion: true,
      screenReaderLabels: true,
    });
  });
});

describe("Sprint 10C.R8 — responsive layouts", () => {
  it("covers mobile through ultrawide in canonical order", () => {
    expect(getUILayoutStatus().breakpoints).toEqual(BREAKPOINT_ORDER);
    expect(BREAKPOINT_ORDER).toEqual([
      "mobile",
      "tablet",
      "laptop",
      "desktop",
      "ultrawide",
    ]);
  });

  it("resolves representative responsive viewport widths", () => {
    expect(resolveBreakpoint(375)).toBe("mobile");
    expect(resolveBreakpoint(768)).toBe("tablet");
    expect(resolveBreakpoint(1024)).toBe("laptop");
    expect(resolveBreakpoint(1440)).toBe("desktop");
    expect(resolveBreakpoint(2560)).toBe("ultrawide");
  });

  it("reports all dashboard templates and snap-to-grid sizes", () => {
    const status = getUILayoutStatus();
    expect(status.dashboardTemplates).toBe(DASHBOARD_TEMPLATES.length);
    expect(status.dashboardTemplates).toBe(8);
    expect(status.workspaceSizes).toEqual(WORKSPACE_SIZES);
    expect(status.snapToGrid).toBe(true);
  });

  it("keeps every workspace span inside the 12-column grid", () => {
    for (const size of WORKSPACE_SIZES) {
      expect(WORKSPACE_SIZE_SPANS[size]).toBeGreaterThanOrEqual(1);
      expect(WORKSPACE_SIZE_SPANS[size]).toBeLessThanOrEqual(12);
    }
  });
});

describe("Sprint 10C.R8 — institutional primitives", () => {
  it("exports the canonical page and section primitives", () => {
    expect(PageContainer).toBeTypeOf("function");
    expect(SectionHeader).toBeTypeOf("function");
    expect(InstitutionalCard).toBeTypeOf("function");
    expect(MetricCard).toBeTypeOf("function");
  });

  it("exports the institutional table and widget primitives", () => {
    expect(InstitutionalTable).toBeTypeOf("function");
    expect(Widget).toBeTypeOf("function");
    expect(WidgetToolbar).toBeTypeOf("function");
  });

  it("keeps one canonical typography role for every hierarchy level", () => {
    expect(TYPOGRAPHY_ROLES).toHaveLength(12);
    expect(new Set(TYPOGRAPHY_ROLES).size).toBe(TYPOGRAPHY_ROLES.length);
    expect(TYPE_VARIANTS).toContain("metric");
    expect(TYPE_VARIANTS).toContain("mono");
  });

  it("keeps spacing and radius scales ordered and tokenized", () => {
    expect(SPACING_VALUES).toEqual([...SPACING_VALUES].sort((a, b) => a - b));
    expect(RADIUS_SCALE.small).toBeLessThan(RADIUS_SCALE.medium);
    expect(RADIUS_SCALE.medium).toBeLessThan(RADIUS_SCALE.large);
    expect(RADIUS_SCALE.large).toBeLessThan(RADIUS_SCALE.xl);
  });

  it("defines every institutional elevation token", () => {
    expect(ELEVATION_ORDER).toHaveLength(8);
    for (const token of ELEVATION_ORDER) {
      expect(ELEVATION_SHADOWS[token]).toBeTruthy();
    }
  });
});

describe("Sprint 10C.R8 — tables, widgets and charts", () => {
  it("keeps all three institutional table densities operational", () => {
    expect(DENSITY_MODES).toEqual(["comfortable", "compact", "ultra"]);
    expect(getUILayoutStatus().tableDensityModes).toEqual(DENSITY_MODES);
  });

  it("processes an institutional table without mutating rows", () => {
    const rows = [
      { symbol: "TCS", score: 84 },
      { symbol: "INFY", score: 78 },
    ];
    const snapshot = JSON.stringify(rows);
    const table = createInstitutionalTable<(typeof rows)[number]>({
      id: "r8-integration",
      columns: [
        { id: "symbol", label: "Symbol", kind: "text" },
        { id: "score", label: "Score", kind: "number" },
      ],
      defaultSort: { columnId: "score", direction: "desc" },
    });
    const result = processTable(table, rows, table.defaultState);
    expect(result.rows.map((row) => row.symbol)).toEqual(["TCS", "INFY"]);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it("resolves every widget size within available grid columns", () => {
    for (const size of WIDGET_SIZES) {
      expect(resolveWidgetSize(size, 4).span).toBeLessThanOrEqual(4);
    }
  });

  it("renders shared sparkline geometry without invalid values", () => {
    const render = renderSparkline([10, 12, 11, 15, 14]);
    expect(render.path).not.toContain("NaN");
    expect(render.path.match(/[ML]/g)).toHaveLength(5);
  });

  it("renders shared gauge geometry without invalid values", () => {
    const render = renderGauge(72);
    expect(render.value).toBe(72);
    expect(render.needleAngle).toBeTypeOf("number");
    expect(Number.isFinite(render.needleAngle)).toBe(true);
  });
});

describe("Sprint 10C.R8 — consistency and performance", () => {
  it("aggregates every shared token domain from one design system", () => {
    const system = getDesignSystem();
    expect(system.themes).toHaveLength(8);
    expect(system.spacing).toBeDefined();
    expect(system.radius).toBeDefined();
    expect(system.typography).toBeDefined();
    expect(system.animations).toBe(ANIMATION_PRESETS);
  });

  it("reports shared calculations and rendering paths as validated", () => {
    expect(getPerformanceStatus()).toEqual({
      validated: true,
      cssVariableThemeSwitching: true,
      pureLayoutCalculations: true,
      memoizedRendering: true,
      sharedChartGeometry: true,
      tablePagination: true,
      virtualization: "not-required",
    });
  });

  it("keeps repeated layout and chart calculations within an integration budget", () => {
    const start = performance.now();
    for (let i = 0; i < 2_000; i += 1) {
      resolveBreakpoint(i);
      resolveWidgetSize(WIDGET_SIZES[i % WIDGET_SIZES.length], 4);
      renderSparkline([i, i + 1, i - 1, i + 2]);
    }
    expect(performance.now() - start).toBeLessThan(500);
  });
});
