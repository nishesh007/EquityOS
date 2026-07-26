"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type {
  CycleStatus,
  WalkForwardFilterState,
} from "@/lib/optimization";

const STATUSES: Array<"all" | CycleStatus> = [
  "all",
  "Passed",
  "Failed",
  "Insufficient Data",
];

export interface ValidationFiltersProps {
  filters: WalkForwardFilterState;
  onChange: (patch: Partial<WalkForwardFilterState>) => void;
}

export const ValidationFilters = memo(function ValidationFilters({
  filters,
  onChange,
}: ValidationFiltersProps) {
  return (
    <Card hover={false} padding="sm" data-testid="validation-filters">
      <CardHeader title="Filters" subtitle="Narrow cycle results" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Status filter">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filters.status === status}
              onClick={() => onChange({ status })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                filters.status === status
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-surface-border-subtle text-text-secondary"
              )}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search cycles…"
          aria-label="Search validation cycles"
          className="min-w-[160px] flex-1 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        />
      </div>
    </Card>
  );
});
