/**
 * Watchlist Comparison Workspace (Sprint 10B.R7).
 * Composes R5 performance + R3 health + R6 copilot compare.
 */

import { getPerformance } from "../analytics";
import { getWatchlistHealth } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import {
  WORKSPACE_PRODUCTIVITY_EMPTY,
  emptyWorkspaceComparison,
  safeInstitutionalText,
  type InstitutionalWorkspaceContext,
  type WorkspaceComparisonRow,
  type WorkspaceComparisonView,
} from "./WorkspacePresentationModels";

function avgConviction(
  symbols: string[],
  snapshots: InstitutionalWorkspaceContext["snapshots"]
): number {
  if (!snapshots || symbols.length === 0) return 0;
  let sum = 0;
  let n = 0;
  for (const s of symbols) {
    const v = snapshots[s]?.convictionScore;
    if (v == null) continue;
    sum += v;
    n += 1;
  }
  return n === 0 ? 0 : Math.round(sum / n);
}

function sectorSpread(
  symbols: string[],
  sectorBySymbol: Record<string, string>
): number {
  const sectors = new Set(
    symbols.map((s) => safeInstitutionalText(sectorBySymbol[s], "Other"))
  );
  return sectors.size;
}

export function compareWatchlists(
  context?: InstitutionalWorkspaceContext | null
): WorkspaceComparisonView {
  const leftId = safeInstitutionalText(context?.watchlistId, "left");
  const rightId = safeInstitutionalText(context?.compareWatchlistId, "right");
  const leftSymbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const rightSymbols = (context?.compareSymbols ?? []).map((s) => s.toUpperCase());

  if (!leftSymbols.length || !rightSymbols.length) {
    return emptyWorkspaceComparison();
  }

  const snapshots = context?.snapshots ?? {};
  const sectors = context?.sectorBySymbol ?? {};

  const leftPerf = getPerformance({
    watchlistId: leftId,
    symbols: leftSymbols,
    snapshots,
    now: context?.now,
  });
  const rightPerf = getPerformance({
    watchlistId: rightId,
    symbols: rightSymbols,
    snapshots,
    now: context?.now,
  });

  const leftHealth = getWatchlistHealth({
    watchlistId: leftId,
    symbols: leftSymbols,
    snapshots,
    sectorBySymbol: sectors,
    now: context?.now,
  } satisfies WatchlistIntelligenceContext);

  const rightHealth = getWatchlistHealth({
    watchlistId: rightId,
    symbols: rightSymbols,
    snapshots,
    sectorBySymbol: sectors,
    now: context?.now,
  } satisfies WatchlistIntelligenceContext);

  const rows: WorkspaceComparisonRow[] = [
    {
      label: "Returns",
      left: `${leftPerf.aggregateReturn}%`,
      right: `${rightPerf.aggregateReturn}%`,
    },
    {
      label: "Conviction",
      left: String(avgConviction(leftSymbols, snapshots)),
      right: String(avgConviction(rightSymbols, snapshots)),
    },
    {
      label: "Sectors",
      left: String(sectorSpread(leftSymbols, sectors)),
      right: String(sectorSpread(rightSymbols, sectors)),
    },
    {
      label: "Diversification",
      left: String(leftHealth.diversificationScore),
      right: String(rightHealth.diversificationScore),
    },
    {
      label: "Risk",
      left: String(leftHealth.averageRisk),
      right: String(rightHealth.averageRisk),
    },
    {
      label: "Company Count",
      left: String(leftSymbols.length),
      right: String(rightSymbols.length),
    },
  ];

  return {
    leftId,
    rightId,
    rows,
    empty: false,
    emptyMessage: WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace,
  };
}

export class WatchlistComparisonWorkspace {
  compareWatchlists = compareWatchlists;
}
