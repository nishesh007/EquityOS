/**
 * Executive Watchlist Health — composes R3 health + R5 scorecard (Sprint 10B.R8).
 */

import { getScorecard } from "../analytics";
import { getWatchlistHealth } from "../intelligence";
import { getWatchlistEngine } from "../WatchlistEngine";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  emptyExecutiveHealth,
  formatExecutiveScore,
  safeExecutiveNumber,
  type ExecutiveWatchlistComposeInput,
  type ExecutiveWatchlistHealthView,
} from "./ExecutiveWatchlistModels";

export class ExecutiveWatchlistHealth {
  build(input?: ExecutiveWatchlistComposeInput | null): ExecutiveWatchlistHealthView {
    const active = getWatchlistEngine().getActiveWatchlist();
    if (!active || !active.symbols.length) {
      return emptyExecutiveHealth(EXECUTIVE_WATCHLIST_EMPTY.noWatchlists);
    }

    const ctx = {
      watchlistId: active.id,
      symbols: active.symbols,
      snapshots: input?.snapshots,
      sectorBySymbol: input?.sectorBySymbol,
      portfolioSymbols: input?.portfolioSymbols,
      now: input?.now,
    };

    const health = getWatchlistHealth(ctx);
    const scorecard = getScorecard(ctx);
    const validation = safeExecutiveNumber(
      scorecard.scores.researchQuality,
      health.averageConviction
    );

    const overallHealthScore = Math.round(
      safeExecutiveNumber(scorecard.scores.overall, 0) ||
        (health.averageConviction +
          health.averageTrust +
          health.diversificationScore) /
          3
    );

    return {
      averageConviction: health.averageConviction,
      averageTrust: health.averageTrust,
      averageValidation: validation,
      averageDiversification: health.diversificationScore,
      overallHealthScore,
      overallHealthLabel: `Grade ${scorecard.overallGrade} · ${formatExecutiveScore(overallHealthScore)}`,
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics,
    };
  }
}

export function getExecutiveWatchlistHealth(
  input?: ExecutiveWatchlistComposeInput | null
): ExecutiveWatchlistHealthView {
  return new ExecutiveWatchlistHealth().build(input);
}
