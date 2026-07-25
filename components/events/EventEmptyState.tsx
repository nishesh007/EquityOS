"use client";

import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { CalendarSearch } from "lucide-react";
import { memo } from "react";

interface EventEmptyStateProps {
  title?: string;
  message?: string;
  onReset?: () => void;
}

export const EventEmptyState = memo(function EventEmptyState({
  title = "No major events found for the selected filters.",
  message = "Try another date range or explore upcoming events.",
  onReset,
}: EventEmptyStateProps) {
  return (
    <EmptyStatePanel
      icon={CalendarSearch}
      title={title}
      message={message}
      source="Event Intelligence"
      action={
        onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Reset filters
          </button>
        ) : undefined
      }
      className="min-h-[180px] py-6"
    />
  );
});
