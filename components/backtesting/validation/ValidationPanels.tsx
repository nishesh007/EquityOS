"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { PercentageKpi, PrimaryKpi } from "@/components/analytics/kpis";
import { InsightCard } from "@/components/analytics/cards";
import { AnalyticsTable } from "@/components/analytics/tables";
import { BarChart } from "@/components/analytics/charts";
import { cn, formatPercent } from "@/lib/utils";
import type {
  ConvictionBucketRow,
  FailureAnalysisResult,
  RecommendationValidationMetrics,
  StrategyPerformanceRow,
  StrategyValidationReport,
} from "@/lib/backtesting/validation";
import { calibrationSummary } from "@/lib/backtesting/validation";

function fmtMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const hours = ms / 3_600_000;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function StrategyComparisonPanel({
  title,
  rows,
}: {
  title: string;
  rows: readonly StrategyPerformanceRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyStatePanel
        title={title}
        message="No comparison rows for the current filters."
        source="Strategy Validation"
      />
    );
  }

  return (
    <Card hover={false} padding="sm">
      <CardHeader title={title} subtitle="Standardized institutional metrics" />
      <AnalyticsTable
        columns={[
          {
            key: "label",
            header: "Group",
            accessor: (r) => r.label,
            sortable: true,
            render: (r) => r.label,
          },
          {
            key: "trades",
            header: "Trades",
            numeric: true,
            accessor: (r) => r.tradeCount,
            sortable: true,
            render: (r) => r.tradeCount,
          },
          {
            key: "totalReturn",
            header: "Total Return",
            numeric: true,
            accessor: (r) => r.totalReturn,
            sortable: true,
            render: (r) => (
              <span
                className={cn(
                  r.totalReturn >= 0 ? "text-gain" : "text-loss"
                )}
              >
                {formatPercent(r.totalReturn)}
              </span>
            ),
          },
          {
            key: "cagr",
            header: "CAGR",
            numeric: true,
            accessor: (r) => r.cagr ?? -999,
            sortable: true,
            render: (r) =>
              r.cagr == null ? "—" : formatPercent(r.cagr, false),
          },
          {
            key: "winRate",
            header: "Win Rate",
            numeric: true,
            accessor: (r) => r.statistics.winRate,
            sortable: true,
            render: (r) => `${r.statistics.winRate.toFixed(1)}%`,
          },
          {
            key: "pf",
            header: "Profit Factor",
            numeric: true,
            accessor: (r) => r.statistics.profitFactor ?? -1,
            sortable: true,
            render: (r) => fmtNum(r.statistics.profitFactor),
          },
          {
            key: "dd",
            header: "Max DD",
            numeric: true,
            accessor: (r) => r.statistics.maximumDrawdown ?? -1,
            sortable: true,
            render: (r) =>
              r.statistics.maximumDrawdown == null
                ? "—"
                : `${r.statistics.maximumDrawdown.toFixed(1)}%`,
          },
          {
            key: "avgRet",
            header: "Avg Return",
            numeric: true,
            accessor: (r) => r.statistics.averageReturn ?? -999,
            sortable: true,
            render: (r) =>
              r.statistics.averageReturn == null
                ? "—"
                : formatPercent(r.statistics.averageReturn),
          },
          {
            key: "hold",
            header: "Avg Hold",
            numeric: true,
            accessor: (r) => r.averageHoldingMs ?? -1,
            sortable: true,
            render: (r) => fmtMs(r.averageHoldingMs),
          },
          {
            key: "rr",
            header: "Avg R:R",
            numeric: true,
            accessor: (r) => r.averageRiskReward ?? -1,
            sortable: true,
            render: (r) => fmtNum(r.averageRiskReward),
          },
          {
            key: "sharpe",
            header: "Sharpe",
            numeric: true,
            accessor: (r) => r.sharpeRatio ?? -999,
            sortable: true,
            render: (r) => fmtNum(r.sharpeRatio),
          },
          {
            key: "sortino",
            header: "Sortino",
            numeric: true,
            accessor: (r) => r.sortinoRatio ?? -999,
            sortable: true,
            render: (r) => fmtNum(r.sortinoRatio),
          },
        ]}
        data={[...rows]}
        keyExtractor={(r) => r.key}
        pageSize={10}
        searchable={false}
        caption={title}
      />
    </Card>
  );
}

export function RecommendationValidationPanel({
  metrics,
}: {
  metrics: RecommendationValidationMetrics;
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader
        title="Recommendation Validation"
        subtitle={`Sample · ${metrics.sampleSize} closed trades`}
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <PercentageKpi
          label="Entry Timing Accuracy"
          value={metrics.entryTimingAccuracy}
        />
        <PercentageKpi
          label="Stop-Loss Accuracy"
          value={metrics.stopLossAccuracy}
        />
        <PercentageKpi label="Target Accuracy" value={metrics.targetAccuracy} />
        <PercentageKpi
          label="Conviction Accuracy"
          value={metrics.convictionAccuracy}
        />
        <PercentageKpi
          label="Risk Classification Accuracy"
          value={metrics.riskClassificationAccuracy}
        />
        <PercentageKpi
          label="Recommendation Consistency"
          value={metrics.recommendationConsistency}
        />
      </div>
      {metrics.notes.length > 0 ? (
        <p className="mt-3 text-[11px] text-text-muted">{metrics.notes.join(" ")}</p>
      ) : null}
    </Card>
  );
}

export function ConfidenceCalibrationPanel({
  buckets,
}: {
  buckets: readonly ConvictionBucketRow[];
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader
        title="Confidence Calibration"
        subtitle={calibrationSummary(buckets)}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map((bucket) => (
          <div
            key={bucket.id}
            className={cn(
              "rounded-xl border px-3 py-3",
              bucket.highlight
                ? "border-warning/40 bg-warning/5"
                : "border-surface-border-subtle bg-surface-hover/20"
            )}
          >
            <p className="text-xs font-semibold text-text-primary">
              {bucket.label}
            </p>
            <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
              {bucket.winRate.toFixed(1)}%
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {bucket.tradeCount} trades · avg{" "}
              {bucket.averageReturn == null
                ? "—"
                : formatPercent(bucket.averageReturn)}{" "}
              · PF {fmtNum(bucket.profitFactor)}
            </p>
            {bucket.calibrationGap != null ? (
              <p
                className={cn(
                  "mt-1 text-[11px] font-medium",
                  bucket.highlight ? "text-warning" : "text-text-faint"
                )}
              >
                Gap {bucket.calibrationGap > 0 ? "+" : ""}
                {bucket.calibrationGap} pts
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FailureAnalysisPanel({
  analysis,
}: {
  analysis: FailureAnalysisResult;
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader title="Failure Analysis" subtitle={analysis.summary} />
      {analysis.rows.length === 0 ? (
        <EmptyStatePanel
          message="No unsuccessful trades to classify."
          source="Failure Analysis"
          className="py-5"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChart
            title="Failure distribution"
            series={[
              {
                id: "failures",
                label: "Count",
                points: analysis.rows.map((row, index) => ({
                  x: index,
                  y: row.count,
                  label: row.label,
                })),
              },
            ]}
            height={200}
          />
          <ul className="space-y-2">
            {analysis.rows.map((row) => (
              <li
                key={row.category}
                className="flex items-center justify-between rounded-lg border border-surface-border-subtle/70 px-3 py-2 text-xs"
              >
                <span className="text-text-secondary">{row.label}</span>
                <span className="font-mono tabular-nums text-text-primary">
                  {row.count} · {row.sharePct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function BenchmarkComparisonPanel({
  report,
}: {
  report: StrategyValidationReport;
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader
        title="Benchmark Comparison"
        subtitle="Nifty 50 / 100 / 500 · extensible benchmark registry"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {report.benchmarkComparison.map((row) => (
          <div
            key={row.benchmarkId}
            className="rounded-xl border border-surface-border-subtle bg-surface-hover/20 p-3"
          >
            <p className="text-xs font-semibold text-text-primary">
              {row.benchmarkLabel}
            </p>
            <PrimaryKpi
              label="Excess vs benchmark"
              value={formatPercent(row.excessReturn)}
              tone={row.excessReturn >= 0 ? "positive" : "negative"}
              size="md"
              className="mt-2 border-0 bg-transparent p-0 hover:bg-transparent"
            />
            <p className="mt-2 text-[11px] text-text-muted">
              Strategy {formatPercent(row.strategyReturn)} · Benchmark{" "}
              {formatPercent(row.benchmarkReturn)} · n={row.sampleSize}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ValidationInsightsPanel({
  report,
}: {
  report: StrategyValidationReport;
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader
        title="AI Insights"
        subtitle="Derived from historical validation results only"
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {report.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </Card>
  );
}
