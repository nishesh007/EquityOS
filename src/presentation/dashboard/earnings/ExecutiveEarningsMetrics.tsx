"use client";

import type { ExecutiveMetricCell } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveEarningsMetrics({
  metrics,
}: {
  metrics: ExecutiveMetricCell[];
}) {
  return (
    <div data-testid="executive-earnings-metrics">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Executive Metrics
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.id}
            data-testid={`executive-earnings-metric-${m.id}`}
            className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2"
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
              {m.label}
            </p>
            <p
              className={`mt-0.5 text-sm font-semibold tabular-nums ${m.toneClass}`}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
