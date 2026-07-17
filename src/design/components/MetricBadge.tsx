import { cn } from "@/lib/utils";

interface MetricBadgeProps {
  /** Signed numeric change; sign drives gain/loss coloring. */
  value: number;
  /** Pre-formatted display string; defaults to a signed percentage. */
  label?: string;
  className?: string;
}

/** Compact numeric badge colored by direction (gain / loss / flat). */
export function MetricBadge({ value, label, className }: MetricBadgeProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const display =
    label ?? `${value > 0 ? "+" : ""}${Number.isFinite(value) ? value.toFixed(2) : "—"}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums",
        direction === "up" && "bg-gain/10 text-gain",
        direction === "down" && "bg-loss/10 text-loss",
        direction === "flat" && "bg-surface-hover text-text-muted",
        className,
      )}
    >
      {display}
    </span>
  );
}
