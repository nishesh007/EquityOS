"use client";

/**
 * Sprint 10C.R7 — notification center + activity feed panel.
 *
 * Right-hand slide-over with category tabs, unread/pinned filters,
 * per-item read/pin/dismiss, mark-all-read and the activity feed.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onUiEvent } from "../command/uiBus";
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  pinNotification,
  subscribeNotifications,
  type AppNotification,
  type NotificationCategory,
} from "./notificationEngine";
import {
  ACTIVITY_CATEGORY_LABELS,
  getActivityFeed,
  type ActivityEvent,
} from "./activityFeed";
import { SmartEmptyState } from "./SmartEmptyState";

type Filter = "all" | "unread" | "pinned" | NotificationCategory;

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "pinned", label: "Pinned" },
  { id: "research", label: "Research" },
  { id: "recommendation", label: "Recs" },
  { id: "portfolio", label: "Portfolio" },
  { id: "alert", label: "Alerts" },
  { id: "validation", label: "Validation" },
  { id: "calendar", label: "Calendar" },
  { id: "news", label: "News" },
  { id: "system", label: "System" },
];

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notifications" | "activity">("notifications");
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const refresh = useCallback(() => {
    setItems(
      listNotifications(filter === "all" ? undefined : filter)
    );
    setActivity(getActivityFeed(undefined, 40));
  }, [filter]);

  useEffect(() => {
    const offOpen = onUiEvent("show-notifications", () => {
      setOpen(true);
    });
    const offChange = subscribeNotifications(refresh);
    return () => {
      offOpen();
      offChange();
    };
  }, [refresh]);

  useEffect(() => {
    if (open) refresh();
  }, [open, filter, tab, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-surface/50 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notification center"
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-surface-border bg-card shadow-overlay animate-slide-in"
      >
        <header className="flex items-center justify-between border-b border-surface-border-subtle px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Bell className="h-4 w-4" /> Notifications
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              title="Mark all read"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex border-b border-surface-border-subtle px-4">
          {(["notifications", "activity"] as const).map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              aria-pressed={tab === tabId}
              className={cn(
                "border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors",
                tab === tabId
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              )}
            >
              {tabId === "notifications" ? "Inbox" : "Activity Feed"}
            </button>
          ))}
        </div>

        {tab === "notifications" ? (
          <>
            <div className="flex flex-wrap gap-1 px-4 py-2">
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
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {items.length === 0 ? (
                <SmartEmptyState
                  title="You're all caught up"
                  description="Research, recommendation, portfolio and system updates will land here as they happen."
                  actions={[{ label: "Open AI Insights", href: "/opportunities" }]}
                />
              ) : (
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "group rounded-lg border border-surface-border-subtle p-3 transition-colors",
                        item.read ? "bg-transparent" : "bg-accent/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!item.read && (
                          <span
                            aria-label="Unread"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary">
                            {item.title}
                          </p>
                          {item.body && (
                            <p className="mt-0.5 text-[11px] text-text-muted">
                              {item.body}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-text-faint">
                            {item.category} · {timeAgo(item.at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          {!item.read && (
                            <button
                              type="button"
                              onClick={() => markNotificationRead(item.id)}
                              title="Mark read"
                              aria-label={`Mark "${item.title}" read`}
                              className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => pinNotification(item.id, !item.pinned)}
                            title={item.pinned ? "Unpin" : "Pin"}
                            aria-label={`${item.pinned ? "Unpin" : "Pin"} "${item.title}"`}
                            className={cn(
                              "rounded p-1 hover:bg-surface-hover",
                              item.pinned ? "text-accent" : "text-text-muted hover:text-text-primary"
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
                            onClick={() => dismissNotification(item.id)}
                            title="Dismiss"
                            aria-label={`Dismiss "${item.title}"`}
                            className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-loss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {activity.length === 0 ? (
              <SmartEmptyState
                title="No activity yet"
                description="Workspace changes, exports, research updates and AI decisions will be tracked here."
                actions={[{ label: "Customize dashboard", href: "/" }]}
              />
            ) : (
              <ol className="relative ml-2 space-y-3 border-l border-surface-border-subtle pl-4">
                {activity.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-surface-border bg-accent/60" />
                    <p className="text-xs text-text-primary">{event.message}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-text-faint">
                      {ACTIVITY_CATEGORY_LABELS[event.category]} · {timeAgo(event.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
