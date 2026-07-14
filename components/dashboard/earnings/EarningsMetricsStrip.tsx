import { formatMetricValue } from "@/src/core/earnings/calendar";
import type { EarningsCalendarMetrics } from "@/src/core/earnings/calendar";

interface EarningsMetricsStripProps {
  metrics: EarningsCalendarMetrics;
  ready?: boolean;
}

const METRICS: Array<{
  key: keyof EarningsCalendarMetrics;
  label: string;
}> = [
  { key: "companiesCovered", label: "Covered" },
  { key: "todaysEarnings", label: "Today" },
  { key: "tomorrowsEarnings", label: "Tomorrow" },
  { key: "nextWeekEarnings", label: "Next Week" },
  { key: "portfolioEarnings", label: "Portfolio" },
  { key: "watchlistEarnings", label: "Watchlist" },
  { key: "highImpactResults", label: "High Impact" },
];

export function EarningsMetricsStrip({
  metrics,
  ready = true,
}: EarningsMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {METRICS.map((metric) => (
        <div
          key={metric.key}
          className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2"
        >
          <p className="text-[10px] uppercase tracking-wider text-text-faint">
            {metric.label}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">
            {ready
              ? formatMetricValue(metrics[metric.key] as number)
              : "—"}
          </p>
        </div>
      ))}
      <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2 sm:col-span-2 xl:col-span-1">
        <p className="text-[10px] uppercase tracking-wider text-text-faint">
          Coverage
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-text-primary">
          {ready ? metrics.coverageLabel : "Calendar Updating"}
        </p>
      </div>
    </div>
  );
}
