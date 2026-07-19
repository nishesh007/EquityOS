"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EarningsAlertCard } from "@/components/dashboard/earnings/EarningsAlertCard";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import {
  ALERT_EMPTY,
  buildNotificationCenterView,
  getEarningsAlertEngine,
  getEarningsNotificationCenter,
  type AlertInboxSection,
  type NotificationCenterView,
  type QuickActionId,
} from "@/src/core/earnings/alerts";

interface EarningsNotificationCenterPanelProps {
  events: EarningsCalendarEvent[];
  compact?: boolean;
}

const SECTIONS: Array<{ id: AlertInboxSection; label: string }> = [
  { id: "unread", label: "Unread" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "upcoming", label: "Upcoming" },
  { id: "portfolio", label: "Portfolio" },
  { id: "watchlist", label: "Watchlist" },
  { id: "completed", label: "Completed" },
  { id: "dismissed", label: "Dismissed" },
];

function emptyFor(section: AlertInboxSection): string {
  return getEarningsNotificationCenter().getEmptyMessage(section);
}

export function EarningsNotificationCenterPanel({
  events,
  compact = false,
}: EarningsNotificationCenterPanelProps) {
  const [section, setSection] = useState<AlertInboxSection>("unread");
  const [, setTick] = useState(0);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  const alerts = getEarningsAlertEngine().generateForEvents(events);
  const inbox: NotificationCenterView = buildNotificationCenterView(alerts);

  const cards = inbox[section];
  const emptyMessage =
    cards.length === 0 ? emptyFor(section) : "";

  const handleAction = (alertId: string, action: QuickActionId) => {
    startTransition(() => {
      const result = getEarningsNotificationCenter().applyQuickAction(
        alertId,
        action
      );
      setToast(result.message);
      if (result.href && typeof window !== "undefined") {
        window.location.assign(result.href);
        return;
      }
      setTick((n) => n + 1);
    });
  };

  return (
    <div data-testid="earnings-notification-center">
      <Card padding="lg">
        <CardHeader
          title="Earnings Alert Center"
          subtitle="Institutional inbox · smart reminders · AI priority"
          action={
            <div className="flex items-center gap-2">
              {inbox.unreadCount > 0 ? (
                <Badge variant="accent" size="sm">
                  {inbox.unreadCount} unread
                </Badge>
              ) : null}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Bell className="h-4 w-4 text-accent" />
              </div>
            </div>
          }
        />

        <div className="mb-3 flex flex-wrap gap-1">
          {SECTIONS.map((item) => {
            const count = inbox[item.id].length;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                  active
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-surface-border-subtle text-text-muted hover:border-surface-border"
                }`}
                data-testid={`alert-section-${item.id}`}
              >
                {item.label}
                {count > 0 ? ` · ${count}` : ""}
              </button>
            );
          })}
        </div>

        {toast ? (
          <p className="mb-2 text-[10px] text-accent" data-testid="alert-toast">
            {toast}
          </p>
        ) : null}

        {cards.length === 0 ? (
          <p
            className="py-6 text-center text-xs text-text-muted"
            data-testid="alert-empty-state"
          >
            {emptyMessage || ALERT_EMPTY.noActive}
          </p>
        ) : (
          <div
            className={`space-y-2 ${compact ? "max-h-80 overflow-y-auto" : "max-h-[28rem] overflow-y-auto"}`}
          >
            {cards.map((card) => (
              <EarningsAlertCard
                key={card.id}
                card={card}
                onAction={handleAction}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-text-faint">
          <span>No push delivery · Sprint 9C Alert Engine ready</span>
          <Link href="/results" className="text-accent hover:underline">
            Full earnings dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}
