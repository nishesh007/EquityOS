"use client";

import { useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { PaperExecutiveSummary } from "@/components/paper-trading/PaperExecutiveSummary";
import { PaperStrategyComparisonTable } from "@/components/paper-trading/PaperStrategyComparisonTable";
import { PaperTabAnalyticsSection } from "@/components/paper-trading/PaperTabAnalyticsSection";
import { PaperHistoricalPerformance } from "@/components/paper-trading/PaperHistoricalPerformance";
import { PaperTradeExplorer } from "@/components/paper-trading/PaperTradeExplorer";
import { PaperRecommendationValidation } from "@/components/paper-trading/PaperRecommendationValidation";
import { PaperBestWorstTables } from "@/components/paper-trading/PaperBestWorstTables";
import { PaperExportPlaceholders } from "@/components/paper-trading/PaperExportPlaceholders";
import {
  DEFAULT_PAPER_ANALYTICS_FILTERS,
  filterTradesForAnalytics,
} from "@/lib/paper-trading/analytics-filters";
import { buildPaperAnalyticsDashboard } from "@/lib/paper-trading/analytics";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import type {
  EquityCurveRange,
  PaperAnalyticsFilters,
  PaperAnalyticsTab,
} from "@/lib/paper-trading/analytics-types";
import type { PaperTrade } from "@/lib/paper-trading/types";

interface PaperPerformanceAnalyticsProps {
  trades: readonly PaperTrade[];
  testedRecommendationIds: readonly string[];
  lastUpdated: string | null;
  onSelectTrade: (trade: PaperTrade) => void;
}

/**
 * Sprint 11E.2 — Institutional Performance Analytics & Recommendation Validation.
 * Six-section read-only dashboard. Never creates or modifies trades.
 */
export function PaperPerformanceAnalytics({
  trades,
  testedRecommendationIds,
  lastUpdated,
  onSelectTrade,
}: PaperPerformanceAnalyticsProps) {
  const [tab, setTab] = useState<PaperAnalyticsTab>("overview");
  const [equityRange, setEquityRange] = useState<EquityCurveRange>("all");
  const [filters, setFilters] = useState<PaperAnalyticsFilters>(
    DEFAULT_PAPER_ANALYTICS_FILTERS
  );

  const explorerTrades = useMemo(
    () => filterTradesForAnalytics(trades, filters),
    [trades, filters]
  );

  const hasHistory = useMemo(
    () => trades.some(isTradeClosed),
    [trades]
  );

  const model = useMemo(
    () =>
      buildPaperAnalyticsDashboard(trades, {
        tab,
        equityRange,
        explorerTrades,
        testedRecommendationIds,
        lastUpdated,
      }),
    [
      trades,
      tab,
      equityRange,
      explorerTrades,
      testedRecommendationIds,
      lastUpdated,
    ]
  );

  if (!hasHistory) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Institutional Analytics
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary">
            Performance Analytics
          </h2>
        </div>
        <EmptyStatePanel
          icon={LineChart}
          title="No analytics yet"
          message="Performance analytics appear after the engine closes paper trades. Sync the lab to accumulate validation history."
          source="Paper Trading Lab · Performance"
        />
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Institutional Analytics
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary">
            Performance & Recommendation Validation Dashboard
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Analyzes historical paper trades only · no trade generation · no
            recommendation changes
          </p>
        </div>
        <PaperExportPlaceholders />
      </div>

      <PaperExecutiveSummary kpis={model.executive} />

      <PaperStrategyComparisonTable rows={model.comparison} />

      <PaperTabAnalyticsSection
        tab={tab}
        onTabChange={setTab}
        metrics={model.tabMetrics}
      />

      <PaperHistoricalPerformance
        points={model.equityCurve}
        range={equityRange}
        onRangeChange={setEquityRange}
        monthly={model.monthly}
      />

      <PaperTradeExplorer
        filters={filters}
        onChange={setFilters}
        trades={model.explorerTrades}
        onSelect={onSelectTrade}
      />

      <PaperRecommendationValidation stats={model.validation} />

      <PaperBestWorstTables
        bestTrades={model.bestTrades}
        worstTrades={model.worstTrades}
        onSelect={onSelectTrade}
      />
    </section>
  );
}
