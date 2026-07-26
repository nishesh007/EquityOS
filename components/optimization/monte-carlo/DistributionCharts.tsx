"use client";

import { memo, useMemo } from "react";
import { BarChart } from "@/components/analytics/charts";
import type { ProbabilityDistributions } from "@/lib/optimization";
import type { ChartSeries } from "@/lib/analytics/types";

function toSeries(
  id: string,
  label: string,
  buckets: { label: string; value: number; count: number }[]
): ChartSeries[] {
  return [
    {
      id,
      label,
      points: buckets.map((b, i) => ({
        x: i + 1,
        y: b.count,
        label: b.label,
      })),
    },
  ];
}

export interface DistributionChartsProps {
  distributions: ProbabilityDistributions | null;
}

export const DistributionCharts = memo(function DistributionCharts({
  distributions,
}: DistributionChartsProps) {
  const charts = useMemo(() => {
    if (!distributions) return [];
    return [
      { title: "Return Distribution", series: toSeries("ret", "Count", distributions.returns) },
      { title: "Drawdown Distribution", series: toSeries("dd", "Count", distributions.drawdowns) },
      { title: "Win Rate Distribution", series: toSeries("wr", "Count", distributions.winRates) },
      { title: "Sharpe Distribution", series: toSeries("sh", "Count", distributions.sharpes) },
      {
        title: "Profit Factor Distribution",
        series: toSeries("pf", "Count", distributions.profitFactors),
      },
      {
        title: "Holding Time Distribution",
        series: toSeries("ht", "Count", distributions.holdingTimes),
      },
      { title: "Risk Distribution", series: toSeries("risk", "Count", distributions.risks) },
    ];
  }, [distributions]);

  if (!distributions) {
    return (
      <div data-testid="distribution-charts" className="rounded-xl border border-surface-border-subtle bg-surface-raised p-4">
        <p className="text-xs text-text-muted">
          Distribution charts appear after Monte Carlo completes.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 xl:grid-cols-2"
      data-testid="distribution-charts"
    >
      {charts.map((c) => (
        <BarChart
          key={c.title}
          title={c.title}
          subtitle="Probability mass across simulation outcomes"
          series={c.series}
          height={170}
        />
      ))}
    </div>
  );
});
