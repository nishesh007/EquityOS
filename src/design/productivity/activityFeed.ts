/**
 * Sprint 10C.R7 — activity feed engine.
 *
 * Chronological record of presentation-side events: research updates,
 * recommendation lifecycle, portfolio activity, workspace changes,
 * exports, validation updates and AI decisions. localStorage-backed.
 */

export type ActivityCategory =
  | "research"
  | "recommendation"
  | "portfolio"
  | "workspace"
  | "export"
  | "validation"
  | "ai";

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = Object.freeze([
  "research",
  "recommendation",
  "portfolio",
  "workspace",
  "export",
  "validation",
  "ai",
]);

export const ACTIVITY_CATEGORY_LABELS: Readonly<
  Record<ActivityCategory, string>
> = Object.freeze({
  research: "Research",
  recommendation: "Recommendations",
  portfolio: "Portfolio",
  workspace: "Workspace",
  export: "Exports",
  validation: "Validation",
  ai: "AI Decisions",
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
const MAX_EVENTS = 100;

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
