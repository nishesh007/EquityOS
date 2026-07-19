/**
 * Sprint 10C.1 — activity feed engine.
 *
 * Chronological presentation-side events with timestamps.
 * localStorage-backed (injectable for tests).
 */

export type ActivityCategory =
  | "research"
  | "recommendation"
  | "portfolio"
  | "watchlist"
  | "workspace"
  | "export"
  | "validation"
  | "ai"
  | "market"
  | "strategy";

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = Object.freeze([
  "research",
  "recommendation",
  "portfolio",
  "watchlist",
  "workspace",
  "export",
  "validation",
  "ai",
  "market",
  "strategy",
]);

export const ACTIVITY_CATEGORY_LABELS: Readonly<
  Record<ActivityCategory, string>
> = Object.freeze({
  research: "Research",
  recommendation: "Recommendations",
  portfolio: "Portfolio",
  watchlist: "Watchlist",
  workspace: "Workspace",
  export: "Exports",
  validation: "Validation",
  ai: "AI Decisions",
  market: "Market Data",
  strategy: "Strategy",
});

export interface ActivityEvent {
  id: string;
  category: ActivityCategory;
  message: string;
  at: number;
  href?: string;
}

export type ActivityStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const STORAGE_KEY = "equityos.activity";
const MAX_EVENTS = 120;

function browserStorage(): ActivityStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

function read(storage: ActivityStorage | undefined): ActivityEvent[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityEvent[]) : [];
  } catch {
    return [];
  }
}

let idCounter = 0;

/** Record a presentation-side activity event (newest first). */
export function recordActivity(
  category: ActivityCategory,
  message: string,
  href?: string,
  storage: ActivityStorage | undefined = browserStorage()
): ActivityEvent {
  idCounter += 1;
  const event: ActivityEvent = {
    id: `act-${Date.now().toString(36)}-${idCounter}`,
    category,
    message,
    href,
    at: Date.now(),
  };
  const events = read(storage);
  events.unshift(event);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
    } catch {
      // ignore storage failures
    }
  }
  return event;
}

/** The activity feed, optionally filtered by category. */
export function getActivityFeed(
  category?: ActivityCategory,
  limit = 50,
  storage: ActivityStorage | undefined = browserStorage()
): ActivityEvent[] {
  const events = read(storage);
  const filtered = category
    ? events.filter((event) => event.category === category)
    : events;
  return filtered.slice(0, limit);
}

/** Search activity messages. */
export function searchActivity(
  query: string,
  limit = 40,
  storage: ActivityStorage | undefined = browserStorage()
): ActivityEvent[] {
  const q = query.trim().toLowerCase();
  const events = getActivityFeed(undefined, MAX_EVENTS, storage);
  if (!q) return events.slice(0, limit);
  return events
    .filter((event) =>
      `${event.message} ${event.category}`.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export function clearActivityFeed(
  storage: ActivityStorage | undefined = browserStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, "[]");
  } catch {
    // ignore storage failures
  }
}

/** Seed a short demo timeline when empty. */
export function seedDemoActivityIfEmpty(
  storage: ActivityStorage | undefined = browserStorage()
): void {
  if (read(storage).length > 0) return;
  const seeds: Array<{ category: ActivityCategory; message: string; href?: string }> = [
    {
      category: "portfolio",
      message: "Portfolio updated",
      href: "/portfolio",
    },
    {
      category: "watchlist",
      message: "Watchlist modified",
      href: "/watchlist",
    },
    {
      category: "ai",
      message: "AI recommendation generated",
      href: "/opportunities",
    },
    {
      category: "research",
      message: "Research report created",
      href: "/research",
    },
    {
      category: "strategy",
      message: "Strategy triggered (presentation signal)",
      href: "/opportunities",
    },
    {
      category: "market",
      message: "Market data refreshed",
      href: "/markets",
    },
  ];
  const now = Date.now();
  const events: ActivityEvent[] = seeds.map((seed, index) => ({
    id: `act-demo-${index}`,
    category: seed.category,
    message: seed.message,
    href: seed.href,
    at: now - index * 450_000,
  }));
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      /* ignore */
    }
  }
}
