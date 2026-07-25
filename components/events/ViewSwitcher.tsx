"use client";

import { EVENT_VIEW_OPTIONS } from "@/constants/eventTypes";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { EventViewMode } from "@/types/event";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  GanttChart,
  List,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

const VIEW_ICONS: Record<EventViewMode, LucideIcon> = {
  day: Calendar,
  week: CalendarRange,
  month: CalendarDays,
  timeline: GanttChart,
  agenda: List,
};

interface ViewSwitcherProps {
  value: EventViewMode;
  onChange: (view: EventViewMode) => void;
}

export const ViewSwitcher = memo(function ViewSwitcher({
  value,
  onChange,
}: ViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      className="inline-flex h-9 w-full items-center gap-0.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/40 p-0.5 sm:w-auto"
    >
      {EVENT_VIEW_OPTIONS.map((option) => {
        const Icon = VIEW_ICONS[option.id];
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`${option.label} view`}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 sm:flex-none",
              selected
                ? "bg-accent/15 text-accent shadow-glow"
                : "text-text-muted hover:bg-surface-hover hover:text-text-secondary active:scale-[0.98]",
              FOCUS_RING_CLASS
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
});
