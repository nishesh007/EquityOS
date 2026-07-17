/**
 * Sprint 10C.R5 — premium theme pack, accent engine, typography, glass,
 * motion, elevation and appearance preference tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  ACCENT_COLORS,
  BUILT_IN_THEMES,
  DEFAULT_THEME_ID,
  ELEVATION_ORDER,
  ELEVATION_SHADOWS,
  FONT_SCALES,
  FONT_SCALE_ROOT_PX,
  GLASS_CLASSES,
  GLASS_SURFACE,
  GLASS_SURFACE_TOKENS,
  ICON_SIZES,
  ICON_STROKE_WIDTHS,
  MOTION_CLASSES,
  MOTION_PREFERENCES,
  PREMIUM_THEMES,
  RADIUS_ALIASES,
  STATUS_COLORS,
  STATUS_COLOR_ROLES,
  TYPE_CLASSES,
  TYPE_SCALE,
  TYPE_VARIANTS,
  UI_DENSITIES,
  contrastRatio,
  getAccentColor,
  getAccentColorById,
  getFontScale,
  getMotionPreference,
  getThemeEngine,
  getUiDensity,
  isValidHexColor,
  meetsContrastAA,
  resolveAccentVariables,
  resolveEffectiveMotion,
  setAccentColor,
  setFontScale,
  setMotionPreference,
  setUiDensity,
  subscribeAccent,
  toggleTheme,
} from "./index";
import { resetAccentForTests } from "./themes/accentEngine";

beforeEach(() => {
  getThemeEngine().setTheme(DEFAULT_THEME_ID);
  resetAccentForTests();
  setMotionPreference("system");
  setFontScale("medium");
  setUiDensity("comfortable");
});

describe("premium theme pack", () => {
  it("registers Bloomberg, Trading Desk and Carbon Black (8 themes total)", () => {
    expect(BUILT_IN_THEMES).toHaveLength(8);
    const ids = BUILT_IN_THEMES.map((theme) => theme.id);
    expect(ids).toEqual(
      expect.arrayContaining(["bloomberg", "trading-desk", "carbon-black"])
    );
    expect(PREMIUM_THEMES.map((theme) => theme.label)).toEqual([
      "Bloomberg",
      "Trading Desk",
      "Carbon Black",
    ]);
  });

  it("premium themes pass AA text contrast on every surface layer", () => {
    for (const theme of PREMIUM_THEMES) {
      for (const layer of ["background", "surface", "card"] as const) {
        expect(
          meetsContrastAA(theme.colors.textPrimary, theme.colors[layer]),
          `${theme.id}: textPrimary on ${layer}`
        ).toBe(true);
      }
      expect(
        contrastRatio(theme.colors.textMuted, theme.colors.background),
        `${theme.id}: textMuted`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("premium theme status and accent colors meet UI contrast (3.0)", () => {
    for (const theme of PREMIUM_THEMES) {
      for (const token of ["accent", "success", "danger", "warning", "info"] as const) {
        expect(
          contrastRatio(theme.colors[token], theme.colors.background),
          `${theme.id}.${token}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("premium themes activate and compile to CSS variables", () => {
    const engine = getThemeEngine();
    expect(engine.setTheme("bloomberg")).toBe(true);
    expect(engine.getCssVariables()["--eos-color-accent"]).toBe("251 146 60");
    expect(engine.setTheme("carbon-black")).toBe(true);
    expect(engine.getCssVariables()["--eos-color-background"]).toBe("0 0 0");
  });

  it("toggleTheme returns to Institutional Light from any premium dark theme", () => {
    getThemeEngine().setTheme("trading-desk");
    expect(toggleTheme().id).toBe("institutional-light");
  });
});

describe("accent color engine", () => {
  it("catalogs the six required accents with valid palettes", () => {
    expect(ACCENT_COLORS.map((accent) => accent.id)).toEqual([
      "blue",
      "emerald",
      "purple",
      "amber",
      "cyan",
      "red",
    ]);
    for (const accent of ACCENT_COLORS) {
      expect(isValidHexColor(accent.accent), accent.id).toBe(true);
      expect(isValidHexColor(accent.accentMuted), accent.id).toBe(true);
    }
  });

  it("resolves accents into the shared CSS variables", () => {
    const purple = getAccentColorById("purple");
    expect(purple).not.toBeNull();
    const vars = resolveAccentVariables(purple!);
    expect(vars["--eos-color-accent"]).toBe("167 139 250");
    expect(Object.keys(vars)).toEqual(
      expect.arrayContaining([
        "--eos-color-accent",
        "--eos-color-accent-muted",
        "--eos-color-primary",
      ])
    );
  });

  it("setAccentColor()/getAccentColor() round-trip and reject unknown ids", () => {
    expect(getAccentColor()).toBeNull();
    expect(setAccentColor("neon-pink")).toBe(false);
    expect(setAccentColor("cyan")).toBe(true);
    expect(getAccentColor()?.id).toBe("cyan");
    expect(setAccentColor(null)).toBe(true);
    expect(getAccentColor()).toBeNull();
  });

  it("notifies subscribers when the accent changes", () => {
    const seen: Array<string | null> = [];
    const unsubscribe = subscribeAccent((accent) => seen.push(accent?.id ?? null));
    setAccentColor("amber");
    setAccentColor(null);
    unsubscribe();
    expect(seen).toEqual(["amber", null]);
  });

  it("every accent meets 3.0 contrast on the default dark background", () => {
    const background = BUILT_IN_THEMES[0].colors.background;
    for (const accent of ACCENT_COLORS) {
      expect(
        contrastRatio(accent.accent, background),
        accent.id
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("typography system", () => {
  it("defines the twelve professional variants", () => {
    expect(TYPE_VARIANTS).toEqual([
      "displayXl",
      "displayL",
      "h1",
      "h2",
      "h3",
      "body",
      "bodySmall",
      "caption",
      "label",
      "metric",
      "numeric",
      "mono",
    ]);
  });

  it("every variant carries a complete style and a class string", () => {
    for (const variant of TYPE_VARIANTS) {
      const style = TYPE_SCALE[variant];
      expect(style.fontSize, variant).toMatch(/rem$/);
      expect(Number(style.lineHeight), variant).toBeGreaterThan(0);
      expect(style.fontWeight, variant).toBeGreaterThanOrEqual(400);
      expect(TYPE_CLASSES[variant], variant).toBeTruthy();
    }
    expect(TYPE_SCALE.metric.tabularNums).toBe(true);
    expect(TYPE_SCALE.numeric.tabularNums).toBe(true);
    expect(TYPE_SCALE.mono.fontFamily).toMatch(/mono/i);
    expect(TYPE_CLASSES.label).toContain("uppercase");
  });

  it("display sizes descend through the hierarchy", () => {
    const rem = (variant: (typeof TYPE_VARIANTS)[number]) =>
      Number.parseFloat(TYPE_SCALE[variant].fontSize);
    expect(rem("displayXl")).toBeGreaterThan(rem("displayL"));
    expect(rem("displayL")).toBeGreaterThan(rem("h1"));
    expect(rem("h1")).toBeGreaterThan(rem("h2"));
    expect(rem("h2")).toBeGreaterThan(rem("h3"));
    expect(rem("h3")).toBeGreaterThan(rem("body"));
  });

  it("font size preference offers three scales with ascending root sizes", () => {
    expect(FONT_SCALES).toEqual(["small", "medium", "large"]);
    expect(FONT_SCALE_ROOT_PX.small).toBeLessThan(FONT_SCALE_ROOT_PX.medium);
    expect(FONT_SCALE_ROOT_PX.medium).toBeLessThan(FONT_SCALE_ROOT_PX.large);
    expect(setFontScale("huge")).toBe(false);
    expect(setFontScale("large")).toBe(true);
    expect(getFontScale()).toBe("large");
  });
});

describe("glassmorphism", () => {
  it("provides the full glass component surface set", () => {
    expect(GLASS_SURFACE_TOKENS).toEqual(
      expect.arrayContaining([
        "card",
        "panel",
        "toolbar",
        "modal",
        "dropdown",
        "sidebar",
        "tooltip",
        "badge",
      ])
    );
  });

  it("every glass surface uses subtle blur with a themed border", () => {
    for (const token of GLASS_SURFACE_TOKENS) {
      expect(GLASS_CLASSES[token], token).toMatch(/backdrop-blur/);
      expect(GLASS_CLASSES[token], token).toMatch(/border/);
    }
  });

  it("avoids excessive transparency (surfaces stay ≥ 70% opaque)", () => {
    for (const token of GLASS_SURFACE_TOKENS) {
      const matches = GLASS_CLASSES[token].match(/\/(\d{2,3})/g) ?? [];
      for (const match of matches) {
        expect(Number(match.slice(1)), `${token} ${match}`).toBeGreaterThanOrEqual(70);
      }
    }
    expect(GLASS_CLASSES.card).toContain(GLASS_SURFACE);
    expect(GLASS_CLASSES.panel).toContain(GLASS_SURFACE);
  });
});

describe("motion system", () => {
  it("setMotionPreference()/getMotionPreference() round-trip and validate", () => {
    expect(MOTION_PREFERENCES).toEqual(["system", "full", "reduced"]);
    expect(setMotionPreference("chaotic")).toBe(false);
    expect(setMotionPreference("reduced")).toBe(true);
    expect(getMotionPreference()).toBe("reduced");
  });

  it("resolves the effective motion mode from preference + OS setting", () => {
    expect(resolveEffectiveMotion("system", true)).toBe("reduced");
    expect(resolveEffectiveMotion("system", false)).toBe("full");
    expect(resolveEffectiveMotion("full", true)).toBe("full");
    expect(resolveEffectiveMotion("reduced", false)).toBe("reduced");
  });

  it("ships professional presets for every required animation", () => {
    for (const preset of [
      "fade",
      "scale",
      "slide",
      "reveal",
      "cardHover",
      "tooltip",
      "dropdown",
      "modal",
      "pageTransition",
      "progress",
    ] as const) {
      expect(MOTION_CLASSES[preset], preset).toBeTruthy();
    }
    expect(MOTION_CLASSES.fade).toContain("animate-fade-in");
    expect(MOTION_CLASSES.modal).toContain("animate-scale-in");
  });
});

describe("elevation, radius, icons and status colors", () => {
  it("defines the eight institutional elevation tokens", () => {
    expect(ELEVATION_ORDER).toEqual([
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "floating",
      "hover",
      "focus",
    ]);
    for (const token of ELEVATION_ORDER) {
      expect(ELEVATION_SHADOWS[token], token).toBeTruthy();
    }
    expect(ELEVATION_SHADOWS.focus).toContain("--eos-color-accent");
  });

  it("standardizes radius aliases from XS to Circle", () => {
    expect(Object.keys(RADIUS_ALIASES)).toEqual([
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "pill",
      "circle",
    ]);
    expect(RADIUS_ALIASES.pill).toBe("9999px");
    expect(RADIUS_ALIASES.circle).toBe("50%");
  });

  it("standardizes icon sizes with consistent stroke widths", () => {
    expect(ICON_SIZES).toEqual({ xs: 12, sm: 14, md: 16, lg: 20, xl: 24 });
    for (const size of Object.keys(ICON_SIZES) as Array<keyof typeof ICON_SIZES>) {
      expect(ICON_STROKE_WIDTHS[size], size).toBeGreaterThanOrEqual(1.5);
      expect(ICON_STROKE_WIDTHS[size], size).toBeLessThanOrEqual(2);
    }
  });

  it("maps all eleven premium status roles to themed classes", () => {
    expect(STATUS_COLOR_ROLES).toHaveLength(11);
    for (const role of STATUS_COLOR_ROLES) {
      expect(STATUS_COLORS[role].text, role).toMatch(/^text-/);
      expect(STATUS_COLORS[role].bg, role).toMatch(/^bg-/);
      expect(STATUS_COLORS[role].border, role).toMatch(/^border-/);
    }
  });
});

describe("density preference and regression", () => {
  it("global density preference validates and round-trips", () => {
    expect(UI_DENSITIES).toEqual(["comfortable", "compact", "ultra"]);
    expect(setUiDensity("gigantic")).toBe(false);
    expect(setUiDensity("compact")).toBe(true);
    expect(getUiDensity()).toBe("compact");
  });

  it("R1 foundations are untouched: default theme and original palettes", () => {
    expect(DEFAULT_THEME_ID).toBe("institutional-dark");
    const ids = BUILT_IN_THEMES.map((theme) => theme.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "institutional-dark",
        "institutional-light",
        "midnight-blue",
        "graphite",
        "emerald",
      ])
    );
    expect(BUILT_IN_THEMES[0].colors.accent).toBe("#3b82f6");
  });
});
