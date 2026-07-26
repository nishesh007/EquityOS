"use client";

import { Card, CardFooter, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { AnalyticsKpi } from "@/components/analytics/kpis";
import { cn } from "@/lib/utils";
import type {
  AnalyticsInsight,
  AnalyticsMetric,
  AnalyticsSummary,
} from "@/lib/analytics/types";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function MetricValue({ metric }: { metric: AnalyticsMetric }) {
  if (metric.displayValue) return metric.displayValue;
  if (metric.value == null) return "—";
  if (metric.kind === "percent") return `${metric.value.toFixed(1)}%`;
  if (metric.kind === "currency")
    return `₹${metric.value.toLocaleString("en-IN")}`;
  return String(metric.value);
}

export function StatisticsCard({
  title,
  subtitle,
  metrics,
  loading,
  empty,
  emptyMessage = "No statistics available yet.",
  className,
}: {
  title: string;
  subtitle?: string;
  metrics: readonly AnalyticsMetric[];
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <Card className={className} hover={false}>
      <CardHeader title={title} subtitle={subtitle} />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : empty || metrics.length === 0 ? (
        <EmptyStatePanel message={emptyMessage} source="Analytics" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((metric) => (
            <AnalyticsKpi
              key={metric.id}
              label={metric.label}
              value={<MetricValue metric={metric} />}
              delta={metric.delta}
              deltaLabel={metric.deltaLabel}
              trend={metric.trend}
              size="sm"
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/** Analytics-scoped metric card — distinct from components/ui MetricCard. */
export function AnalyticsMetricCard({
  metric,
  icon,
  className,
}: {
  metric: AnalyticsMetric;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <AnalyticsKpi
      label={metric.label}
      value={<MetricValue metric={metric} />}
      delta={metric.delta}
      deltaLabel={metric.deltaLabel}
      trend={metric.trend}
      icon={icon}
      secondary={metric.description}
      className={className}
    />
  );
}

export function ComparisonCard({
  title,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  delta,
  footer,
  className,
}: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: ReactNode;
  rightValue: ReactNode;
  delta?: number | null;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className} hover={false}>
      <CardHeader title={title} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="data-label">{leftLabel}</p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-text-primary">
            {leftValue}
          </p>
        </div>
        <div>
          <p className="data-label">{rightLabel}</p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-text-primary">
            {rightValue}
          </p>
        </div>
      </div>
      {delta != null ? (
        <p
          className={cn(
            "mt-3 font-mono text-xs tabular-nums",
            delta > 0 ? "text-gain" : delta < 0 ? "text-loss" : "text-text-faint"
          )}
        >
          Δ {delta > 0 ? "+" : ""}
          {delta.toFixed(2)}
        </p>
      ) : null}
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}

const INSIGHT_TONE: Record<
  NonNullable<AnalyticsInsight["tone"]>,
  string
> = {
  positive: "border-gain/30 bg-gain/5 text-gain",
  caution: "border-warning/30 bg-warning/5 text-warning",
  neutral: "border-surface-border-subtle bg-surface-overlay/40 text-text-secondary",
  negative: "border-loss/30 bg-loss/5 text-loss",
};

export function InsightCard({
  insight,
  className,
}: {
  insight: AnalyticsInsight;
  className?: string;
}) {
  const tone = insight.tone ?? "neutral";
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        INSIGHT_TONE[tone],
        className
      )}
      data-testid="analytics-insight-card"
    >
      <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
        {insight.body}
      </p>
    </div>
  );
}

export function SummaryCard({
  summary,
  loading,
  className,
}: {
  summary: AnalyticsSummary;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={className} hover={false}>
      <CardHeader
        title={summary.title}
        subtitle={summary.subtitle}
        timestamp={summary.asOf}
      />
      {loading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {summary.metrics.map((metric) => (
              <AnalyticsMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
          {summary.insights && summary.insights.length > 0 ? (
            <div className="mt-4 space-y-2">
              {summary.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
