"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BacktestingEmptyState,
  BacktestingProgress,
} from "@/components/backtesting/hardening";
import { ValidationFilterBar } from "@/components/backtesting/validation/ValidationFilterBar";
import {
  BenchmarkComparisonPanel,
  ConfidenceCalibrationPanel,
  FailureAnalysisPanel,
  RecommendationValidationPanel,
  StrategyComparisonPanel,
  ValidationInsightsPanel,
} from "@/components/backtesting/validation/ValidationPanels";
import {
  buildValidationReportForFilters,
  type StrategyValidationDashboard,
} from "@/services/backtesting";
import {
  createEmptyValidationFilters,
  type ValidationFilterState,
} from "@/lib/backtesting/validation";

export function StrategyValidationWorkspace({
  dashboard,
}: {
  dashboard: StrategyValidationDashboard;
}) {
  const [filters, setFilters] = useState<ValidationFilterState>(
    createEmptyValidationFilters()
  );
  const [pending, startTransition] = useTransition();

  const report = useMemo(
    () => buildValidationReportForFilters(dashboard.universe, filters),
    [dashboard.universe, filters]
  );

  if (dashboard.universe.length === 0) {
    return (
      <div className="space-y-4" data-testid="strategy-validation-workspace">
        <BacktestingEmptyState kind="no_validation" />
      </div>
    );
  }

  return (
    <div
      className="space-y-4 contrast-more:[&_button]:border-text-primary"
      data-testid="strategy-validation-workspace"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <p>
          Institutional validation over historical backtest sessions ·{" "}
          <span className="font-semibold text-text-secondary">
            {report.trades.length}
          </span>{" "}
          trades in view
        </p>
      </div>

      {pending ? (
        <BacktestingProgress
          label="Applying filters"
          progress={55}
          message="Recomputing validation views…"
        />
      ) : null}

      <ValidationFilterBar
        value={filters}
        onChange={(next) => startTransition(() => setFilters(next))}
        strategyOptions={dashboard.options.strategies}
        sectorOptions={dashboard.options.sectors}
        symbolOptions={dashboard.options.symbols}
        regimeOptions={dashboard.options.marketRegimes}
        universeOptions={dashboard.options.universes}
      />

      {report.trades.length === 0 ? (
        <BacktestingEmptyState
          kind="filter_empty"
          onResetFilters={() =>
            startTransition(() => setFilters(createEmptyValidationFilters()))
          }
        />
      ) : (
        <>
          <ValidationInsightsPanel report={report} />

          <StrategyComparisonPanel
            title="Strategy Comparison"
            rows={report.strategyComparison}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StrategyComparisonPanel
              title="By Market Regime"
              rows={report.regimeComparison}
            />
            <StrategyComparisonPanel
              title="By Sector"
              rows={report.sectorComparison}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StrategyComparisonPanel
              title="By Market Cap"
              rows={report.marketCapComparison}
            />
            <StrategyComparisonPanel
              title="By Symbol"
              rows={report.symbolComparison}
            />
          </div>

          <RecommendationValidationPanel
            metrics={report.recommendationValidation}
          />
          <ConfidenceCalibrationPanel buckets={report.convictionBuckets} />
          <FailureAnalysisPanel analysis={report.failureAnalysis} />
          <BenchmarkComparisonPanel report={report} />
        </>
      )}
    </div>
  );
}
