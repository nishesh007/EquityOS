"use client";

import {
  TIMELINE_FILTERS,
  type TimelineFilterSource,
} from "@/lib/dashboard/institutional-history-presentation";

export function TimelineFilterBar({
  value,
  onChange,
}: {
  value: TimelineFilterSource;
  onChange: (next: TimelineFilterSource) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1"
      data-testid="timeline-filter-bar"
      role="tablist"
      aria-label="Timeline filters"
    >
      {TIMELINE_FILTERS.map((filter) => {
        const active = filter === value;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter)}
            className={`rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition ${
              active
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-surface-border-subtle text-text-faint hover:bg-surface-hover"
            }`}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
