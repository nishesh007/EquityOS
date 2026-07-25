"use client";

import { EventAwarenessBadgeRow } from "@/components/events/EventAwarenessBadges";
import { EventStarButton } from "@/components/events/EventStarButton";
import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  deriveAwarenessKinds,
  eventCountdown,
  findEventById,
  myEventsStore,
} from "@/src/core/events/integration";
import type { EventIntelligenceEvent } from "@/types/event";
import { Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface MyEventsPanelProps {
  catalog: readonly EventIntelligenceEvent[];
  today: string;
  onOpenEvent?: (event: EventIntelligenceEvent) => void;
}

/** Saved / starred events (My Events) — localStorage backed. */
export function MyEventsPanel({
  catalog,
  today,
  onOpenEvent,
}: MyEventsPanelProps) {
  const drawer = useOptionalGlobalEventDrawer();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "equityos.events.saved.v1") setVersion((v) => v + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const saved = useMemo(() => {
    void version;
    return myEventsStore.list();
  }, [version]);

  const rows = useMemo(() => {
    return saved
      .map((record) => {
        const event = findEventById(catalog, record.eventId);
        if (!event) return null;
        return {
          record,
          event,
          countdown: eventCountdown(event.date, today),
          awareness: deriveAwarenessKinds(event, today),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.event.date.localeCompare(b.event.date));
  }, [saved, catalog, today]);

  const upcoming = rows.filter((r) => r.countdown.days >= 0);

  const open = (event: EventIntelligenceEvent) => {
    if (onOpenEvent) {
      onOpenEvent(event);
      return;
    }
    drawer?.openEvent(event);
  };

  return (
    <Card padding="md" data-testid="my-events-panel">
      <CardHeader
        title="My Events"
        subtitle={
          upcoming.length > 0
            ? `${upcoming.length} upcoming saved · ${rows.length} total`
            : "Star events from the drawer to bookmark catalysts"
        }
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <Star className="h-4 w-4 text-amber-200" />
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="px-1 py-3 text-[11px] text-text-secondary">
          No saved events yet. Open any event and tap the star to add it here.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 12).map(({ event, countdown, awareness }) => (
            <li
              key={event.id}
              className="flex items-start gap-2 rounded-md border border-surface-border-subtle/80 bg-surface/30 px-2.5 py-2"
            >
              <button
                type="button"
                onClick={() => open(event)}
                aria-label={`Open saved event ${event.title}`}
                className="min-w-0 flex-1 text-left transition-opacity hover:opacity-90"
              >
                <p className="truncate text-[12px] font-semibold text-text-primary">
                  {event.ticker ? `${event.ticker} · ` : ""}
                  {event.title}
                </p>
                <p className="mt-0.5 text-[10px] text-text-secondary">
                  {event.date}
                  {event.time ? ` · ${event.time}` : ""} · {countdown.label}
                </p>
                <EventAwarenessBadgeRow
                  kinds={awareness}
                  max={2}
                  className="mt-1.5"
                />
              </button>
              <EventStarButton eventId={event.id} onChange={refresh} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
