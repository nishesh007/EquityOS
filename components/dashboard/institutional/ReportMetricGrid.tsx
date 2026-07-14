"use client";

import type { ReportViewerMetricCard } from "@/lib/dashboard/institutional-report-viewer";

export function ReportMetricGrid({
  metrics,
}: {
  metrics: ReportViewerMetricCard[];
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      data-testid="report-metric-grid"
    >
      {metrics.map((m) => (
        <div
          key={m.id}
          data-testid={`report-metric-${m.id}`}
          className={`rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2 ${
            m.locked ? "opacity-70" : ""
          }`}
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            {m.label}
          </p>
          <p className={`mt-0.5 text-sm font-semibold tabular-nums ${m.toneClass}`}>
            {m.value}
          </p>
          {m.locked ? (
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-600">
              Upgrade Required
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
