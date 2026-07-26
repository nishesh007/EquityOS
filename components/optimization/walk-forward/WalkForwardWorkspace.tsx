"use client";

import { memo, useMemo } from "react";
import type { ExportFormat } from "@/lib/analytics";
import type {
  WalkForwardConfig,
  WalkForwardCycleResult,
  WalkForwardExportState,
  WalkForwardFilterState,
  WalkForwardSession,
} from "@/lib/optimization";
import { WalkForwardConfigPanel } from "./WalkForwardConfig";
import { ValidationRunner } from "./ValidationRunner";
import { ValidationDashboard } from "./ValidationDashboard";
import { RobustnessCard } from "./RobustnessCard";
import { ValidationTable } from "./ValidationTable";
import { CycleDrawer } from "./CycleDrawer";
import { StabilityCharts } from "./StabilityCharts";
import { ValidationFilters } from "./ValidationFilters";
import { ValidationExportToolbar } from "./ValidationExportToolbar";

export interface WalkForwardWorkspaceProps {
  config: WalkForwardConfig;
  session: WalkForwardSession | null;
  filters: WalkForwardFilterState;
  exportState: WalkForwardExportState;
  selectedCycleId: string | null;
  running: boolean;
  canRun: boolean;
  configError?: string | null;
  onConfigChange: (patch: Partial<WalkForwardConfig>) => void;
  onFilterChange: (patch: Partial<WalkForwardFilterState>) => void;
  onRun: () => void;
  onCancel: () => void;
  onSelectCycle: (id: string | null) => void;
  onExport: (format: ExportFormat) => void;
}

export const WalkForwardWorkspace = memo(function WalkForwardWorkspace({
  config,
  session,
  filters,
  exportState,
  selectedCycleId,
  running,
  canRun,
  configError,
  onConfigChange,
  onFilterChange,
  onRun,
  onCancel,
  onSelectCycle,
  onExport,
}: WalkForwardWorkspaceProps) {
  const filteredCycles = useMemo(() => {
    const cycles = session?.cycles ?? [];
    return cycles.filter((c) => {
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (!filters.query.trim()) return true;
      const q = filters.query.toLowerCase();
      return (
        String(c.cycle).includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.training.start.includes(q) ||
        c.testing.start.includes(q) ||
        Object.values(c.parameterLabels).some((v) =>
          String(v).toLowerCase().includes(q)
        )
      );
    });
  }, [session?.cycles, filters]);

  const selectedCycle = useMemo(() => {
    if (!selectedCycleId || !session) return null;
    return session.cycles.find((c) => c.id === selectedCycleId) ?? null;
  }, [selectedCycleId, session]);

  return (
    <div className="space-y-4" data-testid="walk-forward-workspace">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <WalkForwardConfigPanel
            config={config}
            onChange={onConfigChange}
            error={configError}
          />
          <ValidationFilters filters={filters} onChange={onFilterChange} />
          <ValidationDashboard dashboard={session?.dashboard ?? null} />
          <ValidationTable
            cycles={filteredCycles}
            onRowOpen={(c: WalkForwardCycleResult) => onSelectCycle(c.id)}
          />
          <StabilityCharts
            cycles={session?.cycles ?? []}
            stability={session?.stability ?? null}
          />
        </div>
        <div className="space-y-4">
          <ValidationRunner
            session={session}
            running={running}
            canRun={canRun}
            onRun={onRun}
            onCancel={onCancel}
          />
          <RobustnessCard robustness={session?.dashboard?.robustness ?? null} />
          <ValidationExportToolbar
            disabled={!session || session.cycles.length === 0}
            exportState={exportState}
            onExport={onExport}
          />
        </div>
      </div>

      <CycleDrawer
        open={Boolean(selectedCycle)}
        cycle={selectedCycle}
        onClose={() => onSelectCycle(null)}
      />
    </div>
  );
});
