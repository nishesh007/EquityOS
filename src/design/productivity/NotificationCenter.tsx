"use client";

/**
 * Sprint 10C.1 — Notification Center + AI Productivity Hub.
 *
 * Right-hand drawer: Inbox (grouped, prioritized), AI Command Center,
 * Activity Timeline, Productivity Panel, Quick Actions.
 * Keyboard accessible · responsive · presentation only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Info,
  Pin,
  PinOff,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onUiEvent, openCommandPalette } from "../command/uiBus";
import {
  dismissGroup,
  dismissNotification,
  groupNotifications,
  markAllNotificationsRead,
  markGroupRead,
  markNotificationRead,
  pinNotification,
  searchNotifications,
  seedDemoNotificationsIfEmpty,
  subscribeNotifications,
  unreadCount,
  NOTIFICATION_CATEGORY_LABELS,
  PRIORITY_LABELS,
  type AppNotification,
  type NotificationListFilter,
  type NotificationPriority,
} from "./notificationEngine";
import {
  ACTIVITY_CATEGORY_LABELS,
  getActivityFeed,
  searchActivity,
  seedDemoActivityIfEmpty,
  type ActivityEvent,
} from "./activityFeed";
import { SmartEmptyState } from "./SmartEmptyState";
import { AICommandCenter } from "./AICommandCenter";
import { ProductivityPanel } from "./ProductivityPanel";
import { recordActivity } from "./activityFeed";

type TabId = "inbox" | "ai" | "activity" | "productivity" | "actions";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "ai", label: "AI Hub" },
  { id: "activity", label: "Activity" },
  { id: "productivity", label: "Productivity" },
  { id: "actions", label: "Actions" },
];

const FILTERS: readonly { id: NotificationListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "ai", label: "AI" },
  { id: "portfolio", label: "Portfolio" },
  { id: "research", label: "Research" },
  { id: "market", label: "Market" },
  { id: "watchlist", label: "Watchlist" },
  { id: "opportunity", label: "Opportunities" },
  { id: "earnings", label: "Earnings" },
  { id: "calendar", label: "Calendar" },
  { id: "news", label: "News" },
  { id: "system", label: "System" },
  { id: "pinned", label: "Pinned" },
];

const PRIORITY_ICON: Record<NotificationPriority, typeof AlertCircle> = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: Info,
};

const PRIORITY_CLASS: Record<NotificationPriority, string> = {
  critical: "text-rose-400",
  high: "text-amber-400",
  medium: "text-sky-400",
  low: "text-text-faint",
};

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatTimestamp(at: number): string {
  try {
    return new Date(at).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timeAgo(at);
  }
}

const QUICK_ACTIONS = [
  {
    id: "refresh-market",
    label: "Refresh Market",
    run: (router: ReturnType<typeof useRouter>) => {
      recordActivity("market", "Market data refreshed", "/markets");
      router.refresh();
    },
  },
  {
    id: "ai-research",
    label: "Run AI Research",
    run: (router: ReturnType<typeof useRouter>) => router.push("/ai/research"),
  },
  {
    id: "scan",
    label: "Scan Market",
    run: (router: ReturnType<typeof useRouter>) => router.push("/screener"),
  },
  {
    id: "screener",
    label: "Open Screener",
    run: (router: ReturnType<typeof useRouter>) => router.push("/screener"),
  },
  {
    id: "watchlist",
    label: "Create Watchlist",
    run: (router: ReturnType<typeof useRouter>) => router.push("/watchlist"),
  },
  {
    id: "report",
    label: "Generate Report",
    run: () => openCommandPalette("export"),
  },
  {
    id: "portfolio",
    label: "Open Portfolio",
    run: (router: ReturnType<typeof useRouter>) => router.push("/portfolio"),
  },
  {
    id: "dashboard",
    label: "Open Dashboard",
    run: (router: ReturnType<typeof useRouter>) => router.push("/"),
  },
] as const;

export function NotificationCenter() {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("inbox");
  const [filter, setFilter] = useState<NotificationListFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState(0);
  const [visibleCount, setVisibleCount] = useState(40);

  const refresh = useCallback(() => {
    setItems(searchNotifications(debouncedQuery, filter));
    setActivity(
      debouncedQuery.trim()
        ? searchActivity(debouncedQuery, 60)
        : getActivityFeed(undefined, 60)
    );
    setUnread(unreadCount());
  }, [filter, debouncedQuery]);

  useEffect(() => {
    seedDemoNotificationsIfEmpty();
    seedDemoActivityIfEmpty();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const offOpen = onUiEvent("show-notifications", () => {
      setOpen(true);
      setTab("inbox");
    });
    const offChange = subscribeNotifications(refresh);
    return () => {
      offOpen();
      offChange();
    };
  }, [refresh]);

  useEffect(() => {
    if (open) {
      refresh();
      setVisibleCount(40);
    }
  }, [open, filter, tab, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const groups = useMemo(() => groupNotifications(items), [items]);
  const visibleGroups = groups.slice(0, visibleCount);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 80) {
      setVisibleCount((n) => Math.min(groups.length, n + 20));
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-surface/50 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Productivity hub"
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-surface-border bg-card shadow-overlay animate-slide-in sm:max-w-lg"
      >
        <header className="flex items-center justify-between border-b border-surface-border-subtle px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Bell className="h-4 w-4" />
              Productivity Hub
              {unread > 0 ? (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  {unread}
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-[10px] text-text-faint">
              Notifications · AI · Activity · Shortcuts
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              title="Mark all read"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mark all</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close productivity hub"
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex gap-0.5 overflow-x-auto border-b border-surface-border-subtle px-2">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              aria-pressed={tab === tabItem.id}
              className={cn(
                "shrink-0 border-b-2 px-2.5 py-2 text-[11px] font-medium transition-colors",
                tab === tabItem.id
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              )}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {(tab === "inbox" || tab === "activity") && (
          <div className="border-b border-surface-border-subtle px-3 py-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === "inbox"
                    ? "Search notifications…"
                    : "Search activity…"
                }
                aria-label="Search hub"
                className="h-8 w-full rounded-md border border-surface-border bg-surface-raised pl-8 pr-2 text-[11px] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        )}

        {tab === "inbox" ? (
          <>
            <div className="flex flex-wrap gap-1 px-3 py-2">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  aria-pressed={filter === option.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                    filter === option.id
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-hover text-text-muted hover:text-text-secondary"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div
              ref={listRef}
              onScroll={onListScroll}
              className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
            >
              {visibleGroups.length === 0 ? (
                <SmartEmptyState
                  title="You're all caught up"
                  description="Market, AI, portfolio, watchlist, earnings and system alerts will land here."
                  actions={[
                    { label: "Open AI Insights", href: "/opportunities" },
                  ]}
                />
              ) : (
                <ul className="space-y-1.5">
                  {visibleGroups.map((group) => {
                    const item = group.latest;
                    const PriorityIcon = PRIORITY_ICON[item.priority];
                    const expanded = expandedGroups.has(group.id);
                    return (
                      <li
                        key={group.id}
                        className={cn(
                          "group rounded-lg border border-surface-border-subtle p-3 transition-colors",
                          item.read ? "bg-transparent" : "bg-accent/5",
                          item.pinned && "border-accent/30"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <PriorityIcon
                            className={cn(
                              "mt-0.5 h-3.5 w-3.5 shrink-0",
                              PRIORITY_CLASS[item.priority]
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => {
                                if (group.grouped) {
                                  setExpandedGroups((current) => {
                                    const next = new Set(current);
                                    if (next.has(group.id)) next.delete(group.id);
                                    else next.add(group.id);
                                    return next;
                                  });
                                } else if (item.href) {
                                  markNotificationRead(item.id);
                                  router.push(item.href);
                                  setOpen(false);
                                } else {
                                  markNotificationRead(item.id);
                                }
                              }}
                            >
                              <p className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                                {group.grouped ? (
                                  expanded ? (
                                    <ChevronDown className="h-3 w-3 text-text-faint" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-text-faint" />
                                  )
                                ) : null}
                                {group.grouped
                                  ? `${group.count} ${NOTIFICATION_CATEGORY_LABELS[item.category]}`
                                  : item.title}
                              </p>
                              {item.body && !group.grouped ? (
                                <p className="mt-0.5 text-[11px] text-text-muted">
                                  {item.body}
                                </p>
                              ) : null}
                              <p className="mt-1 text-[10px] uppercase tracking-wider text-text-faint">
                                {PRIORITY_LABELS[item.priority]} ·{" "}
                                {NOTIFICATION_CATEGORY_LABELS[item.category]} ·{" "}
                                {item.source ?? "EquityOS"} · {timeAgo(item.at)}
                              </p>
                            </button>
                            {group.grouped && expanded ? (
                              <ul className="mt-2 space-y-1 border-t border-surface-border-subtle pt-2">
                                {group.items.map((child) => (
                                  <li
                                    key={child.id}
                                    className="flex items-start justify-between gap-2 text-[11px]"
                                  >
                                    <span className="text-text-secondary">
                                      {child.body ?? child.title}
                                    </span>
                                    <span className="shrink-0 text-text-faint">
                                      {timeAgo(child.at)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                            {!item.read && (
                              <button
                                type="button"
                                onClick={() =>
                                  group.grouped && item.groupKey
                                    ? markGroupRead(item.groupKey)
                                    : markNotificationRead(item.id)
                                }
                                title="Mark read"
                                aria-label="Mark read"
                                className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                pinNotification(item.id, !item.pinned)
                              }
                              title={item.pinned ? "Unpin" : "Pin"}
                              aria-label={item.pinned ? "Unpin" : "Pin"}
                              className={cn(
                                "rounded p-1 hover:bg-surface-hover",
                                item.pinned
                                  ? "text-accent"
                                  : "text-text-muted hover:text-text-primary"
                              )}
                            >
                              {item.pinned ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                group.grouped && item.groupKey
                                  ? dismissGroup(item.groupKey)
                                  : dismissNotification(item.id)
                              }
                              title="Delete"
                              aria-label="Delete"
                              className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-loss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {visibleCount < groups.length ? (
                    <li className="py-2 text-center text-[10px] text-text-faint">
                      Scroll for older notifications…
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {tab === "ai" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AICommandCenter />
          </div>
        ) : null}

        {tab === "activity" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {activity.length === 0 ? (
              <SmartEmptyState
                title="No activity yet"
                description="Portfolio updates, watchlist changes, AI recommendations and market refreshes appear here."
                actions={[{ label: "Open Dashboard", href: "/" }]}
              />
            ) : (
              <ol className="relative ml-2 space-y-3 border-l border-surface-border-subtle pl-4">
                {activity.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-surface-border bg-accent/60" />
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        if (event.href) {
                          router.push(event.href);
                          setOpen(false);
                        }
                      }}
                    >
                      <p className="text-xs text-text-primary">{event.message}</p>
                      <p className="mt-0.5 text-[10px] text-text-faint">
                        {ACTIVITY_CATEGORY_LABELS[event.category]} ·{" "}
                        {formatTimestamp(event.at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}

        {tab === "productivity" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ProductivityPanel />
          </div>
        ) : null}

        {tab === "actions" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              <Zap className="h-3 w-3" />
              Quick Action Center
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.run(router);
                    setOpen(false);
                  }}
                  className="rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-3 text-left text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:bg-accent/5 hover:text-text-primary"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                openCommandPalette();
                setOpen(false);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs font-semibold text-accent hover:bg-accent/15"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Open Command Palette
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
