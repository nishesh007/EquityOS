/**
 * Watchlist Research Bridge — Sprint 10A research workspace integration (Sprint 10B.R4).
 */

import { generateResearchSummary } from "@/src/core/research/workspace/copilot/ResearchSummaryEngine";
import { getDecisionJournal } from "@/src/core/research/workspace/integration/DecisionJournalEngine";
import { getResearchTimeline } from "@/src/core/research/workspace/integration/ResearchTimelineEngine";
import { listNotes } from "@/src/core/research/workspace/knowledge/ResearchNotesEngine";
import {
  WORKSPACE_EMPTY,
  WATCHLIST_WORKSPACE_ROUTES,
  safeWorkspaceText,
  type WatchlistResearchLink,
  type WatchlistResearchView,
  type WatchlistWorkspaceContext,
} from "./WatchlistWorkspaceModels";
import type {
  InstitutionalWorkspaceContext,
  ResearchBridgeLink,
  WorkspaceResearchBridgeView,
} from "./WorkspacePresentationModels";
import { WORKSPACE_PRODUCTIVITY_EMPTY } from "./WorkspacePresentationModels";

export function getWatchlistResearch(
  context?: WatchlistWorkspaceContext | null
): WatchlistResearchView {
  const workspaceId = safeWorkspaceText(context?.workspaceId, "");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const ticker = safeWorkspaceText(context?.ticker, symbols[0] ?? "").toUpperCase();

  if (!symbols.length && !workspaceId) {
    return {
      openResearchRoute: WATCHLIST_WORKSPACE_ROUTES.research,
      latestReportRoute: WATCHLIST_WORKSPACE_ROUTES.results,
      summary: WORKSPACE_EMPTY.noResearch,
      health: WORKSPACE_EMPTY.noResearch,
      links: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noResearch,
    };
  }

  const summary = generateResearchSummary({
    workspaceId: workspaceId || undefined,
    ticker: ticker || undefined,
  });
  const timeline = getResearchTimeline({
    workspaceId: workspaceId || undefined,
    ticker: ticker || undefined,
  });
  const decisions = getDecisionJournal({
    workspaceId: workspaceId || undefined,
    ticker: ticker || undefined,
  });
  const notes = listNotes({ workspaceId: workspaceId || undefined, ticker: ticker || undefined });

  const links: WatchlistResearchLink[] = symbols.slice(0, 8).map((sym) => {
    const symSummary = generateResearchSummary({
      workspaceId: workspaceId || undefined,
      ticker: sym,
    });
    const symNotes = listNotes({ workspaceId: workspaceId || undefined, ticker: sym });
    const symDecisions = getDecisionJournal({
      workspaceId: workspaceId || undefined,
      ticker: sym,
    });
    return {
      ticker: sym,
      route: `${WATCHLIST_WORKSPACE_ROUTES.company}/${sym}`,
      summary: symSummary.empty
        ? WORKSPACE_EMPTY.noResearch
        : symSummary.finalConclusion,
      health: symSummary.empty ? WORKSPACE_EMPTY.noResearch : "ready",
      latestNote: symNotes[0]?.title ?? WORKSPACE_EMPTY.noResearch,
      decisionCount: symDecisions.entries.length,
    };
  });

  return {
    openResearchRoute: ticker
      ? `${WATCHLIST_WORKSPACE_ROUTES.research}?ticker=${ticker}`
      : WATCHLIST_WORKSPACE_ROUTES.research,
    latestReportRoute: WATCHLIST_WORKSPACE_ROUTES.results,
    summary: summary.empty ? WORKSPACE_EMPTY.noResearch : summary.finalConclusion,
    health: timeline.empty ? WORKSPACE_EMPTY.noResearch : `${timeline.entries.length} events`,
    links,
    empty: links.length === 0 && summary.empty,
    emptyMessage: WORKSPACE_EMPTY.noResearch,
  };
}

export function resetWatchlistResearchBridge(): void {
  /* stateless compose */
}

export function getWorkspaceResearchBridge(
  context?: InstitutionalWorkspaceContext | null
): WorkspaceResearchBridgeView {
  const watchlistId = safeWorkspaceText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const ticker = safeWorkspaceText(context?.ticker, symbols[0] ?? "").toUpperCase();

  if (!symbols.length && !ticker) {
    return {
      watchlistId,
      links: [],
      empty: true,
      emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace,
    };
  }

  const base = getWatchlistResearch(context);
  const links: ResearchBridgeLink[] = [
    {
      kind: "research",
      label: "Open Research",
      route: ticker
        ? `${WATCHLIST_WORKSPACE_ROUTES.research}?ticker=${ticker}`
        : WATCHLIST_WORKSPACE_ROUTES.research,
      ticker: ticker || undefined,
    },
    {
      kind: "company",
      label: "Open Company",
      route: ticker
        ? `${WATCHLIST_WORKSPACE_ROUTES.company}/${ticker}`
        : WATCHLIST_WORKSPACE_ROUTES.company,
      ticker: ticker || undefined,
    },
    {
      kind: "earnings",
      label: "Open Earnings",
      route: ticker
        ? `${WATCHLIST_WORKSPACE_ROUTES.company}/${ticker}?tab=earnings`
        : WATCHLIST_WORKSPACE_ROUTES.results,
      ticker: ticker || undefined,
    },
    {
      kind: "reports",
      label: "Open Reports",
      route: WATCHLIST_WORKSPACE_ROUTES.results,
    },
    {
      kind: "notes",
      label: "Open Notes",
      route: ticker
        ? `${WATCHLIST_WORKSPACE_ROUTES.research}?ticker=${ticker}&panel=notes`
        : WATCHLIST_WORKSPACE_ROUTES.research,
      ticker: ticker || undefined,
    },
    {
      kind: "decision_journal",
      label: "Decision Journal",
      route: ticker
        ? `${WATCHLIST_WORKSPACE_ROUTES.research}?ticker=${ticker}&panel=journal`
        : WATCHLIST_WORKSPACE_ROUTES.research,
      ticker: ticker || undefined,
    },
  ];

  for (const link of base.links.slice(0, 4)) {
    links.push({
      kind: "company",
      label: `Research: ${link.ticker}`,
      route: link.route,
      ticker: link.ticker,
    });
  }

  return {
    watchlistId,
    links,
    empty: false,
    emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace,
  };
}
