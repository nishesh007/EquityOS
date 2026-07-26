"use client";

import { cn } from "@/lib/utils";

/**
 * Accessible progress indicator for long-running backtesting workflows.
 */
export function BacktestingProgress({
  label,
  progress,
  message,
  onCancel,
  cancellable,
  className,
}: {
  label: string;
  progress: number;
  message?: string;
  onCancel?: () => void;
  cancellable?: boolean;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3 contrast-more:border-2",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy={clamped < 100}
      data-testid="backtesting-progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-text-primary">{label}</p>
          {message ? (
            <p className="mt-0.5 text-[11px] text-text-muted">{message}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-[11px] font-semibold text-text-secondary">
            {Math.round(clamped)}%
          </span>
          {cancellable && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-surface-border-subtle px-2 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
