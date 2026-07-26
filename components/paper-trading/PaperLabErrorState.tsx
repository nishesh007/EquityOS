"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";

interface PaperLabErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/**
 * Institutional error surface — no raw stack traces.
 */
export function PaperLabErrorState({
  title = "Unable to load Paper Trading Lab data",
  message,
  onRetry,
  retrying,
  className,
}: PaperLabErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-loss/30 bg-loss/5 px-5 py-10 text-center animate-fade-in",
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-loss/15 text-loss ring-1 ring-loss/30">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-text-secondary">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={cn(
            "mt-4 inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-60",
            FOCUS_RING_CLASS
          )}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", retrying && "animate-spin")}
            aria-hidden
          />
          {retrying ? "Retrying…" : "Retry"}
        </button>
      ) : null}
    </div>
  );
}
