/**
 * ThemeEngine — the single source of truth for the active theme.
 *
 * Framework-independent (no React imports) so it can be tested in a Node
 * environment and consumed from any UI layer. The React ThemeProvider is a
 * thin subscriber around this engine.
 *
 * Responsibilities:
 * - Maintain a registry of themes (built-in + runtime-registered).
 * - Track and switch the active theme.
 * - Compile a theme into CSS custom properties and apply them to the
 *   document root (colors as RGB triplets so Tailwind opacity modifiers
 *   like `bg-accent/20` keep working in every theme).
 * - Persist the user's choice and notify subscribers on change.
 */

import { COLOR_TOKEN_NAMES, hexToRgbTriplet, type ColorTokenName } from "./colorTokens";
import { DURATIONS_MS } from "./animationTokens";
import { RADIUS_SCALE, type RadiusToken } from "./radiusTokens";
import { SPACING_SCALE, type SpacingToken } from "./spacingTokens";
import { buildShadowTokens, SHADOW_TOKEN_NAMES } from "./shadowTokens";
import { Z_INDEX, type ZIndexToken } from "./zIndexTokens";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, type Theme } from "./themeTokens";

export const THEME_STORAGE_KEY = "equityos.theme";

/** camelCase → kebab-case for CSS variable names. */
function kebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export type ThemeChangeListener = (theme: Theme) => void;

export class ThemeEngine {
  private readonly registry = new Map<string, Theme>();
  private readonly listeners = new Set<ThemeChangeListener>();
  private activeThemeId: string;

  constructor(themes: readonly Theme[] = BUILT_IN_THEMES, defaultThemeId: string = DEFAULT_THEME_ID) {
    for (const theme of themes) {
      this.registry.set(theme.id, theme);
    }
    if (!this.registry.has(defaultThemeId)) {
      throw new Error(`Default theme "${defaultThemeId}" is not registered`);
    }
    this.activeThemeId = defaultThemeId;
  }

  /** Register a new theme at runtime. Future themes plug in here. */
  registerTheme(theme: Theme): void {
    this.registry.set(theme.id, theme);
  }

  listThemes(): readonly Theme[] {
    return [...this.registry.values()];
  }

  hasTheme(themeId: string): boolean {
    return this.registry.has(themeId);
  }

  getTheme(): Theme {
    const theme = this.registry.get(this.activeThemeId);
    /* istanbul ignore next -- registry always holds the active id */
    if (!theme) throw new Error(`Active theme "${this.activeThemeId}" missing`);
    return theme;
  }

  /** Switch the active theme. Unknown ids are ignored and reported false. */
  setTheme(themeId: string): boolean {
    const theme = this.registry.get(themeId);
    if (!theme) return false;
    this.activeThemeId = themeId;
    this.applyToDocument();
    this.persist();
    for (const listener of this.listeners) listener(theme);
    return true;
  }

  /**
   * Toggle between dark and light. From any dark theme this goes to
   * Institutional Light; from a light theme back to Institutional Dark.
   */
  toggleTheme(): Theme {
    const next =
      this.getTheme().mode === "dark" ? "institutional-light" : "institutional-dark";
    this.setTheme(next);
    return this.getTheme();
  }

  subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Compile the active theme into CSS custom properties.
   * Colors are emitted as RGB triplets under `--eos-color-*`.
   */
  getCssVariables(theme: Theme = this.getTheme()): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const name of COLOR_TOKEN_NAMES) {
      vars[`--eos-color-${kebabCase(name)}`] = hexToRgbTriplet(
        theme.colors[name as ColorTokenName],
      );
    }
    const shadows = buildShadowTokens(theme.mode);
    for (const name of SHADOW_TOKEN_NAMES) {
      vars[`--eos-shadow-${kebabCase(name)}`] = shadows[name];
    }
    for (const [token, px] of Object.entries(SPACING_SCALE)) {
      vars[`--eos-space-${token}`] = `${px}px`;
    }
    for (const [token, px] of Object.entries(RADIUS_SCALE)) {
      vars[`--eos-radius-${token}`] = `${px}px`;
    }
    for (const [token, ms] of Object.entries(DURATIONS_MS)) {
      vars[`--eos-duration-${token}`] = `${ms}ms`;
    }
    for (const [token, z] of Object.entries(Z_INDEX)) {
      vars[`--eos-z-${token}`] = String(z);
    }
    return vars;
  }

  /** Write the active theme's variables onto <html>. No-op during SSR. */
  applyToDocument(): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const theme = this.getTheme();
    for (const [name, value] of Object.entries(this.getCssVariables(theme))) {
      root.style.setProperty(name, value);
    }
    root.dataset.theme = theme.id;
    root.classList.toggle("dark", theme.mode === "dark");
    root.classList.toggle("light", theme.mode === "light");
    root.style.colorScheme = theme.mode;
  }

  /** Restore the persisted theme choice, if any. No-op during SSR. */
  hydrateFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && this.registry.has(stored)) {
        this.activeThemeId = stored;
      }
    } catch {
      // Storage unavailable (private mode / disabled) — keep default.
    }
    this.applyToDocument();
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, this.activeThemeId);
    } catch {
      // Storage unavailable — theme still applies for the session.
    }
  }
}

/** Process-local singleton, mirroring other EquityOS core engines. */
const themeEngine = new ThemeEngine();

export function getThemeEngine(): ThemeEngine {
  return themeEngine;
}

/** Public API — active theme. */
export function getTheme(): Theme {
  return themeEngine.getTheme();
}

/** Public API — switch theme by id. */
export function setTheme(themeId: string): boolean {
  return themeEngine.setTheme(themeId);
}

/** Public API — toggle dark/light. */
export function toggleTheme(): Theme {
  return themeEngine.toggleTheme();
}

/** Convenience tokens for space/radius consumers. */
export function spaceVar(token: SpacingToken): string {
  return `var(--eos-space-${token})`;
}

export function radiusVar(token: RadiusToken): string {
  return `var(--eos-radius-${token})`;
}

export function zIndexVar(token: ZIndexToken): string {
  return `var(--eos-z-${token})`;
}
