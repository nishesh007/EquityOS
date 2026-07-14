"use client";

import type { InstitutionalTimelineEvent } from "@/lib/dashboard/institutional-history-presentation";
import { TimelineEventCard } from "@/components/dashboard/institutional/TimelineEventCard";

export function ValidationTimeline({
  events,
  emptyMessage = "Awaiting Validation",
}: {
  events: InstitutionalTimelineEvent[];
  emptyMessage?: string;
}) {
  const rows = events.filter((e) => e.source === "Validation");
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-text-muted" data-testid="validation-timeline-empty">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="validation-timeline">
      {rows.map((event) => (
        <TimelineEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
