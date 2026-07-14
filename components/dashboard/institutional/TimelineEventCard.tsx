"use client";

import type { InstitutionalTimelineEvent } from "@/lib/dashboard/institutional-history-presentation";
import { formatOptionalTimestamp } from "@/lib/dashboard/display-value";

export function TimelineEventCard({
  event,
}: {
  event: InstitutionalTimelineEvent;
}) {
  return (
    <article
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/25 px-3 py-2.5"
      data-testid="timeline-event-card"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-primary">{event.label}</p>
        <span className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-faint">
          {event.source}
        </span>
      </div>
      <p className="mb-2 font-mono text-[10px] text-text-muted tabular-nums">
        {formatOptionalTimestamp(event.timestamp, "Awaiting Validation")}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div>
          <dt className="text-text-faint">Engine</dt>
          <dd className="text-text-secondary">{event.engine}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Confidence</dt>
          <dd className="font-mono text-text-secondary">{event.confidence}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Old Value</dt>
          <dd className="text-text-secondary">{event.oldValue}</dd>
        </div>
        <div>
          <dt className="text-text-faint">New Value</dt>
          <dd className="text-text-secondary">{event.newValue}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-faint">Reason</dt>
          <dd className="text-text-secondary">{event.reason}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-faint">Evidence</dt>
          <dd className="text-text-secondary">{event.evidence}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Validation Grade</dt>
          <dd className="font-mono text-text-secondary">{event.validationGrade}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Trust Grade</dt>
          <dd className="font-mono text-text-secondary">{event.trustGrade}</dd>
        </div>
      </dl>
    </article>
  );
}
