/**
 * Backtesting façades: Replay (11B.2), Validation (11B.3), Reports (11B.4).
 * Replay / validation calculation modules are not modified here.
 */

import {
  getDemoReplayBundle,
  listDemoReplayBundles,
  type ReplayBundle,
} from "@/lib/backtesting/replay";
import type { BacktestSession } from "@/lib/backtesting/types";
import {
  buildStrategyValidationReport,
  buildValidationUniverse,
  createEmptyValidationFilters,
  uniqueOptions,
  type StrategyValidationReport,
  type ValidationFilterState,
  type ValidationTradeRecord,
} from "@/lib/backtesting/validation";
import {
  assembleInstitutionalReport,
  exportInstitutionalReport,
  type InstitutionalReport,
  type ReportTemplateId,
} from "@/lib/backtesting/reports";
import type { ExportFormat, ExportPreparation } from "@/lib/analytics";

export interface ReplayCenterDashboard {
  sessions: BacktestSession[];
  bundlesBySessionId: Record<string, ReplayBundle>;
  defaultSessionId: string | null;
}

export function fetchReplayCenterDashboard(): ReplayCenterDashboard {
  const bundles = listDemoReplayBundles();
  const bundlesBySessionId: Record<string, ReplayBundle> = {};
  for (const bundle of bundles) {
    bundlesBySessionId[bundle.session.id] = bundle;
  }
  return {
    sessions: bundles.map((bundle) => bundle.session),
    bundlesBySessionId,
    defaultSessionId: bundles[0]?.session.id ?? null,
  };
}

export function fetchReplayBundle(sessionId: string): ReplayBundle | null {
  return getDemoReplayBundle(sessionId);
}

export interface StrategyValidationDashboard {
  universe: ValidationTradeRecord[];
  options: ReturnType<typeof uniqueOptions>;
  initialReport: StrategyValidationReport;
}

export function fetchStrategyValidationDashboard(
  filters?: ValidationFilterState
): StrategyValidationDashboard {
  const universe = buildValidationUniverse();
  const resolved = filters ?? createEmptyValidationFilters();
  return {
    universe,
    options: uniqueOptions(universe),
    initialReport: buildStrategyValidationReport({
      trades: universe,
      filters: resolved,
      now: new Date("2026-02-16T08:00:00.000Z"),
    }),
  };
}

export function buildValidationReportForFilters(
  universe: readonly ValidationTradeRecord[],
  filters: ValidationFilterState
): StrategyValidationReport {
  return buildStrategyValidationReport({
    trades: universe,
    filters,
    now: new Date("2026-02-16T08:00:00.000Z"),
  });
}

export interface ReportCenterDashboard {
  universe: ValidationTradeRecord[];
  options: ReturnType<typeof uniqueOptions>;
  initialReport: InstitutionalReport;
}

export function fetchReportCenterDashboard(): ReportCenterDashboard {
  const universe = buildValidationUniverse();
  return {
    universe,
    options: uniqueOptions(universe),
    initialReport: assembleInstitutionalReport({
      templateId: "executive",
      trades: universe,
      now: new Date("2026-02-16T10:00:00.000Z"),
    }),
  };
}

export function assembleInstitutionalReportForClient(input: {
  templateId: ReportTemplateId;
  filters: ValidationFilterState;
  universe: readonly ValidationTradeRecord[];
}): InstitutionalReport {
  return assembleInstitutionalReport({
    templateId: input.templateId,
    filters: input.filters,
    trades: input.universe,
    now: new Date("2026-02-16T10:00:00.000Z"),
  });
}

export async function exportReportForClient(input: {
  report: InstitutionalReport;
  format: ExportFormat;
}): Promise<ExportPreparation> {
  return exportInstitutionalReport(input);
}
