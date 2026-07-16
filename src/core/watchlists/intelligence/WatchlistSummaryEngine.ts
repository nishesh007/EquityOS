/**
 * Watchlist Summary Engine — AI narrative summary (Sprint 10B.R3).
 * Template-based NL from existing snapshots; no LLM recalculation.
 */

import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptySummaryView,
  safeIntelNumber,
  safeIntelText,
  type WatchlistIntelligenceContext,
  type WatchlistSummaryHighlight,
  type WatchlistSummaryView,
} from "./WatchlistPresentationModels";

function highlight(
  ticker: string,
  label: string,
  value: string
): WatchlistSummaryHighlight {
  return { ticker, label, value: safeIntelText(value, "—") };
}

export function getWatchlistSummary(
  context?: WatchlistIntelligenceContext | null
): WatchlistSummaryView {
  const watchlistId = safeIntelText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const snapshots = context?.snapshots ?? {};
  const prior = context?.priorSnapshots ?? {};
  const metrics = context?.metricsBySymbol ?? {};

  if (!symbols.length) {
    return emptySummaryView();
  }

  const rows = symbols
    .map((ticker) => ({ ticker, snap: snapshots[ticker] }))
    .filter((r): r is { ticker: string; snap: WatchlistItemSnapshot } => !!r.snap);

  if (!rows.length) {
    return emptySummaryView();
  }

  const byChange = [...rows].sort(
    (a, b) => b.snap.changePercent - a.snap.changePercent
  );
  const biggestWinner = byChange[0];
  const biggestLoser = byChange[byChange.length - 1];

  const convictionDeltas = rows
    .map((r) => {
      const prev = prior[r.ticker];
      const cur = safeIntelNumber(r.snap.convictionScore, 0);
      const old = prev ? safeIntelNumber(prev.convictionScore, cur) : cur;
      return { ticker: r.ticker, delta: cur - old, cur };
    })
    .sort((a, b) => b.delta - a.delta);

  const mostImproved = convictionDeltas[0];
  const mostDeteriorated = convictionDeltas[convictionDeltas.length - 1];

  const byConviction = [...rows].sort(
    (a, b) =>
      safeIntelNumber(b.snap.convictionScore, 0) -
      safeIntelNumber(a.snap.convictionScore, 0)
  );
  const highestConviction = byConviction[0];

  const byRisk = [...rows].sort((a, b) => {
    const riskA = 100 - safeIntelNumber(a.snap.trustScore, 50);
    const riskB = 100 - safeIntelNumber(b.snap.trustScore, 50);
    return riskB - riskA;
  });
  const highestRisk = byRisk[0];

  const avgChange =
    rows.reduce((sum, r) => sum + r.snap.changePercent, 0) / rows.length;
  const attention = rows.filter(
    (r) => Math.abs(r.snap.changePercent) >= 2 || safeIntelNumber(r.snap.convictionScore, 0) >= 75
  ).length;

  const narrative = [
    `Watchlist monitors ${rows.length} companies with average move ${avgChange.toFixed(2)}%.`,
    attention > 0
      ? `${attention} symbol${attention === 1 ? "" : "s"} deserve attention today.`
      : "No urgent attention flags detected.",
    biggestWinner
      ? `${biggestWinner.ticker} leads gains at ${biggestWinner.snap.changePercent.toFixed(2)}%.`
      : "",
    highestConviction
      ? `Highest conviction: ${highestConviction.ticker} (${safeIntelNumber(highestConviction.snap.convictionScore)}).`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const riskMetric = highestRisk
    ? safeIntelNumber(metrics[highestRisk.ticker]?.risk_score as number | null, 100 - safeIntelNumber(highestRisk.snap.trustScore, 50))
    : 0;

  return {
    watchlistId,
    narrative,
    biggestWinner: biggestWinner
      ? highlight(
          biggestWinner.ticker,
          "Biggest Winner",
          `${biggestWinner.snap.changePercent.toFixed(2)}%`
        )
      : null,
    biggestLoser: biggestLoser
      ? highlight(
          biggestLoser.ticker,
          "Biggest Loser",
          `${biggestLoser.snap.changePercent.toFixed(2)}%`
        )
      : null,
    mostImproved: mostImproved
      ? highlight(
          mostImproved.ticker,
          "Most Improved",
          `${mostImproved.delta >= 0 ? "+" : ""}${mostImproved.delta} conviction`
        )
      : null,
    mostDeteriorated: mostDeteriorated
      ? highlight(
          mostDeteriorated.ticker,
          "Most Deteriorated",
          `${mostDeteriorated.delta} conviction`
        )
      : null,
    highestConviction: highestConviction
      ? highlight(
          highestConviction.ticker,
          "Highest Conviction",
          String(safeIntelNumber(highestConviction.snap.convictionScore))
        )
      : null,
    highestRisk: highestRisk
      ? highlight(highestRisk.ticker, "Highest Risk", String(riskMetric))
      : null,
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };
}

export class WatchlistSummaryEngine {
  getWatchlistSummary = getWatchlistSummary;
}
