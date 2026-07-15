import type { EarningsDashboardMetrics } from "@/src/core/earnings/dashboard";
import { DASHBOARD_EMPTY } from "@/src/core/earnings/dashboard";

interface InstitutionalDashboardMetricsProps {
  metrics: EarningsDashboardMetrics;
}

const ROWS: Array<{ key: keyof EarningsDashboardMetrics; label: string }> = [
  { key: "upcomingEarnings", label: "Upcoming" },
  { key: "todaysEarnings", label: "Today" },
  { key: "tomorrowEarnings", label: "Tomorrow" },
  { key: "next7Days", label: "Next 7 Days" },
  { key: "portfolioEarnings", label: "Portfolio" },
  { key: "watchlistEarnings", label: "Watchlist" },
  { key: "highImpactEarnings", label: "High Impact" },
  { key: "aiHighConviction", label: "AI High Conviction" },
  { key: "averageBeatProbability", label: "Avg Beat Prob" },
  { key: "averageAiConfidence", label: "Avg AI Conf" },
  { key: "portfolioExposure", label: "Portfolio Exposure" },
  { key: "watchlistExposure", label: "Watchlist Exposure" },
];

export function InstitutionalDashboardMetrics({
  metrics,
}: InstitutionalDashboardMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {ROWS.map((row) => {
        const raw = metrics[row.key];
        const value =
          typeof raw === "boolean"
            ? metrics.ready
              ? "Ready"
              : DASHBOARD_EMPTY.awaitingAi
            : String(raw);
        return (
          <div
            key={row.key}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-text-faint">
              {row.label}
            </p>
            <p className="mt-1 truncate font-mono text-sm font-semibold tabular-nums text-text-primary">
              {metrics.ready || typeof raw === "number" ? value : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
