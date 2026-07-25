"use client";

import { EventCard } from "@/components/events/EventCard";
import { EventEmptyState } from "@/components/events/EventEmptyState";
import {
  formatDisplayDate,
  groupEventsByDate,
  timelineBucket,
} from "@/src/core/events";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { EventIntelligenceEvent } from "@/types/event";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

const BUCKET_LABELS = {
  today: "Today",
  tomorrow: "Tomorrow",
  future: "Upcoming",
  past: "Past",
} as const;

const BUCKET_ORDER = ["today", "tomorrow", "future", "past"] as const;

interface EventTimelineProps {
  events: readonly EventIntelligenceEvent[];
  today: string;
  onViewDetails?: (event: EventIntelligenceEvent) => void;
  onResetFilters?: () => void;
}

export function EventTimeline({
  events,
  today,
  onViewDetails,
  onResetFilters,
}: EventTimelineProps) {
  const grouped = useMemo(() => groupEventsByDate(events), [events]);
  const dates = useMemo(
    () => [...grouped.keys()].sort((a, b) => a.localeCompare(b)),
    [grouped]
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function isDayExpanded(date: string): boolean {
    if (date in expanded) return expanded[date]!;
    const bucket = timelineBucket(date, today);
    return bucket === "today" || bucket === "tomorrow";
  }

  if (dates.length === 0) {
    return <EventEmptyState onReset={onResetFilters} />;
  }

  const byBucket = BUCKET_ORDER.map((bucket) => ({
    bucket,
    dates: dates.filter((date) => timelineBucket(date, today) === bucket),
  })).filter((entry) => entry.dates.length > 0);

  return (
    <div className="space-y-4" data-testid="event-timeline">
      {byBucket.map(({ bucket, dates: bucketDates }) => (
        <section key={bucket} aria-labelledby={`timeline-${bucket}`}>
          <h2
            id={`timeline-${bucket}`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-primary"
          >
            {BUCKET_LABELS[bucket]}
          </h2>
          <ol className="relative space-y-2.5 border-l border-surface-border-subtle pl-5">
            {bucketDates.map((date) => {
              const dayEvents = grouped.get(date) ?? [];
              const isOpen = isDayExpanded(date);
              return (
                <li key={date} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[1.4rem] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-surface",
                      date === today
                        ? "bg-accent"
                        : "bg-surface-border"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [date]: !isOpen,
                      }))
                    }
                    aria-expanded={isOpen}
                    className={cn(
                      "mb-2 flex w-full items-center justify-between rounded-lg border border-surface-border-subtle/80 bg-surface-overlay/30 px-3 py-2 text-left transition-colors hover:bg-surface-hover/50",
                      FOCUS_RING_CLASS
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {formatDisplayDate(date)}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {dayEvents.length === 1
                          ? "1 event"
                          : `${dayEvents.length} events`}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-text-muted transition-transform",
                        isOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  {isOpen ? (
                    <div className="space-y-2.5">
                      {dayEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          compact
                          onViewDetails={onViewDetails}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
