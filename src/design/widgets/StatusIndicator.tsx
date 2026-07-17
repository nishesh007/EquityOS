import { cn } from "@/lib/utils";

export type IndicatorState = "live" | "ok" | "warning" | "error" | "idle";

interface StatusIndicatorProps {
  state: IndicatorState;
  label?: string;
  /** Pulsing dot for live states (disabled under reduced motion via CSS). */
  pulse?: boolean;
  className?: string;
}

const STATE_CLASSES: Record<IndicatorState, string> = {
  live: "bg-gain",
  ok: "bg-gain",
  warning: "bg-warning",
  error: "bg-loss",
  idle: "bg-text-faint",
};

const STATE_TEXT: Record<IndicatorState, string> = {
  live: "text-gain",
  ok: "text-gain",
  warning: "text-warning",
  error: "text-loss",
  idle: "text-text-muted",
};

/** Compact status dot + label (LIVE, OK, DEGRADED, ...). */
export function StatusIndicator({
  state,
  label,
  pulse = state === "live",
  className,
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              STATE_CLASSES[state],
            )}
          />
        )}
        <span
          className={cn("relative inline-flex h-2 w-2 rounded-full", STATE_CLASSES[state])}
        />
      </span>
      {label && (
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wider",
            STATE_TEXT[state],
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
