/**
 * Executive Watchlist Metrics — composes R5 performance (Sprint 10B.R8).
 */

import { getPerformance } from "../analytics";
import { getWatchlists } from "../WatchlistEngine";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  emptyExecutiveMetrics,
  formatExecutivePct,
  formatExecutiveScore,
  safeExecutiveNumber,
  safeExecutiveText,
  type ExecutiveWatchlistComposeInput,
  type ExecutiveWatchlistMetricBundle,
} from "./ExecutiveWatchlistModels";

export class ExecutiveWatchlistMetrics {
  compute(input?: ExecutiveWatchlistComposeInput | null): ExecutiveWatchlistMetricBundle {
    const records = getWatchlists({ includeArchived: false });
    if (!records.length) {
      return emptyExecutiveMetrics(EXECUTIVE_WATCHLIST_EMPTY.noWatchlists);
    }

    const snapshots = input?.snapshots ?? {};
    const unique = new Set<string>();
    let totalCompanies = 0;
    const perfRows: Array<{ id: string; name: string; return: number; winRate: number }> = [];

    for (const record of records) {
      totalCompanies += record.symbols.length;
      for (const sym of record.symbols) unique.add(sym.toUpperCase());

      const perf = getPerformance({
        watchlistId: record.id,
        symbols: record.symbols,
        snapshots,
        now: input?.now,
      });
      if (!perf.empty) {
        perfRows.push({
          id: record.id,
          name: record.metadata.name,
          return: perf.aggregateReturn,
          winRate: perf.winRate,
        });
      }
    }

    const sorted = [...perfRows].sort((a, b) => b.return - a.return);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const averageReturn =
      perfRows.length === 0
        ? 0
        : perfRows.reduce((s, r) => s + r.return, 0) / perfRows.length;
    const averageWinRate =
      perfRows.length === 0
        ? 0
        : perfRows.reduce((s, r) => s + r.winRate, 0) / perfRows.length;
    const averagePerformance = averageReturn;

    return {
      totalCompanies,
      uniqueCompanies: unique.size,
      averagePerformance: Math.round(averagePerformance * 100) / 100,
      bestWatchlist: best
        ? safeExecutiveText(best.name, best.id)
        : EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics,
      worstWatchlist: worst
        ? safeExecutiveText(worst.name, worst.id)
        : EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics,
      averageReturn: Math.round(averageReturn * 100) / 100,
      averageWinRate: Math.round(averageWinRate * 100) / 100,
      labels: {
        totalCompanies: String(totalCompanies),
        uniqueCompanies: String(unique.size),
        averagePerformance: formatExecutivePct(averagePerformance),
        averageReturn: formatExecutivePct(averageReturn),
        averageWinRate: formatExecutivePct(averageWinRate),
        bestWatchlist: best?.name ?? "—",
        worstWatchlist: worst?.name ?? "—",
      },
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics,
    };
  }
}

export function getExecutiveWatchlistMetrics(
  input?: ExecutiveWatchlistComposeInput | null
): ExecutiveWatchlistMetricBundle {
  return new ExecutiveWatchlistMetrics().compute(input);
}
