/**
 * Assemble institutional reports from validation results (read-only reuse).
 */

import { listDemoReplayBundles } from "@/lib/backtesting/replay";
import {
  buildStrategyValidationReport,
  createEmptyValidationFilters,
  type ValidationFilterState,
  type ValidationTradeRecord,
} from "@/lib/backtesting/validation";
import {
  buildExecutiveSummary,
  executiveInsightsFromSummary,
} from "@/lib/backtesting/reports/executive-summary";
import {
  REPORT_TEMPLATES,
  type InstitutionalReport,
  type ReportTemplateId,
} from "@/lib/backtesting/reports/types";
import {
  buildConvictionDistributionSeries,
  buildDrawdownCurveSeries,
  buildEquityCurveSeries,
  buildMonthlyReturnsSeries,
  buildWinLossDistributionSeries,
} from "@/lib/backtesting/reports/visuals";

const APPLICATION_VERSION = "0.1.0";
const DATA_VERSION = "backtest-demo-2026.02";

function createReportId(templateId: ReportTemplateId, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `rpt_${templateId}_${stamp}`;
}

export function getReportTemplate(id: ReportTemplateId) {
  const template = REPORT_TEMPLATES.find((t) => t.id === id);
  if (!template) {
    throw new Error(`Unknown report template: ${id}`);
  }
  return template;
}

export function assembleInstitutionalReport(input: {
  templateId?: ReportTemplateId;
  filters?: ValidationFilterState;
  trades?: readonly ValidationTradeRecord[];
  now?: Date;
}): InstitutionalReport {
  const templateId = input.templateId ?? "executive";
  const template = getReportTemplate(templateId);
  const filters = input.filters ?? createEmptyValidationFilters();
  const now = input.now ?? new Date("2026-02-16T10:00:00.000Z");

  const validation = buildStrategyValidationReport({
    trades: input.trades,
    filters,
    now,
  });

  const sessionIds = [
    ...new Set(validation.trades.map((t) => t.sessionId)),
  ].sort();

  // Prefer demo catalogue sessions when universe empty.
  const fallbackSessions = listDemoReplayBundles().map((b) => b.session.id);
  const backtestSessionIds =
    sessionIds.length > 0 ? sessionIds : fallbackSessions;

  const executiveSummary = buildExecutiveSummary(validation);
  const insights = [
    ...executiveInsightsFromSummary(executiveSummary),
    ...validation.insights,
  ];

  return {
    version: {
      reportId: createReportId(templateId, now.toISOString()),
      generatedAt: now.toISOString(),
      backtestSessionIds,
      appliedFilters: filters,
      applicationVersion: APPLICATION_VERSION,
      dataVersion: DATA_VERSION,
      templateId,
    },
    template,
    validation,
    executiveSummary,
    visuals: {
      equityCurve: buildEquityCurveSeries(validation.trades),
      drawdownCurve: buildDrawdownCurveSeries(validation.trades),
      monthlyReturns: buildMonthlyReturnsSeries(validation.trades),
      winLossDistribution: buildWinLossDistributionSeries(validation.trades),
      convictionDistribution: buildConvictionDistributionSeries(
        validation.convictionBuckets
      ),
    },
    insights,
    trades: validation.trades,
  };
}
