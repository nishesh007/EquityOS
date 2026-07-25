"use client";

import { EventCard } from "@/components/events/EventCard";
import { EventEmptyState } from "@/components/events/EventEmptyState";
import {
  formatDisplayDate,
  groupEventsByDate,
} from "@/src/core/events";
import type { EventIntelligenceEvent } from "@/types/event";
import { useMemo } from "react";

interface AgendaViewProps {
  events: readonly EventIntelligenceEvent[];
  onViewDetails?: (event: EventIntelligenceEvent) => void;
  onResetFilters?: () => void;
}

export function AgendaView({
  events,
  onViewDetails,
  onResetFilters,
}: AgendaViewProps) {
  const grouped = useMemo(() => groupEventsByDate(events), [events]);
  const dates = useMemo(
    () => [...grouped.keys()].sort((a, b) => a.localeCompare(b)),
    [grouped]
  );

  if (dates.length === 0) {
    return <EventEmptyState onReset={onResetFilters} />;
  }

  return (
    <section aria-label="Agenda view" className="space-y-6">
      {dates.map((date) => {
        const dayEvents = grouped.get(date) ?? [];
        return (
          <div key={date}>
            <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-surface-border-subtle pb-2">
              <h2 className="text-sm font-semibold text-text-primary">
                {formatDisplayDate(date)}
              </h2>
              <span className="text-[11px] text-text-secondary">
                {dayEvents.length === 1
                  ? "1 item"
                  : `${dayEvents.length} items`}
              </span>
            </header>
            <div className="space-y-2.5">
              {dayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
