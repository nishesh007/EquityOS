"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { InsightCard } from "@/components/analytics/cards";
import { AnalyticsTable } from "@/components/analytics/tables";
import {
  BacktestingEmptyState,
  BacktestingProgress,
  BacktestingRecoveryPanel,
  VirtualizedRows,
} from "@/components/backtesting/hardening";
import { ValidationFilterBar } from "@/components/backtesting/validation/ValidationFilterBar";
import {
  BenchmarkComparisonPanel,
  ConfidenceCalibrationPanel,
  FailureAnalysisPanel,
  RecommendationValidationPanel,
  StrategyComparisonPanel,
} from "@/components/backtesting/validation/ValidationPanels";
import {
  assembleInstitutionalReportForClient,
  exportReportForClient,
  type ReportCenterDashboard,
} from "@/services/backtesting";
import {
  REPORT_TEMPLATES,
  type InstitutionalReport,
  type ReportTemplateId,
} from "@/lib/backtesting/reports";
import { backtestingTaskRegistry } from "@/lib/backtesting/tasks";
import {
  createEmptyValidationFilters,
  type ValidationFilterState,
  type ValidationTradeRecord,
} from "@/lib/backtesting/validation";
import type { ExportFormat, ExportPreparation } from "@/lib/analytics";
import { cn, formatPercent } from "@/lib/utils";
import { FileDown, Files } from "lucide-react";

const ChartSkeleton = () => (
  <Skeleton className="h-56 w-full rounded-xl" aria-label="Loading chart" />
);

const EquityCurveChart = dynamic(
  () =>
    import("@/components/analytics/charts").then((m) => m.EquityCurveChart),
  { ssr: false, loading: ChartSkeleton }
);
const AreaChart = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.AreaChart),
  { ssr: false, loading: ChartSkeleton }
);
const BarChart = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.BarChart),
  { ssr: false, loading: ChartSkeleton }
);
const LineChart = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.LineChart),
  { ssr: false, loading: ChartSkeleton }
);

function downloadExport(prep: ExportPreparation): void {
  if (prep.status !== "ready" || prep.body == null) return;
  const part: BlobPart =
    typeof prep.body === "string" ? prep.body : new Uint8Array(prep.body);
  const blob = new Blob([part], { type: prep.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = prep.filename;
  a.click();
  URL.revokeObjectURL(url);
}

const VIRTUALIZE_TRADE_THRESHOLD = 40;

export function InstitutionalReportCenter({
  dashboard,
}: {
  dashboard: ReportCenterDashboard;
}) {
  const [templateId, setTemplateId] = useState<ReportTemplateId>("executive");
  const [filters, setFilters] = useState<ValidationFilterState>(
    createEmptyValidationFilters()
  );
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{
    taskId: string;
    label: string;
    progress: number;
    message?: string;
  } | null>(null);
  const [lastExportFormat, setLastExportFormat] = useState<ExportFormat | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  const report: InstitutionalReport = useMemo(
    () =>
      assembleInstitutionalReportForClient({
        templateId,
        filters,
        universe: dashboard.universe,
      }),
    [templateId, filters, dashboard.universe]
  );

  const sectionSet = useMemo(
    () => new Set(report.template.sections),
    [report.template.sections]
  );

  async function runExport(format: ExportFormat, signal?: AbortSignal) {
    setExportNote(null);
    setExportError(null);
    setLastExportFormat(format);
    const { task, signal: taskSignal } = backtestingTaskRegistry.create({
      label: `Export ${format.toUpperCase()}`,
      cancellable: true,
    });
    const abort = signal ?? taskSignal;
    setExportProgress({
      taskId: task.id,
      label: task.label,
      progress: 5,
      message: "Preparing export…",
    });
    backtestingTaskRegistry.start(task.id, "Preparing export…");

    try {
      if (abort.aborted) throw new DOMException("Aborted", "AbortError");
      backtestingTaskRegistry.setProgress(task.id, 35, "Materializing…");
      setExportProgress((p) =>
        p ? { ...p, progress: 35, message: "Materializing…" } : p
      );

      const prep = await exportReportForClient({ report, format });
      if (abort.aborted) throw new DOMException("Aborted", "AbortError");

      backtestingTaskRegistry.setProgress(task.id, 85, "Downloading…");
      setExportProgress((p) =>
        p ? { ...p, progress: 85, message: "Downloading…" } : p
      );

      if (prep.status === "ready") {
        downloadExport(prep);
        backtestingTaskRegistry.complete(
          task.id,
          prep.message ?? `Exported ${format.toUpperCase()}.`
        );
        setExportNote(prep.message ?? `Exported ${format.toUpperCase()}.`);
        setExportProgress(null);
      } else {
        const msg = prep.message ?? `Export ${format} failed.`;
        backtestingTaskRegistry.fail(task.id, msg);
        setExportError(msg);
        setExportProgress(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setExportNote("Export cancelled.");
        setExportProgress(null);
        return;
      }
      const msg =
        err instanceof Error ? err.message : "Unexpected export failure.";
      backtestingTaskRegistry.fail(task.id, msg);
      setExportError(msg);
      setExportProgress(null);
    }
  }

  function cancelExport() {
    if (!exportProgress) return;
    backtestingTaskRegistry.cancel(exportProgress.taskId);
    setExportProgress(null);
    setExportNote("Export cancelled.");
  }

  if (dashboard.universe.length === 0) {
    return (
      <div className="space-y-4" data-testid="institutional-report-center">
        <BacktestingEmptyState kind="no_reports" />
      </div>
    );
  }

  return (
    <div
      className="space-y-4 contrast-more:[&_button]:border-text-primary"
      data-testid="institutional-report-center"
      aria-busy={pending || Boolean(exportProgress)}
    >
      <p className="text-xs text-text-muted">
        Institutional reports from completed backtests · template{" "}
        <span className="font-semibold text-text-secondary">
          {report.template.label}
        </span>
      </p>

      {pending ? (
        <BacktestingProgress
          label="Updating report"
          progress={50}
          message="Applying template and filters…"
        />
      ) : null}

      {exportProgress ? (
        <BacktestingProgress
          label={exportProgress.label}
          progress={exportProgress.progress}
          message={exportProgress.message}
          cancellable
          onCancel={cancelExport}
        />
      ) : null}

      {exportError ? (
        <BacktestingRecoveryPanel
          kind="export_failure"
          message={exportError}
          onRetry={() => {
            if (lastExportFormat) void runExport(lastExportFormat);
          }}
        />
      ) : null}

      <Card hover={false} padding="sm">
        <CardHeader
          title="Report Templates"
          subtitle="Reusable institutional layouts"
          icon={<Files className="h-4 w-4" aria-hidden />}
        />
        <div
          className="flex flex-wrap gap-2"
          role="listbox"
          aria-label="Report templates"
        >
          {REPORT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              role="option"
              aria-selected={templateId === template.id}
              onClick={() =>
                startTransition(() => setTemplateId(template.id))
              }
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                templateId === template.id
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border-subtle hover:bg-surface-hover"
              )}
            >
              <p className="text-xs font-semibold text-text-primary">
                {template.label}
              </p>
              <p className="mt-0.5 max-w-[14rem] text-[10px] text-text-muted">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <ValidationFilterBar
        value={filters}
        onChange={(next) => startTransition(() => setFilters(next))}
        strategyOptions={dashboard.options.strategies}
        sectorOptions={dashboard.options.sectors}
        symbolOptions={dashboard.options.symbols}
        regimeOptions={dashboard.options.marketRegimes}
        universeOptions={dashboard.options.universes}
      />

      <Card hover={false} padding="sm" data-testid="report-versioning">
        <CardHeader title="Report Versioning" />
        <dl className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Report ID" value={report.version.reportId} mono />
          <Meta
            label="Generated"
            value={new Date(report.version.generatedAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}
          />
          <Meta
            label="Sessions"
            value={report.version.backtestSessionIds.join(", ") || "—"}
            mono
          />
          <Meta label="App Version" value={report.version.applicationVersion} />
          <Meta label="Data Version" value={report.version.dataVersion} mono />
          <Meta
            label="Filters"
            value={
              Object.values(report.version.appliedFilters).some((v) =>
                Array.isArray(v) ? v.length > 0 : Boolean(v)
              )
                ? "Custom"
                : "None"
            }
          />
        </dl>
      </Card>

      {report.trades.length === 0 ? (
        <BacktestingEmptyState
          kind="filter_empty"
          onResetFilters={() =>
            startTransition(() => setFilters(createEmptyValidationFilters()))
          }
        />
      ) : (
        <>
          {sectionSet.has("executive_summary") ? (
            <Card hover={false} padding="sm" data-testid="executive-summary">
              <CardHeader
                title="Executive Summary"
                subtitle={report.executiveSummary.overallPerformance}
                timestamp={new Date(report.version.generatedAt).toLocaleString(
                  "en-IN",
                  { timeZone: "Asia/Kolkata" }
                )}
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InsightCard
                  insight={{
                    id: "best",
                    title: "Best Strategy",
                    body: report.executiveSummary.bestStrategy,
                    tone: "positive",
                  }}
                />
                <InsightCard
                  insight={{
                    id: "weak",
                    title: "Weakest Strategy",
                    body: report.executiveSummary.weakestStrategy,
                    tone: "caution",
                  }}
                />
                <InsightCard
                  insight={{
                    id: "risk",
                    title: "Risk Assessment",
                    body: report.executiveSummary.riskAssessment,
                    tone: "caution",
                  }}
                />
                <InsightCard
                  insight={{
                    id: "reco",
                    title: "Recommendation Reliability",
                    body: report.executiveSummary.recommendationReliability,
                    tone: "neutral",
                  }}
                />
              </div>
              {report.executiveSummary.keyFindings.length > 0 ? (
                <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-text-secondary">
                  {report.executiveSummary.keyFindings.map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}

          {sectionSet.has("ai_insights") ? (
            <Card hover={false} padding="sm">
              <CardHeader
                title="AI Insights"
                subtitle="Historical results only · improvement opportunities included"
              />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {report.insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
              {report.executiveSummary.improvementOpportunities.length > 0 ? (
                <ul className="mt-3 list-inside list-disc text-xs text-text-secondary">
                  {report.executiveSummary.improvementOpportunities.map(
                    (item) => (
                      <li key={item}>{item}</li>
                    )
                  )}
                </ul>
              ) : null}
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <EquityCurveChart
              title="Equity Curve"
              series={report.visuals.equityCurve}
            />
            <AreaChart
              title="Drawdown Curve"
              series={report.visuals.drawdownCurve}
            />
            <BarChart
              title="Monthly Returns"
              series={report.visuals.monthlyReturns}
            />
            <BarChart
              title="Win / Loss Distribution"
              series={report.visuals.winLossDistribution}
            />
            <BarChart
              title="Conviction Distribution"
              series={report.visuals.convictionDistribution}
            />
            <LineChart
              title="Equity vs path"
              series={report.visuals.equityCurve}
            />
          </div>

          {sectionSet.has("strategy_performance") ? (
            <StrategyComparisonPanel
              title="Strategy Performance"
              rows={report.validation.strategyComparison}
            />
          ) : null}

          {sectionSet.has("recommendation_quality") ? (
            <>
              <RecommendationValidationPanel
                metrics={report.validation.recommendationValidation}
              />
              <ConfidenceCalibrationPanel
                buckets={report.validation.convictionBuckets}
              />
            </>
          ) : null}

          {sectionSet.has("benchmark_analysis") ? (
            <BenchmarkComparisonPanel report={report.validation} />
          ) : null}

          {sectionSet.has("risk_analysis") ? (
            <FailureAnalysisPanel
              analysis={report.validation.failureAnalysis}
            />
          ) : null}

          {sectionSet.has("trade_log") ? (
            <TradeLogSection trades={report.trades} />
          ) : null}
        </>
      )}

      {sectionSet.has("export_center") ? (
        <Card hover={false} padding="sm" data-testid="export-center">
          <CardHeader
            title="Export Center"
            subtitle="Shared analytics export contracts · PDF · CSV · Excel · JSON"
            icon={<FileDown className="h-4 w-4" aria-hidden />}
          />
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Export formats"
          >
            {(["pdf", "csv", "excel", "json"] as ExportFormat[]).map(
              (format) => (
                <button
                  key={format}
                  type="button"
                  disabled={pending || Boolean(exportProgress)}
                  aria-label={`Export report as ${format.toUpperCase()}`}
                  onClick={() => void runExport(format)}
                  className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
                >
                  {format}
                </button>
              )
            )}
          </div>
          {exportNote ? (
            <p className="mt-3 text-[11px] text-text-muted" role="status">
              {exportNote}
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function TradeLogSection({
  trades,
}: {
  trades: readonly ValidationTradeRecord[];
}) {
  const useVirtual = trades.length >= VIRTUALIZE_TRADE_THRESHOLD;

  return (
    <Card hover={false} padding="sm">
      <div id="trade-log-heading">
        <CardHeader
          title="Trade Log"
          subtitle={
            useVirtual
              ? `Filtered historical trades · virtualized (${trades.length} rows)`
              : "Filtered historical trades"
          }
        />
      </div>
      {useVirtual ? (
        <VirtualizedRows
          items={trades}
          keyExtractor={(r) => r.id}
          maxHeight={320}
          rowHeight={44}
          labelledBy="trade-log-heading"
          renderRow={(r) => (
            <div className="flex h-full items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-text-primary">{r.symbol}</span>
              <span className="truncate text-text-secondary">
                {r.strategyLabel}
              </span>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  r.returnPercent >= 0 ? "text-gain" : "text-loss"
                )}
              >
                {formatPercent(r.returnPercent)}
              </span>
              <span className="tabular-nums text-text-muted">
                {r.pnl.toFixed(2)}
              </span>
            </div>
          )}
        />
      ) : (
        <AnalyticsTable
          columns={[
            {
              key: "symbol",
              header: "Symbol",
              accessor: (r) => r.symbol,
              sortable: true,
              render: (r) => r.symbol,
            },
            {
              key: "strategy",
              header: "Strategy",
              accessor: (r) => r.strategyLabel,
              sortable: true,
              render: (r) => r.strategyLabel,
            },
            {
              key: "return",
              header: "Return",
              numeric: true,
              accessor: (r) => r.returnPercent,
              sortable: true,
              render: (r) => (
                <span
                  className={r.returnPercent >= 0 ? "text-gain" : "text-loss"}
                >
                  {formatPercent(r.returnPercent)}
                </span>
              ),
            },
            {
              key: "pnl",
              header: "P&L",
              numeric: true,
              accessor: (r) => r.pnl,
              sortable: true,
              render: (r) => r.pnl.toFixed(2),
            },
            {
              key: "regime",
              header: "Regime",
              accessor: (r) => r.marketRegime,
              render: (r) => r.marketRegime,
            },
            {
              key: "exit",
              header: "Exit",
              accessor: (r) => r.exitAt ?? "",
              render: (r) =>
                r.exitAt
                  ? new Date(r.exitAt).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })
                  : "—",
            },
          ]}
          data={[...trades]}
          keyExtractor={(r) => r.id}
          pageSize={12}
          caption="Trade log"
        />
      )}
    </Card>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border-subtle/70 bg-surface-hover/20 px-2.5 py-2">
      <dt className="data-label">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-all text-text-primary",
          mono && "font-mono text-[10px]"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
