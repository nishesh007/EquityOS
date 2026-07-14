"use client";

import type { ExecutiveSummaryView } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveSystemSummary({
  summary,
}: {
  summary: ExecutiveSummaryView;
}) {
  const rows = [
    { label: "Total Symbols", value: summary.totalSymbols },
    { label: "Validated Symbols", value: summary.validatedSymbols },
    { label: "High Conviction Ideas", value: summary.highConvictionIdeas },
    { label: "Active Opportunities", value: summary.activeOpportunities },
    { label: "Tomorrow Watchlist", value: summary.tomorrowWatchlist },
    { label: "Open Alerts", value: summary.openAlerts },
    { label: "Historical Reports", value: summary.historicalReports },
    { label: "Latest Scan", value: summary.latestScan },
  ];

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10 px-3 py-3"
      data-testid="executive-system-summary"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        System Summary
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2"
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
              {row.label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-text-primary">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
