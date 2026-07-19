/**
 * Sprint 10C.1 — notification center engine.
 *
 * Presentation-side inbox: categorized notifications with priority,
 * unread/pinned state, smart grouping, dismiss and mark-all-read.
 * localStorage-backed (injectable), with a live subscription for the bell.
 */

export type NotificationPriority = "critical" | "high" | "medium" | "low";

export type NotificationCategory =
  | "research"
  | "recommendation"
  | "opportunity"
  | "portfolio"
  | "watchlist"
  | "market"
  | "alert"
  | "earnings"
  | "validation"
  | "calendar"
  | "news"
  | "system";

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] =
  Object.freeze([
    "research",
    "recommendation",
    "opportunity",
    "portfolio",
    "watchlist",
    "market",
    "alert",
    "earnings",
    "validation",
    "calendar",
    "news",
    "system",
  ]);

export const NOTIFICATION_CATEGORY_LABELS: Readonly<
  Record<NotificationCategory, string>
> = Object.freeze({
  research: "Research",
  recommendation: "AI Recommendations",
  opportunity: "AI Opportunities",
  portfolio: "Portfolio Alerts",
  watchlist: "Watchlist Alerts",
  market: "Market Alerts",
  alert: "Alerts",
  earnings: "Earnings Alerts",
  validation: "Validation",
  calendar: "Economic Calendar",
  news: "News Alerts",
  system: "System",
});

export const PRIORITY_LABELS: Readonly<Record<NotificationPriority, string>> =
  Object.freeze({
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  });

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  at: number;
  read: boolean;
  pinned: boolean;
  href?: string;
  priority: NotificationPriority;
  source?: string;
  /** When set, similar notifications collapse into one group. */
  groupKey?: string;
}

export type NotificationStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type NotificationListFilter =
  | NotificationCategory
  | "unread"
  | "pinned"
  | "today"
  | "week"
  | "ai"
  | "all";

const STORAGE_KEY = "equityos.notifications";
const MAX_NOTIFICATIONS = 120;

function browserStorage(): NotificationStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Subscribe to notification changes (returns unsubscribe). */
export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalize(item: AppNotification): AppNotification {
  return {
    ...item,
    priority: item.priority ?? "medium",
    pinned: Boolean(item.pinned),
    read: Boolean(item.read),
  };
}

function read(
  storage: NotificationStorage | undefined
): AppNotification[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as AppNotification[]).map(normalize);
  } catch {
    return [];
  }
}

function write(
  items: AppNotification[],
  storage: NotificationStorage | undefined
): void {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_NOTIFICATIONS))
    );
  } catch {
    // ignore storage failures
  }
  notify();
}

let idCounter = 0;

const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfWeek = (): number => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.getTime();
};

/** Push a notification (most recent first). Returns the created item. */
export function pushNotification(
  input: Omit<AppNotification, "id" | "at" | "read" | "pinned" | "priority"> &
    Partial<
      Pick<AppNotification, "id" | "read" | "pinned" | "priority" | "source" | "groupKey">
    >,
  storage: NotificationStorage | undefined = browserStorage()
): AppNotification {
  idCounter += 1;
  const notification: AppNotification = {
    id: input.id ?? `ntf-${Date.now().toString(36)}-${idCounter}`,
    category: input.category,
    title: input.title,
    body: input.body,
    href: input.href,
    source: input.source,
    groupKey: input.groupKey,
    priority: input.priority ?? "medium",
    at: Date.now(),
    read: input.read ?? false,
    pinned: input.pinned ?? false,
  };
  const items = read(storage);
  items.unshift(notification);
  write(items, storage);
  return notification;
}

function matchesFilter(
  item: AppNotification,
  filter?: NotificationListFilter
): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "unread") return !item.read;
  if (filter === "pinned") return item.pinned;
  if (filter === "today") return item.at >= startOfToday();
  if (filter === "week") return item.at >= startOfWeek();
  if (filter === "ai") {
    return (
      item.category === "recommendation" ||
      item.category === "opportunity" ||
      item.category === "research"
    );
  }
  return item.category === filter;
}

/** All notifications, pinned first then newest first. */
export function listNotifications(
  category?: NotificationListFilter,
  storage: NotificationStorage | undefined = browserStorage()
): AppNotification[] {
  return read(storage)
    .filter((item) => matchesFilter(item, category))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at);
}

/** Search notifications by title/body/source. */
export function searchNotifications(
  query: string,
  filter?: NotificationListFilter,
  storage: NotificationStorage | undefined = browserStorage()
): AppNotification[] {
  const q = query.trim().toLowerCase();
  const base = listNotifications(filter, storage);
  if (!q) return base;
  return base.filter((item) => {
    const hay = `${item.title} ${item.body ?? ""} ${item.source ?? ""} ${item.category}`.toLowerCase();
    return hay.includes(q);
  });
}

export interface NotificationGroup {
  id: string;
  title: string;
  count: number;
  latest: AppNotification;
  items: AppNotification[];
  grouped: boolean;
}

/**
 * Smart grouping — collapse items that share a groupKey
 * (e.g. "5 New AI Opportunities").
 */
export function groupNotifications(
  items: AppNotification[]
): NotificationGroup[] {
  const groups = new Map<string, AppNotification[]>();
  const order: string[] = [];

  for (const item of items) {
    const key = item.groupKey
      ? `g:${item.groupKey}`
      : item.pinned
        ? `p:${item.id}`
        : `s:${item.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  return order.map((key) => {
    const bucket = groups.get(key)!;
    const latest = bucket[0];
    const grouped = Boolean(latest.groupKey) && bucket.length > 1;
    const categoryLabel =
      NOTIFICATION_CATEGORY_LABELS[latest.category] ?? latest.category;
    return {
      id: key,
      title: grouped ? `${bucket.length} ${categoryLabel}` : latest.title,
      count: bucket.length,
      latest,
      items: bucket,
      grouped,
    };
  });
}

export function unreadCount(
  storage: NotificationStorage | undefined = browserStorage()
): number {
  return read(storage).filter((item) => !item.read).length;
}

export function markNotificationRead(
  id: string,
  readFlag = true,
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(
    read(storage).map((item) =>
      item.id === id ? { ...item, read: readFlag } : item
    ),
    storage
  );
}

export function markGroupRead(
  groupKey: string,
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(
    read(storage).map((item) =>
      item.groupKey === groupKey ? { ...item, read: true } : item
    ),
    storage
  );
}

export function markAllNotificationsRead(
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(
    read(storage).map((item) => ({ ...item, read: true })),
    storage
  );
}

export function pinNotification(
  id: string,
  pinned = true,
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(
    read(storage).map((item) => (item.id === id ? { ...item, pinned } : item)),
    storage
  );
}

export function dismissNotification(
  id: string,
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(
    read(storage).filter((item) => item.id !== id),
    storage
  );
}

export function dismissGroup(
  groupKey: string,
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(
    read(storage).filter((item) => item.groupKey !== groupKey),
    storage
  );
}

export function clearNotifications(
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write([], storage);
}

/** Seed demo notifications once (presentation showcase). */
export function seedDemoNotificationsIfEmpty(
  storage: NotificationStorage | undefined = browserStorage()
): void {
  if (read(storage).length > 0) return;
  const now = Date.now();
  const demos: Array<
    Omit<AppNotification, "id" | "at" | "read" | "pinned"> & { atOffset: number }
  > = [
    {
      category: "opportunity",
      title: "New AI Opportunity",
      body: "High-conviction setup flagged for review in AI Insights.",
      priority: "high",
      source: "AI Opportunities",
      groupKey: "ai-opportunities",
      href: "/opportunities",
      atOffset: 0,
    },
    {
      category: "opportunity",
      title: "New AI Opportunity",
      body: "Additional opportunity matched current market regime.",
      priority: "high",
      source: "AI Opportunities",
      groupKey: "ai-opportunities",
      href: "/opportunities",
      atOffset: 60_000,
    },
    {
      category: "opportunity",
      title: "New AI Opportunity",
      body: "Watchlist symbol entered opportunity pipeline.",
      priority: "medium",
      source: "AI Opportunities",
      groupKey: "ai-opportunities",
      href: "/opportunities",
      atOffset: 120_000,
    },
    {
      category: "portfolio",
      title: "Portfolio alert",
      body: "Position risk mode requires attention.",
      priority: "critical",
      source: "Portfolio",
      href: "/portfolio",
      atOffset: 300_000,
    },
    {
      category: "watchlist",
      title: "Watchlist alert",
      body: "Tracked symbol hit a live quote update.",
      priority: "medium",
      source: "Watchlist",
      href: "/watchlist",
      atOffset: 600_000,
    },
    {
      category: "market",
      title: "Market breadth shift",
      body: "Market internals updated — review breadth dashboard.",
      priority: "high",
      source: "Markets",
      href: "/markets",
      atOffset: 900_000,
    },
    {
      category: "earnings",
      title: "Earnings alert",
      body: "Upcoming results on the calendar this week.",
      priority: "medium",
      source: "Results Calendar",
      href: "/results",
      atOffset: 1_200_000,
    },
    {
      category: "calendar",
      title: "Economic calendar",
      body: "Macro event window approaching (future-ready).",
      priority: "low",
      source: "Economic Calendar",
      href: "/results",
      atOffset: 1_500_000,
    },
    {
      category: "news",
      title: "News alert",
      body: "Market headlines available in News.",
      priority: "low",
      source: "News",
      href: "/news",
      atOffset: 1_800_000,
    },
    {
      category: "system",
      title: "Welcome to EquityOS Productivity Hub",
      body: "Notifications, AI Command Center and activity timeline are ready.",
      priority: "low",
      source: "System",
      atOffset: 2_000_000,
    },
  ];

  const items: AppNotification[] = demos.map((demo, index) => ({
    id: `ntf-demo-${index}`,
    category: demo.category,
    title: demo.title,
    body: demo.body,
    href: demo.href,
    source: demo.source,
    groupKey: demo.groupKey,
    priority: demo.priority,
    at: now - demo.atOffset,
    read: false,
    pinned: false,
  }));
  write(items, storage);
}
