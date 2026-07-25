"use client";

import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface EventErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function EventErrorState({
  message = "Unable to load event intelligence. Please try again.",
  onRetry,
}: EventErrorStateProps) {
  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-red-500/25 bg-red-500/5 px-5 py-8 text-center"
      role="alert"
      data-testid="event-error-state"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-300 ring-1 ring-red-500/20">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-text-secondary">
        Something went wrong
      </p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-text-primary">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary",
            FOCUS_RING_CLASS
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Retry
        </button>
      ) : null}
    </div>
  );
}
