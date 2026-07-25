"use client";

import { EventCard } from "@/components/events/EventCard";
import { EventEmptyState } from "@/components/events/EventEmptyState";
import { formatDisplayDate } from "@/src/core/events";
import type { EventIntelligenceEvent } from "@/types/event";

interface DayViewProps {
  date: string;
  events: readonly EventIntelligenceEvent[];
  onViewDetails?: (event: EventIntelligenceEvent) => void;
  onResetFilters?: () => void;
}

export function DayView({
  date,
  events,
  onViewDetails,
  onResetFilters,
}: DayViewProps) {
  return (
    <section aria-label={`Day view for ${formatDisplayDate(date)}`}>
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">
          {formatDisplayDate(date)}
        </h2>
        <p className="text-xs text-text-secondary">
          {events.length === 1
            ? "1 event scheduled"
            : `${events.length} events scheduled`}
        </p>
      </header>
      {events.length === 0 ? (
        <EventEmptyState
          title="No major events found for the selected filters."
          message="Try another date range or explore upcoming events."
          onReset={onResetFilters}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </section>
  );
}
