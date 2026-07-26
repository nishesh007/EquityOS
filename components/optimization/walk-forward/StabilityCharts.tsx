"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { AreaChart, BarChart, LineChart } from "@/components/analytics/charts";
import type { StabilityAnalysis, WalkForwardCycleResult } from "@/lib/optimization";
import type { ChartSeries } from "@/lib/analytics/types";

export interface StabilityChartsProps {
  cycles: WalkForwardCycleResult[];
  stability: StabilityAnalysis | null;
}

export const StabilityCharts = memo(function StabilityCharts({
  cycles,
  stability,
}: StabilityChartsProps) {
  const rollingSeries = useMemo<ChartSeries[]>(() => {
    const values = stability?.rollingPerformance ?? cycles.map((c) => c.metrics.totalReturn);
    return [
      {
        id: "rolling",
        label: "Rolling OOS Return %",
        points: values.map((y, i) => ({ x: i + 1, y, label: `C${i + 1}` })),
      },
    ];
  }, [cycles, stability]);

  const equitySeries = useMemo<ChartSeries[]>(() => {
    const last = cycles[cycles.length - 1];
    if (!last) return [];
    return [
      {
        id: "equity",
        label: "Latest Cycle Equity",
        points: last.equityCurve.map((y, i) => ({ x: i, y })),
      },
    ];
  }, [cycles]);

  const ddSeries = useMemo<ChartSeries[]>(() => {
    const last = cycles[cycles.length - 1];
    if (!last) return [];
    return [
      {
        id: "dd",
        label: "Drawdown %",
        points: last.drawdownCurve.map((y, i) => ({ x: i, y })),
      },
    ];
  }, [cycles]);

  const varianceBars = useMemo<ChartSeries[]>(() => {
    if (!stability) return [];
    const entries = Object.entries(stability.metricVariance);
    return [
      {
        id: "var",
        label: "Metric Variance",
        points: entries.map(([k, v], i) => ({ x: i + 1, y: v, label: k })),
      },
    ];
  }, [stability]);

  if (cycles.length === 0) {
    return (
      <Card hover={false} padding="sm" data-testid="stability-charts">
        <CardHeader title="Stability Analysis" subtitle="Charts appear after validation" />
        <p className="mt-2 text-xs text-text-muted">No stability data yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="stability-charts">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BarChart
          title="Rolling Performance"
          subtitle="Out-of-sample return by cycle"
          series={rollingSeries}
          height={180}
        />
        <BarChart
          title="Metric Variance"
          subtitle="Variance across walk-forward cycles"
          series={varianceBars}
          height={180}
        />
        <LineChart
          title="Equity Curve Stability"
          subtitle="Latest testing-window equity path"
          series={equitySeries}
          height={180}
        />
        <AreaChart
          title="Drawdown Stability"
          subtitle="Latest testing-window drawdown path"
          series={ddSeries}
          height={180}
        />
      </div>
      {stability ? (
        <Card hover={false} padding="sm">
          <CardHeader title="Stability Summary" />
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <div>
              <dt className="text-text-faint">Parameter Stability</dt>
              <dd className="font-semibold text-text-primary">
                {stability.parameterStability}
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Equity Stability</dt>
              <dd className="font-semibold text-text-primary">
                {stability.equityCurveStability}
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Drawdown Stability</dt>
              <dd className="font-semibold text-text-primary">
                {stability.drawdownStability}
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Return Consistency</dt>
              <dd className="font-semibold text-text-primary">
                {stability.returnConsistency}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}
    </div>
  );
});
