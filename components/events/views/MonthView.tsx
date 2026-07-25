"use client";

import { EventCard } from "@/components/events/EventCard";
import { EventEmptyState } from "@/components/events/EventEmptyState";
import { getEventTypeColors } from "@/constants/eventColors";
import { getEventTypeLabel } from "@/constants/eventTypes";
import {
  addDays,
  endOfMonth,
  formatDisplayDate,
  formatShortDate,
  groupEventsByDate,
  isSameMonth,
  parseDateKey,
  startOfMonth,
  startOfWeek,
} from "@/src/core/events";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { EventIntelligenceEvent } from "@/types/event";
import { useMemo } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthViewProps {
  selectedDate: string;
  today: string;
  events: readonly EventIntelligenceEvent[];
  onSelectDate: (date: string) => void;
  onViewDetails?: (event: EventIntelligenceEvent) => void;
  onResetFilters?: () => void;
}

export function MonthView({
  selectedDate,
  today,
  events,
  onSelectDate,
  onViewDetails,
  onResetFilters,
}: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart);
  const cells = useMemo(() => {
    const list: string[] = [];
    let cursor = gridStart;
    while (list.length < 42) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [gridStart]);

  const grouped = useMemo(() => groupEventsByDate(events), [events]);
  const selectedDayEvents = grouped.get(selectedDate) ?? [];
  const monthLabel = parseDateKey(selectedDate).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const monthEventCount = events.filter(
    (event) => event.date >= monthStart && event.date <= monthEnd
  ).length;

  return (
    <section aria-label="Month view">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">{monthLabel}</h2>
        <p className="text-xs text-text-secondary">
          {monthEventCount === 1
            ? "1 event this month"
            : `${monthEventCount} events this month`}
        </p>
      </header>

      {monthEventCount === 0 ? (
        <EventEmptyState onReset={onResetFilters} />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-surface-border-subtle">
            <div className="grid grid-cols-7 border-b border-surface-border-subtle bg-surface-overlay/40">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-secondary"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-surface-border-subtle">
              {cells.map((day) => {
                const inMonth = isSameMonth(day, selectedDate);
                const dayEvents = grouped.get(day) ?? [];
                const isToday = day === today;
                const isSelected = day === selectedDate;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onSelectDate(day)}
                    aria-label={`${formatShortDate(day)}, ${dayEvents.length} events`}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "flex min-h-[96px] flex-col gap-1 bg-surface-raised/80 p-2 text-left transition-colors hover:bg-surface-hover/40",
                      !inMonth && "bg-surface/60 opacity-55",
                      isSelected && "ring-1 ring-inset ring-accent/40",
                      FOCUS_RING_CLASS
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                        isToday
                          ? "bg-accent text-white"
                          : "text-text-secondary"
                      )}
                    >
                      {parseDateKey(day).getDate()}
                    </span>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const colors = getEventTypeColors(event.eventType);
                        return (
                          <span
                            key={event.id}
                            className={cn(
                              "block truncate rounded border px-1 py-0.5 text-[9px] font-medium",
                              colors.chip
                            )}
                            title={event.title}
                          >
                            {event.ticker ?? getEventTypeLabel(event.eventType)}
                          </span>
                        );
                      })}
                      {dayEvents.length > 3 ? (
                        <span className="text-[9px] text-text-muted">
                          +{dayEvents.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {formatDisplayDate(selectedDate)}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-surface-border-subtle px-4 py-6 text-center text-xs text-text-secondary">
                No events on the selected day.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {selectedDayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
