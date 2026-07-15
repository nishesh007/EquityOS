/**
 * Watchlist Screen Engine — watchlist opportunity screening (Sprint 9D.R4).
 * Composes Watchlist / Opportunity / Market signals — no duplicated logic.
 */

import { safeScreenText } from "../ScreenModels";
import {
  INSTITUTIONAL_SCREEN_EMPTY,
  WATCHLIST_SCREEN_IDS,
  WATCHLIST_SCREEN_LABELS,
  emptyInstitutionalScreenResult,
  type InstitutionalCandidate,
  type InstitutionalScreenResult,
  type WatchlistScreenId,
} from "./InstitutionalScreenModels";
import {
  buildInstitutionalCard,
  finalizeInstitutionalScreen,
  matchTaggedSignals,
} from "./institutionalScreenHelpers";

const TAG_ALIASES: Record<WatchlistScreenId, string[]> = {
  best_watchlist_opportunity: [
    "best_watchlist_opportunity",
    "watchlist_opportunity",
    "high_conviction",
  ],
  entry_zone_reached: ["entry_zone_reached", "near_buy_zone"],
  breakout_candidate: ["breakout_candidate", "watchlist_breakout", "breakout"],
  accumulation: ["accumulation"],
  momentum_pickup: ["momentum_pickup", "momentum_breakout"],
  volume_confirmation: ["volume_confirmation", "high_volume"],
  value_opportunity: ["value_opportunity"],
  near_ath_breakout: ["near_ath_breakout"],
  oversold_quality: ["oversold_quality", "mean_reversion"],
  upcoming_catalyst: ["upcoming_catalyst", "upcoming_earnings"],
};

export interface WatchlistScreenOptions {
  items?: InstitutionalCandidate[];
  screens?: WatchlistScreenId[];
  resultLimit?: number;
  minMatches?: number;
}

function matchWatchlist(
  candidate: InstitutionalCandidate,
  screens: WatchlistScreenId[]
): string[] {
  const matched = matchTaggedSignals(
    candidate,
    screens,
    WATCHLIST_SCREEN_LABELS,
    TAG_ALIASES
  );

  if (
    screens.includes("best_watchlist_opportunity") &&
    !matched.includes(WATCHLIST_SCREEN_LABELS.best_watchlist_opportunity) &&
    (candidate.aiConviction ?? candidate.opportunityScore ?? 0) >= 75
  ) {
    matched.push(WATCHLIST_SCREEN_LABELS.best_watchlist_opportunity);
  }
  if (
    screens.includes("momentum_pickup") &&
    !matched.includes(WATCHLIST_SCREEN_LABELS.momentum_pickup) &&
    (candidate.momentum ?? 0) >= 70
  ) {
    matched.push(WATCHLIST_SCREEN_LABELS.momentum_pickup);
  }
  if (
    screens.includes("volume_confirmation") &&
    !matched.includes(WATCHLIST_SCREEN_LABELS.volume_confirmation) &&
    (candidate.liquidity ?? 0) >= 70
  ) {
    matched.push(WATCHLIST_SCREEN_LABELS.volume_confirmation);
  }
  return matched;
}

export function runWatchlistScreen(
  options: WatchlistScreenOptions = {}
): InstitutionalScreenResult {
  const items = options.items ?? [];
  if (items.length === 0) {
    return emptyInstitutionalScreenResult(
      "watchlist",
      INSTITUTIONAL_SCREEN_EMPTY.noWatchlist
    );
  }

  const screens = options.screens ?? [...WATCHLIST_SCREEN_IDS];
  const minMatches = options.minMatches ?? 1;
  const cards = [];

  for (const item of items) {
    const ticker = safeScreenText(item.ticker, "").toUpperCase();
    if (!ticker) continue;
    const candidate = {
      ...item,
      ticker,
      domain: "watchlist" as const,
      inWatchlist: true,
    };
    const matched = matchWatchlist(candidate, screens);
    if (matched.length < minMatches) continue;
    cards.push(buildInstitutionalCard(candidate, matched));
  }

  return finalizeInstitutionalScreen({
    mode: "watchlist",
    cards,
    emptyMessage: INSTITUTIONAL_SCREEN_EMPTY.noWatchlist,
    resultLimit: options.resultLimit,
  });
}

export class WatchlistScreenEngine {
  run(options?: WatchlistScreenOptions): InstitutionalScreenResult {
    return runWatchlistScreen(options);
  }
}
