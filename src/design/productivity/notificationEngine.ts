/**
 * Sprint 10C.R7 — notification center engine.
 *
 * Presentation-side inbox: categorized notifications with unread/pinned
 * state, dismiss and mark-all-read. localStorage-backed (injectable),
 * with a subscription so the bell badge stays live.
 */

export type NotificationCategory =
  | "research"
  | "recommendation"
  | "portfolio"
  | "alert"
  | "validation"
  | "calendar"
  | "news"
  | "system";

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] =
  Object.freeze([
    "research",
    "recommendation",
    "portfolio",
    "alert",
    "validation",
    "calendar",
    "news",
    "system",
  ]);

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  at: number;
  read: boolean;
  pinned: boolean;
  href?: string;
}

export type NotificationStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const STORAGE_KEY = "equityos.notifications";
const MAX_NOTIFICATIONS = 100;

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

function read(
  storage: NotificationStorage | undefined
): AppNotification[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
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
    storage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // ignore storage failures
  }
  notify();
}

let idCounter = 0;

/** Push a notification (most recent first). Returns the created item. */
export function pushNotification(
  input: Omit<AppNotification, "id" | "at" | "read" | "pinned"> &
    Partial<Pick<AppNotification, "id" | "read" | "pinned">>,
  storage: NotificationStorage | undefined = browserStorage()
): AppNotification {
  idCounter += 1;
  const notification: AppNotification = {
    id: input.id ?? `ntf-${Date.now().toString(36)}-${idCounter}`,
    category: input.category,
    title: input.title,
    body: input.body,
    href: input.href,
    at: Date.now(),
    read: input.read ?? false,
    pinned: input.pinned ?? false,
  };
  const items = read(storage);
  items.unshift(notification);
  write(items, storage);
  return notification;
}

/** All notifications, pinned first then newest first. */
export function listNotifications(
  category?: NotificationCategory | "unread" | "pinned",
  storage: NotificationStorage | undefined = browserStorage()
): AppNotification[] {
  const items = read(storage).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at
  );
  if (!category) return items;
  if (category === "unread") return items.filter((item) => !item.read);
  if (category === "pinned") return items.filter((item) => item.pinned);
  return items.filter((item) => item.category === category);
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

export function markAllNotificationsRead(
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write(read(storage).map((item) => ({ ...item, read: true })), storage);
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
  write(read(storage).filter((item) => item.id !== id), storage);
}

export function clearNotifications(
  storage: NotificationStorage | undefined = browserStorage()
): void {
  write([], storage);
}
