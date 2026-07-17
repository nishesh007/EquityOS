"use client";

import { createContext, useContext } from "react";
import type { Theme } from "./themeTokens";

export interface ThemeContextValue {
  /** Active theme. */
  theme: Theme;
  /** All registered themes (for pickers in Settings). */
  themes: readonly Theme[];
  /** Switch to a theme by id. Returns false for unknown ids. */
  setTheme: (themeId: string) => boolean;
  /** Toggle between dark and light institutional themes. */
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Read the active theme. Must be used under <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value;
}
