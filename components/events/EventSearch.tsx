"use client";

import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import { Search, X } from "lucide-react";

interface EventSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export function EventSearch({
  value,
  onChange,
  onClear,
  placeholder = "Search company, ticker, sector, event…",
  className,
}: EventSearchProps) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search events"
        className={cn(
          "h-9 w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/50 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted",
          "transition-[border-color,background-color] hover:border-surface-border",
          FOCUS_RING_CLASS
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          aria-label="Clear search"
          className={cn(
            "absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-secondary",
            FOCUS_RING_CLASS
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
