/**
 * Workspace presenter — empty-safe card / table views.
 */

import type {
  DecisionSummary,
  EarningsWorkspaceView,
  InstitutionalEarningsReportView,
  PortfolioImpactRow,
  PortfolioImpactView,
  WatchlistImpactRow,
  WatchlistImpactView,
  WorkspaceActionId,
  WorkspaceActionResult,
} from "./WorkspaceModels";
import { WORKSPACE_EMPTY } from "./WorkspaceModels";

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function presentPortfolioRow(row: PortfolioImpactRow): Record<string, string> {
  return {
    ticker: safeText(row.ticker, "—"),
    company: safeText(row.companyName, row.ticker),
    upcomingEarnings: safeText(row.upcomingEarnings, WORKSPACE_EMPTY.awaitingEarnings),
    daysRemaining: safeText(row.daysRemaining, "—"),
    positionSize: safeText(row.positionSize, "—"),
    portfolioWeight: safeText(row.portfolioWeight, "—"),
    aiConviction: safeText(row.aiConviction, "—"),
    beatProbability: safeText(row.beatProbability, "—"),
    riskLevel: safeText(row.riskLevel, "—"),
    expectedVolatility: safeText(row.expectedVolatility, "—"),
    expectedPortfolioImpact: row.expectedPortfolioImpact,
    overallExposure: safeText(row.overallExposure, "—"),
  };
}

export function presentWatchlistRow(row: WatchlistImpactRow): Record<string, string> {
  return {
    ticker: safeText(row.ticker, "—"),
    company: safeText(row.companyName, row.ticker),
    watchlistExposure: safeText(row.watchlistExposure, "—"),
    highConviction: row.highConviction ? "Yes" : "No",
    highRisk: row.highRisk ? "Yes" : "No",
    transcriptAvailable: row.transcriptAvailable ? "Yes" : "No",
    resultsPublished: row.resultsPublished ? "Yes" : "No",
    aiConfidence: safeText(row.aiConfidence, "—"),
  };
}

export function presentDecision(decision: DecisionSummary): {
  recommendation: string;
  reasoning: string;
  confidence: string;
  risk: string;
  catalysts: string;
} {
  return {
    recommendation: safeText(decision.recommendation, "Monitor"),
    reasoning: safeText(decision.reasoning, WORKSPACE_EMPTY.awaitingEarnings),
    confidence: safeText(decision.confidence, "—"),
    risk: safeText(decision.risk, "—"),
    catalysts:
      decision.catalysts.length > 0
        ? decision.catalysts.map((c) => safeText(c, "")).filter(Boolean).join(" · ")
        : "—",
  };
}

export function presentReport(
  report: InstitutionalEarningsReportView | null
): InstitutionalEarningsReportView {
  if (!report) {
    return {
      ticker: "—",
      title: WORKSPACE_EMPTY.noReport,
      sections: [],
      institutional: null,
      ready: false,
      emptyMessage: WORKSPACE_EMPTY.noReport,
      disclaimer: "",
    };
  }
  return {
    ...report,
    title: safeText(report.title, WORKSPACE_EMPTY.noReport),
    sections: report.sections.map((s) => ({
      id: s.id,
      title: safeText(s.title, "Section"),
      body: safeText(s.body, "—"),
    })),
    emptyMessage: report.ready ? "" : WORKSPACE_EMPTY.noReport,
  };
}

export function buildWorkspaceView(input: {
  portfolio: PortfolioImpactView;
  watchlist: WatchlistImpactView;
  decisions: DecisionSummary[];
  selectedTicker?: string | null;
  report?: InstitutionalEarningsReportView | null;
}): EarningsWorkspaceView {
  const selectedTicker = input.selectedTicker ?? input.decisions[0]?.ticker ?? null;
  const selectedDecision =
    input.decisions.find((d) => d.ticker === selectedTicker) ??
    input.decisions[0] ??
    null;
  const empty =
    input.portfolio.empty && input.watchlist.empty && input.decisions.length === 0;

  return {
    portfolio: input.portfolio,
    watchlist: input.watchlist,
    decisions: input.decisions,
    selectedTicker,
    selectedDecision,
    report: input.report ? presentReport(input.report) : null,
    empty,
    emptyMessage: empty ? WORKSPACE_EMPTY.awaitingEarnings : "",
  };
}

export function applyWorkspaceAction(
  ticker: string,
  action: WorkspaceActionId
): WorkspaceActionResult {
  const base = `/company/${ticker}`;
  switch (action) {
    case "open_research":
      return {
        action,
        ticker,
        href: `${base}?tab=research`,
        ok: true,
        message: "Open Research",
      };
    case "open_company":
      return {
        action,
        ticker,
        href: base,
        ok: true,
        message: "Open Company",
      };
    case "view_transcript":
      return {
        action,
        ticker,
        href: `${base}?tab=transcript`,
        ok: true,
        message: "View Transcript",
      };
    case "open_historical_results":
      return {
        action,
        ticker,
        href: `${base}?tab=results`,
        ok: true,
        message: "Open Historical Results",
      };
    case "download_report":
      return {
        action,
        ticker,
        href: null,
        ok: true,
        message: "Download Report",
      };
    case "add_to_watchlist":
      return {
        action,
        ticker,
        href: null,
        ok: true,
        message: `Watchlist · added ${ticker}`,
      };
    case "remove_from_watchlist":
      return {
        action,
        ticker,
        href: null,
        ok: true,
        message: `Watchlist · removed ${ticker}`,
      };
    default:
      return {
        action,
        ticker,
        href: null,
        ok: false,
        message: "Unknown action",
      };
  }
}
