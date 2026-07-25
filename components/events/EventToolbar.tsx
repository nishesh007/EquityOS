"use client";

import { EventSearch } from "@/components/events/EventSearch";
import { ViewSwitcher } from "@/components/events/ViewSwitcher";
import { IconButton } from "@/components/ui/IconButton";
import { formatDisplayDate } from "@/src/core/events";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { EventViewMode } from "@/types/event";
import { CalendarDays, Filter, RefreshCw } from "lucide-react";
import { memo } from "react";

interface EventToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onToday: () => void;
  onRefresh: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  view: EventViewMode;
  onViewChange: (view: EventViewMode) => void;
  isRefreshing?: boolean;
}

const controlClass = cn(
  "h-9 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 text-xs font-semibold text-text-secondary",
  "transition-[border-color,background-color,color] duration-150",
  "hover:border-surface-border hover:bg-surface-hover hover:text-text-primary",
  FOCUS_RING_CLASS
);

export const EventToolbar = memo(function EventToolbar({
  searchQuery,
  onSearchChange,
  selectedDate,
  onDateChange,
  onToday,
  onRefresh,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  view,
  onViewChange,
  isRefreshing = false,
}: EventToolbarProps) {
  return (
    <div
      className="rounded-xl border border-surface-border-subtle bg-surface-raised/70 px-3 py-2.5 shadow-card"
      data-testid="event-toolbar"
    >
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:gap-3">
        <EventSearch
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full xl:max-w-sm xl:flex-none"
        />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="relative inline-flex h-9 items-center">
            <span className="sr-only">Select date</span>
            <CalendarDays
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-text-faint"
              aria-hidden
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              aria-label="Event date"
              className={cn(
                controlClass,
                "pl-8 pr-2 font-normal text-text-primary"
              )}
            />
          </label>

          <button type="button" onClick={onToday} className={cn(controlClass, "px-3")}>
            Today
          </button>

          <IconButton
            label="Refresh events"
            onClick={onRefresh}
            size="md"
            className={cn(
              "h-9 w-9 border border-surface-border-subtle bg-surface-overlay/50",
              isRefreshing && "[&_svg]:animate-spin"
            )}
            disabled={isRefreshing}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </IconButton>

          <button
            type="button"
            onClick={onToggleFilters}
            aria-pressed={filtersOpen}
            aria-label={filtersOpen ? "Hide filters" : "Show filters"}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-[border-color,background-color,color] duration-150",
              filtersOpen
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-surface-border-subtle bg-surface-overlay/50 text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              FOCUS_RING_CLASS
            )}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filters
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/20 px-1 text-[10px] font-bold text-accent">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div className="ml-auto w-full sm:w-auto">
            <ViewSwitcher value={view} onChange={onViewChange} />
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-text-faint">
        Focus · {formatDisplayDate(selectedDate)}
      </p>
    </div>
  );
});
