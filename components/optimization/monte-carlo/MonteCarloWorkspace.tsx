"use client";

import { memo, useMemo } from "react";
import type { ExportFormat } from "@/lib/analytics";
import type {
  MonteCarloConfig,
  MonteCarloExportState,
  MonteCarloFilterState,
  MonteCarloSession,
  SimulationResult,
} from "@/lib/optimization";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { MonteCarloConfigPanel } from "./MonteCarloConfig";
import { StressScenarioSelector } from "./StressScenarioSelector";
import { SimulationRunner } from "./SimulationRunner";
import { RiskDashboard } from "./RiskDashboard";
import { DistributionCharts } from "./DistributionCharts";
import { ConfidenceAnalysis } from "./ConfidenceAnalysis";
import { ScenarioComparison } from "./ScenarioComparison";
import { SimulationTable } from "./SimulationTable";
import { SimulationDrawer } from "./SimulationDrawer";
import { SimulationExportToolbar } from "./SimulationExportToolbar";

export interface MonteCarloWorkspaceProps {
  config: MonteCarloConfig;
  session: MonteCarloSession | null;
  filters: MonteCarloFilterState;
  exportState: MonteCarloExportState;
  selectedId: string | null;
  running: boolean;
  canRun: boolean;
  configError?: string | null;
  onConfigChange: (patch: Partial<MonteCarloConfig>) => void;
  onFilterChange: (patch: Partial<MonteCarloFilterState>) => void;
  onRun: () => void;
  onCancel: () => void;
  onSelect: (id: string | null) => void;
  onExport: (format: ExportFormat) => void;
}

export const MonteCarloWorkspace = memo(function MonteCarloWorkspace({
  config,
  session,
  filters,
  exportState,
  selectedId,
  running,
  canRun,
  configError,
  onConfigChange,
  onFilterChange,
  onRun,
  onCancel,
  onSelect,
  onExport,
}: MonteCarloWorkspaceProps) {
  const filtered = useMemo(() => {
    const rows = session?.results ?? [];
    const matched = rows.filter((r) => {
      if (filters.scenario !== "all" && r.scenarioId !== filters.scenario) {
        return false;
      }
      if (!filters.query.trim()) return true;
      const q = filters.query.toLowerCase();
      return (
        String(r.simulationIndex).includes(q) ||
        r.scenarioLabel.toLowerCase().includes(q) ||
        r.riskGrade.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
    // Cap rendered rows for institutional table performance (pagination still applies).
    return matched.slice(0, 300);
  }, [session?.results, filters]);

  const selected = useMemo(() => {
    if (!selectedId || !session) return null;
    return session.results.find((r) => r.id === selectedId) ?? null;
  }, [selectedId, session]);

  const scenarioOptions = useMemo(() => {
    const ids = Array.from(
      new Set((session?.results ?? []).map((r) => r.scenarioId))
    );
    return ids;
  }, [session?.results]);

  return (
    <div className="space-y-4" data-testid="monte-carlo-workspace">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MonteCarloConfigPanel
            config={config}
            onChange={onConfigChange}
            error={configError}
          />
          <StressScenarioSelector
            selected={config.selectedScenarios}
            onChange={(ids) => onConfigChange({ selectedScenarios: ids })}
          />
          <Card hover={false} padding="sm">
            <CardHeader title="Filters" subtitle="Narrow simulation results" />
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={filters.scenario}
                onChange={(e) =>
                  onFilterChange({
                    scenario: e.target.value as MonteCarloFilterState["scenario"],
                  })
                }
                aria-label="Filter by scenario"
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <option value="all">All scenarios</option>
                {scenarioOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={filters.query}
                onChange={(e) => onFilterChange({ query: e.target.value })}
                placeholder="Search simulations…"
                aria-label="Search simulations"
                className="min-w-[160px] flex-1 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              />
              {filters.scenario !== "all" ? (
                <button
                  type="button"
                  onClick={() => onFilterChange({ scenario: "all" })}
                  className={cn(
                    "rounded-lg border border-surface-border-subtle px-2.5 py-1 text-[10px] font-semibold text-text-secondary"
                  )}
                >
                  Clear scenario
                </button>
              ) : null}
            </div>
          </Card>
          <RiskDashboard dashboard={session?.dashboard ?? null} />
          <SimulationTable
            results={filtered}
            onRowOpen={(row: SimulationResult) => onSelect(row.id)}
          />
          <DistributionCharts distributions={session?.distributions ?? null} />
          <ConfidenceAnalysis intervals={session?.confidenceIntervals ?? []} />
          <ScenarioComparison rows={session?.scenarioComparison ?? []} />
        </div>
        <div className="space-y-4">
          <SimulationRunner
            session={session}
            running={running}
            canRun={canRun}
            onRun={onRun}
            onCancel={onCancel}
          />
          <SimulationExportToolbar
            disabled={!session || session.results.length === 0}
            exportState={exportState}
            onExport={onExport}
          />
        </div>
      </div>

      <SimulationDrawer
        open={Boolean(selected)}
        result={selected}
        onClose={() => onSelect(null)}
        configSummary={`Mode ${config.mode} · seed ${config.randomSeed} · slip ${config.slippagePct}% · commission ${config.commissionPct}%`}
      />
    </div>
  );
});
