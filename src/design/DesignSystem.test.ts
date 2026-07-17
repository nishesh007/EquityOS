import { beforeEach, describe, expect, it } from "vitest";
import {
  ANIMATION_PRESETS,
  BREAKPOINTS,
  BREAKPOINT_ORDER,
  BUILT_IN_THEMES,
  COLOR_TOKEN_NAMES,
  DEFAULT_THEME_ID,
  DURATIONS_MS,
  RADIUS_SCALE,
  SHADOW_TOKEN_NAMES,
  SPACING_SCALE,
  SPACING_VALUES,
  TYPOGRAPHY_ROLES,
  TYPOGRAPHY_SCALE,
  Z_INDEX,
  Z_INDEX_ORDER,
  ThemeEngine,
  buildShadowTokens,
  contrastRatio,
  getDesignSystem,
  getTheme,
  getThemeEngine,
  getThemeTokens,
  isValidHexColor,
  mediaQuery,
  meetsContrastAA,
  resolveBreakpoint,
  setTheme,
  toggleTheme,
  transitionFor,
  type Theme,
} from "./index";

beforeEach(() => {
  // The engine is a process-local singleton — restore the default theme
  // so tests are order-independent.
  getThemeEngine().setTheme(DEFAULT_THEME_ID);
});

describe("theme switching", () => {
  it("defaults to Institutional Dark", () => {
    const theme = getTheme();
    expect(theme.id).toBe("institutional-dark");
    expect(theme.mode).toBe("dark");
    expect(theme.label).toBe("Institutional Dark");
  });

  it("switches the active theme via setTheme()", () => {
    expect(setTheme("midnight-blue")).toBe(true);
    expect(getTheme().id).toBe("midnight-blue");
    expect(setTheme("emerald")).toBe(true);
    expect(getTheme().id).toBe("emerald");
  });

  it("rejects unknown theme ids without changing the active theme", () => {
    expect(setTheme("does-not-exist")).toBe(false);
    expect(getTheme().id).toBe("institutional-dark");
  });

  it("toggles between dark and light institutional themes", () => {
    expect(getTheme().mode).toBe("dark");
    expect(toggleTheme().id).toBe("institutional-light");
    expect(toggleTheme().id).toBe("institutional-dark");
    // Toggling from any non-default dark theme still lands on light.
    setTheme("graphite");
    expect(toggleTheme().id).toBe("institutional-light");
  });

  it("notifies subscribers on change and supports unsubscribe", () => {
    const engine = new ThemeEngine();
    const seen: string[] = [];
    const unsubscribe = engine.subscribe((theme) => seen.push(theme.id));
    engine.setTheme("emerald");
    engine.setTheme("graphite");
    unsubscribe();
    engine.setTheme("midnight-blue");
    expect(seen).toEqual(["emerald", "graphite"]);
  });

  it("supports plugging in future themes without code changes", () => {
    const engine = new ThemeEngine();
    const custom: Theme = {
      id: "obsidian",
      label: "Obsidian",
      mode: "dark",
      colors: { ...BUILT_IN_THEMES[0].colors, accent: "#f472b6" },
    };
    engine.registerTheme(custom);
    expect(engine.hasTheme("obsidian")).toBe(true);
    expect(engine.setTheme("obsidian")).toBe(true);
    expect(engine.getTheme().colors.accent).toBe("#f472b6");
    // Registered theme compiles to CSS variables like any built-in.
    expect(engine.getCssVariables()["--eos-color-accent"]).toBe("244 114 182");
  });
});

describe("token consistency", () => {
  it("registers all eight built-in themes", () => {
    const ids = getThemeEngine()
      .listThemes()
      .map((theme) => theme.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "institutional-dark",
        "institutional-light",
        "bloomberg",
        "midnight-blue",
        "graphite",
        "emerald",
        "trading-desk",
        "carbon-black",
      ]),
    );
    expect(BUILT_IN_THEMES).toHaveLength(8);
  });

  it("gives every theme a complete palette of valid hex colors", () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const token of COLOR_TOKEN_NAMES) {
        const value = theme.colors[token];
        expect(value, `${theme.id}.${token}`).toBeDefined();
        expect(isValidHexColor(value), `${theme.id}.${token}=${value}`).toBe(true);
      }
    }
  });

  it("exposes exactly the sanctioned spacing scale", () => {
    expect(Object.values(SPACING_SCALE).sort((a, b) => a - b)).toEqual([
      ...SPACING_VALUES,
    ]);
    expect(SPACING_VALUES).toEqual([4, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
  });

  it("defines the full radius scale including pill", () => {
    expect(Object.keys(RADIUS_SCALE)).toEqual([
      "small",
      "medium",
      "large",
      "xl",
      "pill",
    ]);
    expect(RADIUS_SCALE.small).toBeLessThan(RADIUS_SCALE.medium);
    expect(RADIUS_SCALE.medium).toBeLessThan(RADIUS_SCALE.large);
    expect(RADIUS_SCALE.large).toBeLessThan(RADIUS_SCALE.xl);
    expect(RADIUS_SCALE.pill).toBeGreaterThanOrEqual(9999);
  });

  it("builds a complete elevation scale per mode, distinct between modes", () => {
    const dark = buildShadowTokens("dark");
    const light = buildShadowTokens("light");
    for (const token of SHADOW_TOKEN_NAMES) {
      expect(dark[token], `dark.${token}`).toBeTruthy();
      expect(light[token], `light.${token}`).toBeTruthy();
      expect(dark[token]).not.toBe(light[token]);
    }
  });

  it("defines all twelve institutional typography roles", () => {
    expect(TYPOGRAPHY_ROLES).toHaveLength(12);
    for (const role of TYPOGRAPHY_ROLES) {
      const style = TYPOGRAPHY_SCALE[role];
      expect(style.fontFamily).toBeTruthy();
      expect(style.fontSize).toMatch(/rem$/);
      expect(style.fontWeight).toBeGreaterThanOrEqual(400);
    }
  });

  it("uses tabular monospace styling for financial numerics", () => {
    expect(TYPOGRAPHY_SCALE.numeric.tabularNums).toBe(true);
    expect(TYPOGRAPHY_SCALE.table.tabularNums).toBe(true);
    expect(TYPOGRAPHY_SCALE.numeric.fontFamily).toContain("jetbrains");
    expect(TYPOGRAPHY_SCALE.monospace.fontFamily).toContain("jetbrains");
    expect(TYPOGRAPHY_SCALE.label.textTransform).toBe("uppercase");
  });

  it("keeps stacking layers strictly ascending", () => {
    const values = Z_INDEX_ORDER.map((token) => Z_INDEX[token]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
    expect(Z_INDEX.tooltip).toBeGreaterThan(Z_INDEX.modal);
  });

  it("compiles every color token to an RGB-triplet CSS variable", () => {
    for (const theme of BUILT_IN_THEMES) {
      const vars = getThemeEngine().getCssVariables(theme);
      for (const token of COLOR_TOKEN_NAMES) {
        const name = `--eos-color-${token.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
        expect(vars[name], `${theme.id} ${name}`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      }
    }
  });

  it("emits spacing, radius, duration, shadow and z-index CSS variables", () => {
    const vars = getThemeEngine().getCssVariables();
    expect(vars["--eos-space-lg"]).toBe("16px");
    expect(vars["--eos-radius-pill"]).toBe("9999px");
    expect(vars["--eos-duration-fast"]).toBe("120ms");
    expect(vars["--eos-shadow-card"]).toContain("rgba");
    expect(vars["--eos-z-modal"]).toBe(String(Z_INDEX.modal));
  });
});

describe("responsive behavior", () => {
  it("covers mobile through ultra-wide in ascending order", () => {
    expect(BREAKPOINT_ORDER).toEqual([
      "mobile",
      "tablet",
      "laptop",
      "desktop",
      "ultrawide",
    ]);
    const widths = BREAKPOINT_ORDER.map((token) => BREAKPOINTS[token]);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    }
  });

  it("resolves viewport widths to breakpoints, including boundaries", () => {
    expect(resolveBreakpoint(320)).toBe("mobile");
    expect(resolveBreakpoint(767)).toBe("mobile");
    expect(resolveBreakpoint(768)).toBe("tablet");
    expect(resolveBreakpoint(1024)).toBe("laptop");
    expect(resolveBreakpoint(1439)).toBe("laptop");
    expect(resolveBreakpoint(1440)).toBe("desktop");
    expect(resolveBreakpoint(1920)).toBe("ultrawide");
    expect(resolveBreakpoint(3840)).toBe("ultrawide");
  });

  it("falls back to mobile for invalid widths", () => {
    expect(resolveBreakpoint(-100)).toBe("mobile");
    expect(resolveBreakpoint(Number.NaN)).toBe("mobile");
    expect(resolveBreakpoint(Number.POSITIVE_INFINITY)).toBe("ultrawide");
  });

  it("produces min-width media queries from tokens", () => {
    expect(mediaQuery("tablet")).toBe("(min-width: 768px)");
    expect(mediaQuery("ultrawide")).toBe("(min-width: 1920px)");
  });
});

describe("accessibility", () => {
  it("primary text meets AA contrast on background, surface and card in every theme", () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const layer of ["background", "surface", "card"] as const) {
        expect(
          meetsContrastAA(theme.colors.textPrimary, theme.colors[layer]),
          `${theme.id}: textPrimary on ${layer}`,
        ).toBe(true);
      }
    }
  });

  it("secondary and muted text remain readable in every theme", () => {
    for (const theme of BUILT_IN_THEMES) {
      expect(
        meetsContrastAA(theme.colors.textSecondary, theme.colors.background),
        `${theme.id}: textSecondary`,
      ).toBe(true);
      expect(
        contrastRatio(theme.colors.textMuted, theme.colors.background),
        `${theme.id}: textMuted`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("status and accent colors meet UI contrast (3.0) on the app background", () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const token of ["accent", "success", "danger", "warning", "info"] as const) {
        expect(
          meetsContrastAA(theme.colors[token], theme.colors.background, "ui"),
          `${theme.id}: ${token}`,
        ).toBe(true);
      }
    }
  });

  it("motion presets reference duration tokens only", () => {
    for (const preset of Object.values(ANIMATION_PRESETS)) {
      expect(Object.keys(DURATIONS_MS)).toContain(preset.duration);
      expect(preset.properties.length).toBeGreaterThan(0);
    }
    // Compiled transitions use the tokenized millisecond values.
    expect(transitionFor("hover")).toContain(`${DURATIONS_MS.fast}ms`);
    expect(transitionFor("skeleton")).toContain(`${DURATIONS_MS.skeleton}ms`);
  });
});

describe("regression", () => {
  it("preserves the legacy terminal palette in Institutional Dark", () => {
    const dark = BUILT_IN_THEMES.find((theme) => theme.id === "institutional-dark")!;
    expect(dark.colors.background).toBe("#0c0c10");
    expect(dark.colors.surface).toBe("#111116");
    expect(dark.colors.accent).toBe("#3b82f6");
    expect(dark.colors.success).toBe("#22c55e");
    expect(dark.colors.danger).toBe("#ef4444");
    expect(dark.colors.textPrimary).toBe("#f4f4f5");
    expect(dark.colors.textSecondary).toBe("#a1a1aa");
    expect(buildShadowTokens("dark").card).toBe(
      "0 0 0 1px rgba(255, 255, 255, 0.04), 0 4px 24px rgba(0, 0, 0, 0.4)",
    );
  });

  it("getThemeTokens() follows the active theme", () => {
    expect(getThemeTokens().themeId).toBe("institutional-dark");
    setTheme("institutional-light");
    const tokens = getThemeTokens();
    expect(tokens.themeId).toBe("institutional-light");
    expect(tokens.mode).toBe("light");
    expect(tokens.colors.background).toBe("#f6f7f9");
    expect(tokens.shadows.card).toBe(buildShadowTokens("light").card);
  });

  it("getDesignSystem() exposes a frozen aggregate of every token family", () => {
    const system = getDesignSystem();
    expect(Object.isFrozen(system)).toBe(true);
    expect(system.themes).toHaveLength(8);
    expect(system.defaultThemeId).toBe("institutional-dark");
    expect(system.spacing).toBe(SPACING_SCALE);
    expect(system.radius).toBe(RADIUS_SCALE);
    expect(system.typography).toBe(TYPOGRAPHY_SCALE);
    expect(system.zIndex).toBe(Z_INDEX);
    expect(system.breakpoints).toBe(BREAKPOINTS);
  });

  it("keeps theme palettes immutable at runtime", () => {
    const theme = getTheme();
    expect(Object.isFrozen(theme)).toBe(true);
    expect(Object.isFrozen(theme.colors)).toBe(true);
    expect(() => {
      (theme.colors as unknown as Record<string, string>).accent = "#000000";
    }).toThrow();
  });
});
