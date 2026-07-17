import { cn } from "@/lib/utils";
import { CHART_COLORS } from "./chartTokens";

export interface ScoreBucket {
  id: string;
  label: string;
  count: number;
  /** Highlights this bucket (e.g. where the current score falls). */
  active?: boolean;
}

interface ScoreDistributionProps {
  buckets: readonly ScoreBucket[];
  height?: number;
  className?: string;
}

/** Mini bar chart for score/conviction/quality distributions. */
export function ScoreDistribution({
  buckets,
  height = 56,
  className,
}: ScoreDistributionProps) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div
      role="img"
      aria-label={`Distribution across ${buckets.length} buckets`}
      className={cn("flex items-end gap-1.5", className)}
      style={{ height: `${height + 18}px` }}
    >
      {buckets.map((bucket) => {
        const barHeight = Math.max(3, Math.round((bucket.count / max) * height));
        return (
          <div key={bucket.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="font-mono text-[10px] tabular-nums text-text-muted">
              {bucket.count}
            </span>
            <div
              className="w-full rounded-sm"
              title={`${bucket.label}: ${bucket.count}`}
              style={{
                height: `${barHeight}px`,
                backgroundColor: bucket.active ? CHART_COLORS.accent : CHART_COLORS.track,
                transition: "height 500ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
            <span className="truncate text-[9px] uppercase tracking-wide text-text-faint">
              {bucket.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
