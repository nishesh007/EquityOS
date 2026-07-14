"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { InstitutionalMetricView } from "@/lib/dashboard/institutional-exposure";
import { isPlaceholderDisplay } from "@/lib/dashboard/institutional-exposure";
import { InstitutionalMetricTooltip } from "@/components/dashboard/opportunity-intelligence/InstitutionalMetricTooltip";

function TrendIcon({ trend }: { trend: InstitutionalMetricView["trend"] }) {
  if (trend === "UP") {
    return <ArrowUpRight className="h-3 w-3 text-gain" aria-hidden />;
  }
  if (trend === "DOWN") {
    return <ArrowDownRight className="h-3 w-3 text-loss" aria-hidden />;
  }
  return <ArrowRight className="h-3 w-3 text-text-faint" aria-hidden />;
}

export function InstitutionalMetricCell({
  metric,
  onClick,
}: {
  metric: InstitutionalMetricView;
  onClick?: () => void;
}) {
  const placeholder = isPlaceholderDisplay(metric.displayValue);

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2 text-left transition hover:border-accent/30 hover:bg-surface-hover/50"
    >
      <div className="flex items-center gap-1">
        <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
          {metric.label}
        </p>
        <InstitutionalMetricTooltip meta={metric.tooltip} />
      </div>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold tabular-nums transition-colors duration-500 ${
          placeholder ? "text-text-muted" : metric.toneClass
        }`}
      >
        {metric.displayValue}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-text-faint">
        <span className="inline-flex items-center gap-0.5">
          <TrendIcon trend={metric.trend} />
          {metric.trendLabel}
        </span>
        <span>Conf {metric.confidence}</span>
        <span>Updated {metric.lastUpdated}</span>
      </div>
    </button>
  );
}
