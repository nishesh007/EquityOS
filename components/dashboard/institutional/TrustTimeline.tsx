"use client";

import type { InstitutionalTimelineEvent } from "@/lib/dashboard/institutional-history-presentation";
import { TimelineEventCard } from "@/components/dashboard/institutional/TimelineEventCard";

export function TrustTimeline({
  events,
  emptyMessage = "No History Yet",
}: {
  events: InstitutionalTimelineEvent[];
  emptyMessage?: string;
}) {
  const rows = events.filter((e) => e.source === "Trust");
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-text-muted" data-testid="trust-timeline-empty">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="trust-timeline">
      {rows.map((event) => (
        <TimelineEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
