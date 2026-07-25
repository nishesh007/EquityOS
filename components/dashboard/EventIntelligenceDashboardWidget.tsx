"use client";

import { EventAwarenessBadge } from "@/components/events/EventAwarenessBadges";
import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  buildDashboardEventBuckets,
  dashboardEventService,
} from "@/src/core/events/integration";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import { cn } from "@/lib/utils";
import type { EventIntelligenceEvent } from "@/types/event";
import { CalendarClock, Landmark, LineChart, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function EventRow({
  event,
  today,
  onOpen,
}: {
  event: EventIntelligenceEvent;
  today: string;
  onOpen: (event: EventIntelligenceEvent) => void;
}) {
  const countdown = dashboardEventService.countdown(event.date, today);
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="flex w-full items-start justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-surface-border-subtle hover:bg-surface-hover/50"
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-text-primary">
          {event.ticker ? `${event.ticker} · ` : ""}
          {event.title}
        </p>
        <p className="mt-0.5 text-[10px] text-text-secondary">
          {event.date}
          {event.time ? ` · ${event.time}` : ""}
          {event.impactScore != null ? ` · Impact ${event.impactScore}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {event.importance === "critical" || event.importance === "high" ? (
          <EventAwarenessBadge
            kind={event.importance === "critical" ? "critical" : "high_impact"}
          />
        ) : null}
        <span className="font-mono text-[10px] text-text-secondary">
          {countdown.label}
        </span>
      </div>
    </button>
  );
}

function WidgetBlock({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: typeof CalendarClock;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/30 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          {title}
        </p>
      </div>
      {empty ? (
        <p className="px-2 py-3 text-[11px] text-text-secondary">None scheduled.</p>
      ) : (
        <div className="space-y-0.5">{children}</div>
      )}
    </div>
  );
}

/** Dashboard Event Intelligence composite (Sprint 10D.5). */
export function EventIntelligenceDashboardWidget() {
  const drawer = useOptionalGlobalEventDrawer();
  const today = useMemo(() => toDateKey(new Date()), []);
  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);
  const buckets = useMemo(
    () => buildDashboardEventBuckets(catalog, today),
    [catalog, today]
  );

  const open = (event: EventIntelligenceEvent) => {
    if (drawer) drawer.openEvent(event);
  };

  return (
    <Card padding="md" className="h-full" data-testid="event-intelligence-dashboard">
      <CardHeader
        title="Event Intelligence"
        subtitle="Critical catalysts · earnings · corporate actions · macro"
        action={
          <Link
            href="/events"
            className="text-[11px] font-semibold text-accent hover:underline"
          >
            Open calendar
          </Link>
        }
      />
      <div className={cn("grid gap-2 sm:grid-cols-2")}>
        <WidgetBlock
          title="Upcoming Critical Events"
          icon={CalendarClock}
          empty={buckets.criticalUpcoming.length === 0}
        >
          {buckets.criticalUpcoming.slice(0, 4).map((event) => (
            <EventRow key={event.id} event={event} today={today} onOpen={open} />
          ))}
        </WidgetBlock>
        <WidgetBlock
          title="Today's Earnings"
          icon={LineChart}
          empty={buckets.todaysEarnings.length === 0}
        >
          {buckets.todaysEarnings.slice(0, 4).map((event) => (
            <EventRow key={event.id} event={event} today={today} onOpen={open} />
          ))}
        </WidgetBlock>
        <WidgetBlock
          title="Today's Corporate Actions"
          icon={Scale}
          empty={buckets.todaysCorporateActions.length === 0}
        >
          {buckets.todaysCorporateActions.slice(0, 4).map((event) => (
            <EventRow key={event.id} event={event} today={today} onOpen={open} />
          ))}
        </WidgetBlock>
        <WidgetBlock
          title="Today's Macro Events"
          icon={Landmark}
          empty={buckets.todaysMacro.length === 0}
        >
          {buckets.todaysMacro.slice(0, 4).map((event) => (
            <EventRow key={event.id} event={event} today={today} onOpen={open} />
          ))}
        </WidgetBlock>
      </div>
    </Card>
  );
}
