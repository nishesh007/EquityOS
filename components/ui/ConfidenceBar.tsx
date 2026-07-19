import { cn } from "@/lib/utils";

/**
 * Horizontal confidence bar — visual only.
 * Never recalculates confidence; renders the provided value.
 */
export function ConfidenceBar({
  value,
  showLabel = true,
  size = "md",
  className,
}: {
  value: number;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const tone =
    clamped >= 70
      ? "from-emerald-500 to-emerald-400"
      : clamped >= 50
        ? "from-amber-500 to-amber-400"
        : "from-rose-500 to-rose-400";
  const pillTone =
    clamped >= 70
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : clamped >= 50
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-rose-500/15 text-rose-400 border-rose-500/30";

  return (
    <div className={cn("flex min-w-[7rem] flex-col gap-1", className)}>
      <div className="flex items-center justify-between gap-2">
        {showLabel ? (
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
              pillTone
            )}
          >
            {value.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-surface-border/80",
          size === "sm" ? "h-1.5" : "h-2"
        )}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
            tone
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
