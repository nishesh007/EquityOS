/**
 * Sprint 11B.4 — Institutional report models & templates.
 */

import type { ChartPoint, ChartSeries, ExportFormat } from "@/lib/analytics/types";
import type { AnalyticsInsight } from "@/lib/analytics/types";
import type {
  StrategyValidationReport,
  ValidationFilterState,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";

export type ReportTemplateId =
  | "executive"
  | "strategy"
  | "recommendation_validation"
  | "benchmark"
  | "risk"
  | "backtest_session";

export type ReportSectionId =
  | "executive_summary"
  | "strategy_performance"
  | "recommendation_quality"
  | "benchmark_analysis"
  | "risk_analysis"
  | "trade_log"
  | "ai_insights"
  | "export_center";

export interface ReportTemplate {
  id: ReportTemplateId;
  label: string;
  description: string;
  sections: readonly ReportSectionId[];
}

export const REPORT_TEMPLATES: readonly ReportTemplate[] = [
  {
    id: "executive",
    label: "Executive Report",
    description: "Board-ready overview with AI summary, risks, and key findings.",
    sections: [
      "executive_summary",
      "strategy_performance",
      "benchmark_analysis",
      "risk_analysis",
      "ai_insights",
      "export_center",
    ],
  },
  {
    id: "strategy",
    label: "Strategy Report",
    description: "Strategy comparison and performance attribution.",
    sections: [
      "strategy_performance",
      "benchmark_analysis",
      "trade_log",
      "ai_insights",
      "export_center",
    ],
  },
  {
    id: "recommendation_validation",
    label: "Recommendation Validation Report",
    description: "Entry/stop/target accuracy and conviction calibration.",
    sections: [
      "recommendation_quality",
      "ai_insights",
      "trade_log",
      "export_center",
    ],
  },
  {
    id: "benchmark",
    label: "Benchmark Report",
    description: "Excess return vs Nifty 50 / 100 / 500.",
    sections: ["benchmark_analysis", "strategy_performance", "export_center"],
  },
  {
    id: "risk",
    label: "Risk Report",
    description: "Drawdown, failure attribution, and risk assessment.",
    sections: ["risk_analysis", "ai_insights", "export_center"],
  },
  {
    id: "backtest_session",
    label: "Backtest Session Report",
    description: "Session-linked trade log with full validation appendix.",
    sections: [
      "executive_summary",
      "strategy_performance",
      "recommendation_quality",
      "benchmark_analysis",
      "risk_analysis",
      "trade_log",
      "ai_insights",
      "export_center",
    ],
  },
] as const;

export interface ReportVersionMeta {
  reportId: string;
  generatedAt: string;
  backtestSessionIds: readonly string[];
  appliedFilters: ValidationFilterState;
  applicationVersion: string;
  dataVersion: string;
  templateId: ReportTemplateId;
}

export interface ReportVisualAnalytics {
  equityCurve: ChartSeries[];
  drawdownCurve: ChartSeries[];
  monthlyReturns: ChartSeries[];
  winLossDistribution: ChartSeries[];
  convictionDistribution: ChartSeries[];
}

export interface ExecutiveSummaryBlock {
  overallPerformance: string;
  bestStrategy: string;
  weakestStrategy: string;
  riskAssessment: string;
  recommendationReliability: string;
  keyFindings: readonly string[];
  improvementOpportunities: readonly string[];
}

export interface InstitutionalReport {
  version: ReportVersionMeta;
  template: ReportTemplate;
  validation: StrategyValidationReport;
  executiveSummary: ExecutiveSummaryBlock;
  visuals: ReportVisualAnalytics;
  insights: readonly AnalyticsInsight[];
  trades: readonly ValidationTradeRecord[];
}

export interface ReportExportRequest {
  report: InstitutionalReport;
  format: ExportFormat;
  /** Optional override filename. */
  filename?: string;
}

export type { ChartPoint };
