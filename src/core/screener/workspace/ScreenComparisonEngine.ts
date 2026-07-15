/**
 * Institutional Screener Workspace — comparison engine (Sprint 9D.R7).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  emptyScreenComparisonResult,
  normalizeComparisonTickerDelta,
  normalizeScreenComparisonResult,
  WORKSPACE_EMPTY,
  type ComparisonTickerDelta,
  type ScreenComparisonResult,
  type ScoreDelta,
} from "./WorkspacePresentationModels";

export interface ComparableSide {
  label?: string | null;
  tickers?: Array<{ ticker: string; score?: number | null }> | null;
  scores?: Record<string, number | null | undefined> | null;
}

function collectScores(side: ComparableSide): Map<string, number> {
  const map = new Map<string, number>();
  if (Array.isArray(side.tickers)) {
    for (const row of side.tickers) {
      const ticker = safeScreenText(row.ticker, "").toUpperCase();
      if (!ticker) continue;
      map.set(ticker, safeScreenNumber(row.score, 0));
    }
  }
  if (side.scores && typeof side.scores === "object") {
    for (const [key, value] of Object.entries(side.scores)) {
      const ticker = safeScreenText(key, "").toUpperCase();
      if (!ticker) continue;
      map.set(ticker, safeScreenNumber(value, map.get(ticker) ?? 0));
    }
  }
  return map;
}

function classifyDelta(delta: number): ScoreDelta {
  if (delta > 0) return "Improved";
  if (delta < 0) return "Declined";
  return "Unchanged";
}

function buildComparison(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  const leftScores = collectScores(left);
  const rightScores = collectScores(right);
  const tickers = new Set([...leftScores.keys(), ...rightScores.keys()]);

  if (tickers.size === 0) {
    return emptyScreenComparisonResult(WORKSPACE_EMPTY.noComparisons);
  }

  const winners: ComparisonTickerDelta[] = [];
  const losers: ComparisonTickerDelta[] = [];
  const unchanged: ComparisonTickerDelta[] = [];

  for (const ticker of tickers) {
    const leftScore = safeScreenNumber(leftScores.get(ticker), 0);
    const rightScore = safeScreenNumber(rightScores.get(ticker), 0);
    const delta = rightScore - leftScore;
    const row = normalizeComparisonTickerDelta({
      ticker,
      leftScore,
      rightScore,
      delta,
      status: classifyDelta(delta),
    });
    if (row.status === "Improved") winners.push(row);
    else if (row.status === "Declined") losers.push(row);
    else unchanged.push(row);
  }

  winners.sort((a, b) => b.delta - a.delta);
  losers.sort((a, b) => a.delta - b.delta);

  const leftLabel = safeScreenText(left.label, "Left");
  const rightLabel = safeScreenText(right.label, "Right");
  const summary = safeScreenText(
    `${rightLabel} vs ${leftLabel}: ${winners.length} improved, ${losers.length} declined, ${unchanged.length} unchanged`,
    WORKSPACE_EMPTY.noComparisons
  );

  return normalizeScreenComparisonResult({
    leftLabel,
    rightLabel,
    winners,
    losers,
    unchanged,
    summary,
    empty: false,
  });
}

export function compareScreens(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  try {
    return buildComparison(left, right);
  } catch {
    return emptyScreenComparisonResult(WORKSPACE_EMPTY.noComparisons);
  }
}

export function compareRuns(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  return compareScreens(
    { ...left, label: safeScreenText(left.label, "Run A") },
    { ...right, label: safeScreenText(right.label, "Run B") }
  );
}

export function compareStrategies(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  return compareScreens(
    { ...left, label: safeScreenText(left.label, "Strategy A") },
    { ...right, label: safeScreenText(right.label, "Strategy B") }
  );
}

export function compareSectorSnapshots(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  return compareScreens(
    { ...left, label: safeScreenText(left.label, "Sector A") },
    { ...right, label: safeScreenText(right.label, "Sector B") }
  );
}

export function portfolioVsMarket(
  portfolio: ComparableSide,
  market: ComparableSide
): ScreenComparisonResult {
  return compareScreens(
    { ...market, label: safeScreenText(market.label, "Market") },
    { ...portfolio, label: safeScreenText(portfolio.label, "Portfolio") }
  );
}

export function watchlistVsMarket(
  watchlist: ComparableSide,
  market: ComparableSide
): ScreenComparisonResult {
  return compareScreens(
    { ...market, label: safeScreenText(market.label, "Market") },
    { ...watchlist, label: safeScreenText(watchlist.label, "Watchlist") }
  );
}

export const ScreenComparisonEngine = {
  compareScreens,
  compareRuns,
  compareStrategies,
  compareSectorSnapshots,
  portfolioVsMarket,
  watchlistVsMarket,
};
