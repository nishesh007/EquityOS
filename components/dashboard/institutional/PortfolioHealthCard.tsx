"use client";

import type {
  PortfolioHealthView,
  PortfolioMetricCell,
} from "@/lib/dashboard/institutional-portfolio-presentation";
import { PORTFOLIO_TONE_CLASS } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioHealthCard({
  health,
}: {
  health: PortfolioHealthView;
}) {
  if (health.empty) {
    return (
      <div
        className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
        data-testid="portfolio-health-card-empty"
      >
        <p className="text-xs font-semibold text-text-primary">Portfolio Health</p>
        <p className="mt-2 text-[11px] text-text-muted">{health.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-health-card"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-text-primary">Portfolio Health</p>
          <p className="mt-0.5 text-[11px] text-text-muted">{health.verdict}</p>
        </div>
        <span className="rounded border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
          {health.overallGrade}
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">
        {health.headline}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {health.metrics.map((m) => (
          <MetricCell key={m.id} metric={m} />
        ))}
      </div>
    </div>
  );
}

function MetricCell({ metric }: { metric: PortfolioMetricCell }) {
  return (
    <div className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
        {metric.label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${metric.toneClass || PORTFOLIO_TONE_CLASS[metric.tone]}`}
      >
        {metric.value}
      </p>
      {metric.detail ? (
        <p className="mt-0.5 text-[9px] text-text-faint">{metric.detail}</p>
      ) : null}
    </div>
  );
}
