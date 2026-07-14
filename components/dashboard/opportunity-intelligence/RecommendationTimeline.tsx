"use client";

import type { TimelineEvent } from "@/lib/opportunity-engine/institutional-presentation";

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function RecommendationTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Recommendation Timeline
      </p>
      <ol className="space-y-0">
        {events.map((event, index) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex w-4 flex-col items-center">
              <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
              {index < events.length - 1 ? (
                <span className="my-1 w-px flex-1 bg-surface-border" />
              ) : null}
            </div>
            <div className="pb-3">
              <p className="text-xs font-medium text-text-secondary">{event.label}</p>
              <p className="font-mono text-[11px] text-text-muted tabular-nums">
                {formatClock(event.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
