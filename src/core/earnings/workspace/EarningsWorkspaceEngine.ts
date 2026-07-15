/**
 * Earnings Workspace orchestrator — portfolio / watchlist / decisions / lazy reports.
 */

import { getEarningsDecisionEngine } from "./EarningsDecisionEngine";
import { buildInstitutionalEarningsReport } from "./InstitutionalEarningsReport";
import {
  getPortfolioImpact,
  getPortfolioImpactEngine,
} from "./PortfolioImpactEngine";
import {
  applyWorkspaceAction,
  buildWorkspaceView,
} from "./EarningsWorkspacePresenter";
import {
  getWatchlistImpact,
  getWatchlistImpactEngine,
} from "./WatchlistImpactEngine";
import type {
  DecisionSummary,
  EarningsWorkspaceView,
  InstitutionalEarningsReportView,
  WorkspaceActionId,
  WorkspaceActionResult,
  WorkspaceContext,
} from "./WorkspaceModels";
import { WORKSPACE_EMPTY } from "./WorkspaceModels";

export class EarningsWorkspaceEngine {
  private context: WorkspaceContext = {};
  private readonly reportCache = new Map<string, InstitutionalEarningsReportView>();
  private reportBuilds = 0;

  clearCache(): void {
    this.reportCache.clear();
    this.reportBuilds = 0;
    getPortfolioImpactEngine().clearCache();
    getWatchlistImpactEngine().clearCache();
  }

  setContext(context: WorkspaceContext): void {
    this.context = { ...this.context, ...context };
    getPortfolioImpactEngine().clearCache();
    getWatchlistImpactEngine().clearCache();
  }

  getContext(): WorkspaceContext {
    return this.context;
  }

  getReportBuildCount(): number {
    return this.reportBuilds;
  }

  getPortfolioImpact(now = new Date()) {
    return getPortfolioImpact(this.context, now);
  }

  getWatchlistImpact(now = new Date()) {
    return getWatchlistImpact(this.context, now);
  }

  getDecisionSummaries(now = new Date()): DecisionSummary[] {
    const portfolio = this.getPortfolioImpact(now);
    const watchlist = this.getWatchlistImpact(now);
    const byTicker = new Map<
      string,
      { event: DecisionSummary["event"]; scorecard: DecisionSummary["scorecard"] }
    >();

    for (const row of portfolio.rows) {
      byTicker.set(row.ticker, { event: row.event, scorecard: row.scorecard });
    }
    for (const row of watchlist.rows) {
      if (!byTicker.has(row.ticker)) {
        byTicker.set(row.ticker, { event: row.event, scorecard: row.scorecard });
      }
    }

    return getEarningsDecisionEngine().getDecisionSummaries([...byTicker.values()]);
  }

  /** Lazy — generate report only on demand; cache by ticker::date. */
  generateInstitutionalReport(
    ticker: string,
    now = new Date()
  ): InstitutionalEarningsReportView {
    const key = `${ticker.toUpperCase()}::${now.toISOString().slice(0, 10)}`;
    const cached = this.reportCache.get(key);
    if (cached) return cached;

    const decisions = this.getDecisionSummaries(now);
    const decision = decisions.find(
      (d) => d.ticker.toUpperCase() === ticker.toUpperCase()
    );
    if (!decision) {
      return {
        ticker: ticker.toUpperCase(),
        title: WORKSPACE_EMPTY.noReport,
        sections: [],
        institutional: null,
        ready: false,
        emptyMessage: WORKSPACE_EMPTY.noReport,
        disclaimer: "",
      };
    }

    const portfolio = this.getPortfolioImpact(now);
    const watchlist = this.getWatchlistImpact(now);
    const portfolioRow = portfolio.rows.find((r) => r.ticker === decision.ticker);
    const watchlistRow = watchlist.rows.find((r) => r.ticker === decision.ticker);

    this.reportBuilds += 1;
    const report = buildInstitutionalEarningsReport({
      event: decision.event,
      scorecard: decision.scorecard,
      decision,
      portfolioExposure: portfolioRow?.overallExposure ?? "—",
      watchlistExposure: watchlistRow?.watchlistExposure ?? "—",
    });
    this.reportCache.set(key, report);
    return report;
  }

  getWorkspace(
    options: { selectedTicker?: string | null; includeReport?: boolean; now?: Date } = {}
  ): EarningsWorkspaceView {
    const now = options.now ?? new Date();
    const portfolio = this.getPortfolioImpact(now);
    const watchlist = this.getWatchlistImpact(now);
    const decisions = this.getDecisionSummaries(now);
    const selectedTicker =
      options.selectedTicker ?? decisions[0]?.ticker ?? null;
    const report =
      options.includeReport && selectedTicker
        ? this.generateInstitutionalReport(selectedTicker, now)
        : null;

    return buildWorkspaceView({
      portfolio,
      watchlist,
      decisions,
      selectedTicker,
      report,
    });
  }

  runAction(ticker: string, action: WorkspaceActionId): WorkspaceActionResult {
    return applyWorkspaceAction(ticker, action);
  }
}

let singleton: EarningsWorkspaceEngine | null = null;

export function getEarningsWorkspaceEngine(): EarningsWorkspaceEngine {
  if (!singleton) singleton = new EarningsWorkspaceEngine();
  return singleton;
}

export function resetEarningsWorkspaceEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API — getWorkspace() */
export function getWorkspace(
  options: {
    selectedTicker?: string | null;
    includeReport?: boolean;
    now?: Date;
    context?: WorkspaceContext;
  } = {}
): EarningsWorkspaceView {
  if (options.context) {
    getEarningsWorkspaceEngine().setContext(options.context);
  }
  return getEarningsWorkspaceEngine().getWorkspace(options);
}

/** Public API — getDecisionSummary() */
export function getDecisionSummaryForTicker(
  ticker?: string,
  now = new Date()
): DecisionSummary | DecisionSummary[] | null {
  const all = getEarningsWorkspaceEngine().getDecisionSummaries(now);
  if (!ticker) return all;
  return (
    all.find((d) => d.ticker.toUpperCase() === ticker.toUpperCase()) ?? null
  );
}

/** Public API — generateInstitutionalReport(ticker) */
export function generateInstitutionalReport(
  ticker: string,
  now = new Date()
): InstitutionalEarningsReportView {
  return getEarningsWorkspaceEngine().generateInstitutionalReport(ticker, now);
}
