/**
 * Sprint 10C.R7 — first-time onboarding engine.
 *
 * Step content plus a persisted "dismissed" flag so the tour shows only
 * once (or never again after Skip). Pure + localStorage-backed.
 */

export interface OnboardingStep {
  id: string;
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = Object.freeze([
  {
    id: "dashboard",
    title: "Your institutional dashboard",
    body: "Markets, AI-ranked opportunities, portfolio health and research feeds live on one terminal-grade dashboard. Every widget is live and hierarchy-ordered.",
  },
  {
    id: "workspace",
    title: "Make it yours",
    body: "Drag widgets to rearrange, resize from the edge handle, hide what you don't need. Save arrangements as workspace profiles and switch per workflow.",
  },
  {
    id: "research",
    title: "Research workflow",
    body: "Press Ctrl+K to find any company instantly. Company pages combine fundamentals, technicals and AI conviction; add names to watchlists and export reports.",
  },
  {
    id: "themes",
    title: "Pick your look",
    body: "Eight institutional themes and six accent colors in Settings → Appearance — density, font size and motion preferences included.",
  },
  {
    id: "shortcuts",
    title: "Fly with the keyboard",
    body: "Ctrl+K palette, Ctrl+B sidebar, Ctrl+Shift+D/P/R/W to jump between pages, ? for the full shortcut list.",
  },
]);

export type OnboardingStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const STORAGE_KEY = "equityos.onboarding.dismissed";

function browserStorage(): OnboardingStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

/** True when the tour should be offered (never dismissed). */
export function shouldShowOnboarding(
  storage: OnboardingStorage | undefined = browserStorage()
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(STORAGE_KEY) !== "true";
  } catch {
    return false;
  }
}

/** Permanently dismiss the onboarding tour. */
export function dismissOnboarding(
  storage: OnboardingStorage | undefined = browserStorage()
): void {
  try {
    storage?.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore storage failures
  }
}

/** Test / support hook — allow the tour to show again. */
export function resetOnboarding(
  storage: OnboardingStorage | undefined = browserStorage()
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
