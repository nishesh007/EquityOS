/**
 * Dashboard layout preferences — client-only localStorage.
 * Presentation layer; no server sync.
 */

export const DASHBOARD_PREF_KEY = "equityos.dashboard.layout.v1";

export type DashboardSectionId =
  | "market-pulse"
  | "opportunities"
  | "portfolio"
  | "intelligence"
  | "earnings"
  | "news";

export const DEFAULT_SECTION_ORDER: readonly DashboardSectionId[] = [
  "market-pulse",
  "opportunities",
  "portfolio",
  "intelligence",
  "earnings",
  "news",
] as const;

export interface DashboardPreferences {
  version: 1;
  order: DashboardSectionId[];
  collapsed: Partial<Record<DashboardSectionId, boolean>>;
  pinned: DashboardSectionId[];
}

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  version: 1,
  order: [...DEFAULT_SECTION_ORDER],
  collapsed: {},
  pinned: ["market-pulse", "opportunities"],
};

function isSectionId(value: unknown): value is DashboardSectionId {
  return (
    typeof value === "string" &&
    (DEFAULT_SECTION_ORDER as readonly string[]).includes(value)
  );
}

export function loadDashboardPreferences(): DashboardPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(DASHBOARD_PREF_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES, order: [...DEFAULT_SECTION_ORDER] };
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter(isSectionId)
      : [...DEFAULT_SECTION_ORDER];
    // Ensure every default section is present exactly once.
    for (const id of DEFAULT_SECTION_ORDER) {
      if (!order.includes(id)) order.push(id);
    }
    const pinned = Array.isArray(parsed.pinned)
      ? parsed.pinned.filter(isSectionId)
      : [...DEFAULT_PREFERENCES.pinned];
    return {
      version: 1,
      order,
      collapsed:
        parsed.collapsed && typeof parsed.collapsed === "object"
          ? parsed.collapsed
          : {},
      pinned,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, order: [...DEFAULT_SECTION_ORDER] };
  }
}

export function saveDashboardPreferences(prefs: DashboardPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DASHBOARD_PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function resetDashboardPreferences(): DashboardPreferences {
  const next = {
    ...DEFAULT_PREFERENCES,
    order: [...DEFAULT_SECTION_ORDER],
    pinned: [...DEFAULT_PREFERENCES.pinned],
    collapsed: {},
  };
  saveDashboardPreferences(next);
  return next;
}

/** Pinned sections first (stable), then remaining order. */
export function resolveSectionOrder(
  prefs: DashboardPreferences
): DashboardSectionId[] {
  const pinned = prefs.pinned.filter((id) => prefs.order.includes(id));
  const rest = prefs.order.filter((id) => !pinned.includes(id));
  return [...pinned, ...rest];
}
