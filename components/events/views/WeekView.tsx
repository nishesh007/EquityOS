"use client";

import { EventCard } from "@/components/events/EventCard";
import { EventEmptyState } from "@/components/events/EventEmptyState";
import {
  addDays,
  formatShortDate,
  formatWeekday,
  groupEventsByDate,
  startOfWeek,
} from "@/src/core/events";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { EventIntelligenceEvent } from "@/types/event";
import { useMemo } from "react";

interface WeekViewProps {
  selectedDate: string;
  today: string;
  events: readonly EventIntelligenceEvent[];
  onSelectDate: (date: string) => void;
  onViewDetails?: (event: EventIntelligenceEvent) => void;
  onResetFilters?: () => void;
}

export function WeekView({
  selectedDate,
  today,
  events,
  onSelectDate,
  onViewDetails,
  onResetFilters,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const grouped = useMemo(() => groupEventsByDate(events), [events]);
  const total = events.length;

  return (
    <section aria-label="Week view">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Week of {formatShortDate(weekStart)}
        </h2>
        <p className="text-xs text-text-secondary">
          {total === 1 ? "1 event this week" : `${total} events this week`}
        </p>
      </header>

      {total === 0 ? (
        <EventEmptyState onReset={onResetFilters} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((day) => {
            const dayEvents = grouped.get(day) ?? [];
            const isToday = day === today;
            const isSelected = day === selectedDate;
            return (
              <div
                key={day}
                className={cn(
                  "flex min-h-[160px] flex-col rounded-xl border bg-surface-raised/60 p-2.5 transition-[border-color] duration-150",
                  isSelected
                    ? "border-accent/40 ring-1 ring-accent/20"
                    : "border-surface-border-subtle"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "mb-2 flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left",
                    FOCUS_RING_CLASS
                  )}
                  aria-label={`Select ${formatShortDate(day)}`}
                >
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                      {formatWeekday(day)}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isToday ? "text-accent" : "text-text-primary"
                      )}
                    >
                      {formatShortDate(day)}
                    </span>
                  </span>
                  <span className="rounded-full bg-surface-overlay px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                    {dayEvents.length}
                  </span>
                </button>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      compact
                      onViewDetails={onViewDetails}
                    />
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="px-1 text-[10px] text-text-muted">
                      +{dayEvents.length - 3} more
                    </p>
                  ) : null}
                  {dayEvents.length === 0 ? (
                    <p className="px-1 py-4 text-center text-[10px] text-text-muted">
                      —
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
