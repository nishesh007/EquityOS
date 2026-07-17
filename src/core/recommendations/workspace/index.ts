/**
 * Sprint 9F.1.R7 – Institutional Recommendation Center public API.
 *
 * Composes R1–R6. Does not modify protected engines or recalculate conviction.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import {
  getLivingRecommendation,
  listLivingRecommendations,
  archiveRecommendation as archiveRecommendationLifecycle,
} from "../lifecycle";
import {
  getRecommendationHealth,
  listRecommendationHealth,
} from "../health";
import {
  getRecommendationLessons,
  listRecommendationReplays,
} from "../replay";
import {
  getRecommendationOutcome,
  listRecommendationOutcomes,
} from "../outcomes";
import { getAILessons, getLearningSummary } from "../learning";
import {
  RecommendationWorkspaceEngine,
  compareWorkspaceRecords,
  composeRecommendationWorkspace,
  composeWorkspaceRecord,
} from "./RecommendationWorkspaceEngine";
import { searchRecommendationRecords } from "./RecommendationSearchEngine";
import { filterRecommendationRecords } from "./RecommendationFilterEngine";
import { buildRecommendationAnalytics } from "./RecommendationAnalyticsEngine";
import type {
  RecommendationComparisonView,
  RecommendationFilterCriteria,
  RecommendationSearchCriteria,
  RecommendationWorkspace,
  RecommendationWorkspaceAnalytics,
  RecommendationWorkspaceExportFormat,
  RecommendationWorkspaceExportResult,
  RecommendationWorkspaceRecord,
} from "./RecommendationWorkspaceModels";
import {
  presentComparison,
  presentRecommendationWorkspaceForSurface,
  presentWorkspaceAnalytics,
  presentWorkspaceCard,
  presentWorkspaceSearchResults,
  type RecommendationWorkspaceSurface,
  type WorkspaceSurfaceBundle,
} from "./RecommendationWorkspacePresentationModels";

export * from "./RecommendationWorkspaceModels";
export * from "./RecommendationSearchEngine";
export * from "./RecommendationFilterEngine";
export * from "./RecommendationAnalyticsEngine";
export * from "./RecommendationWorkspaceEngine";
export * from "./RecommendationWorkspacePresentationModels";

const workspaceEngine = new RecommendationWorkspaceEngine();

let snapshotLoader:
  | ((recommendationId: string) => RecommendationSnapshot | undefined)
  | null = null;
let snapshotLister: (() => RecommendationSnapshot[]) | null = null;

export function bindRecommendationWorkspaceSnapshotLoader(
  loader: (recommendationId: string) => RecommendationSnapshot | undefined,
  lister?: () => RecommendationSnapshot[]
): void {
  snapshotLoader = loader;
  if (lister) snapshotLister = lister;
}

function listSnapshots(): RecommendationSnapshot[] {
  return snapshotLister?.() ?? [];
}

function mapById<T extends { recommendationId: string }>(
  items: readonly T[]
): Map<string, T> {
  return new Map(items.map((item) => [item.recommendationId, item]));
}

function collectSources(symbol?: string) {
  const snapshots = listSnapshots().filter((snapshot) =>
    symbol
      ? snapshot.company.symbol.toUpperCase() === symbol.trim().toUpperCase()
      : true
  );
  const living = new Map(
    listLivingRecommendations().map((item) => [item.recommendationId, item])
  );
  const health = mapById(listRecommendationHealth());
  const outcomes = mapById(listRecommendationOutcomes());
  const lessons = new Map(
    listRecommendationReplays().map((item) => [
      item.recommendationId,
      item.lessons,
    ])
  );
  return {
    snapshots,
    living,
    health,
    outcomes,
    lessons,
    learningSummary: getLearningSummary(),
    aiLessons: getAILessons(),
  };
}

export function getRecommendationWorkspace(options?: {
  symbol?: string;
  refresh?: boolean;
}): RecommendationWorkspace {
  if (!options?.refresh && !options?.symbol) {
    const existing = workspaceEngine.get();
    if (existing) return existing;
  }
  return workspaceEngine.compose(collectSources(options?.symbol));
}

export function searchRecommendations(
  criteria: RecommendationSearchCriteria = {}
): RecommendationWorkspaceRecord[] {
  getRecommendationWorkspace({ refresh: true });
  return workspaceEngine.search(criteria);
}

export function filterRecommendations(
  criteria: RecommendationFilterCriteria = {}
): RecommendationWorkspaceRecord[] {
  getRecommendationWorkspace({ refresh: true });
  return workspaceEngine.filter(criteria);
}

export function compareRecommendations(
  recommendationIds: readonly string[]
): RecommendationComparisonView {
  getRecommendationWorkspace({ refresh: true });
  return workspaceEngine.compare(recommendationIds);
}

export function getRecommendationAnalytics(): RecommendationWorkspaceAnalytics {
  return getRecommendationWorkspace({ refresh: true }).analytics;
}

export function exportRecommendationWorkspace(
  format: RecommendationWorkspaceExportFormat,
  options?: {
    records?: readonly RecommendationWorkspaceRecord[];
    subject?: {
      userId?: string;
      role?: "administrator" | "subscriber" | "free";
      tier?: "none" | "basic" | "pro" | "enterprise";
    };
  }
): RecommendationWorkspaceExportResult {
  getRecommendationWorkspace({ refresh: true });
  return workspaceEngine.export(format, options);
}

/** Archive via existing lifecycle engine — no snapshot mutation. */
export function archiveWorkspaceRecommendation(
  recommendationId: string
): RecommendationWorkspaceRecord | undefined {
  archiveRecommendationLifecycle(recommendationId);
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return undefined;
  workspaceEngine.compose(collectSources());
  return (
    workspaceEngine
      .listRecords()
      .find((record) => record.recommendationId === recommendationId) ??
    composeWorkspaceRecord(
      snapshot,
      getLivingRecommendation(recommendationId),
      getRecommendationHealth(recommendationId),
      getRecommendationOutcome(recommendationId),
      getRecommendationLessons(recommendationId) ?? []
    )
  );
}

export function resetRecommendationWorkspace(): void {
  workspaceEngine.clear();
}

export function getRecommendationWorkspaceEngine(): RecommendationWorkspaceEngine {
  return workspaceEngine;
}

function wireSurface(
  surface: RecommendationWorkspaceSurface,
  symbol?: string,
  symbols?: string[]
): WorkspaceSurfaceBundle {
  const workspace = getRecommendationWorkspace(
    symbol ? { symbol, refresh: true } : { refresh: true }
  );
  const filteredRecords =
    symbols && symbols.length > 0
      ? workspace.records.filter((record) =>
          symbols
            .map((item) => item.trim().toUpperCase())
            .includes(record.ticker.toUpperCase())
        )
      : workspace.records;
  const filteredWorkspace =
    filteredRecords === workspace.records
      ? workspace
      : Object.freeze({
          ...workspace,
          records: Object.freeze([...filteredRecords]),
        });
  return presentRecommendationWorkspaceForSurface(surface, filteredWorkspace);
}

export function wireWorkspaceDashboard(): WorkspaceSurfaceBundle {
  return wireSurface("dashboard");
}

export function wireWorkspaceCompany(symbol: string): WorkspaceSurfaceBundle {
  return wireSurface("company", symbol);
}

export function wireWorkspaceResearch(): WorkspaceSurfaceBundle {
  return wireSurface("research");
}

export function wireWorkspaceRecommendationCenter(): WorkspaceSurfaceBundle {
  return wireSurface("recommendation_center");
}

export function wireWorkspaceReplay(): WorkspaceSurfaceBundle {
  return wireSurface("replay");
}

export function wireWorkspaceHistory(): WorkspaceSurfaceBundle {
  return wireSurface("history");
}

export function wireWorkspacePortfolio(
  symbols: string[]
): WorkspaceSurfaceBundle {
  return wireSurface("portfolio", undefined, symbols);
}

export function wireWorkspaceWatchlists(
  symbols: string[]
): WorkspaceSurfaceBundle {
  return wireSurface("watchlists", undefined, symbols);
}

export {
  searchRecommendationRecords,
  filterRecommendationRecords,
  buildRecommendationAnalytics,
  composeRecommendationWorkspace,
  composeWorkspaceRecord,
  compareWorkspaceRecords,
  presentWorkspaceCard,
  presentWorkspaceAnalytics,
  presentWorkspaceSearchResults,
  presentComparison,
  presentRecommendationWorkspaceForSurface,
};
