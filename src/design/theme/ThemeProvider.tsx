"use client";

/**
 * React binding for the ThemeEngine. Mounted once in the root layout;
 * every page inherits the active theme through CSS variables, so pages
 * and components never need to know which theme is active.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getThemeEngine } from "./ThemeEngine";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";
import type { Theme } from "./themeTokens";
import { hydrateAccentFromStorage } from "../themes/accentEngine";
import { hydrateDensityFromStorage } from "../themes/uiDensity";
import { hydrateMotionFromStorage } from "../motion/motionPreference";
import { hydrateFontScaleFromStorage } from "../typography/fontScale";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const engine = getThemeEngine();
  const [theme, setThemeState] = useState<Theme>(() => engine.getTheme());

  useEffect(() => {
    // Restore persisted choices, apply CSS variables, and stay in sync
    // with changes made from anywhere else in the app. Accent hydrates
    // after the theme so its override wins (Sprint 10C.R5).
    engine.hydrateFromStorage();
    hydrateAccentFromStorage();
    hydrateMotionFromStorage();
    hydrateFontScaleFromStorage();
    hydrateDensityFromStorage();
    setThemeState(engine.getTheme());
    return engine.subscribe(setThemeState);
  }, [engine]);

  const setTheme = useCallback(
    (themeId: string) => engine.setTheme(themeId),
    [engine],
  );
  const toggleTheme = useCallback(() => {
    engine.toggleTheme();
  }, [engine]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themes: engine.listThemes(), setTheme, toggleTheme }),
    [theme, engine, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
