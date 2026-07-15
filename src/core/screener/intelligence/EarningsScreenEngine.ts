/**
 * Institutional AI Screener — earnings event screens (Sprint 9D.R3).
 * Composes Sprint 9B / 9C earnings snapshots — no duplicated earnings logic.
 */

import { safeScreenText } from "../ScreenModels";
import {
  SCREEN_EVENT_EMPTY,
  emptyEventScreenResult,
  type EventScreenResult,
  type ScreenEventCandidate,
} from "./EventPresentationModels";
import type { EventRankingMode } from "./EventRankingEngine";
import {
  buildEventCard,
  finalizeEventScreen,
  hasAnyTag,
} from "./eventScreenHelpers";

export const EARNINGS_SCREEN_IDS = [
  "upcoming_earnings",
  "earnings_today",
  "earnings_tomorrow",
  "this_week",
  "high_expected_growth",
  "high_revenue_growth",
  "eps_growth",
  "margin_expansion",
  "beat_estimate",
  "miss_estimate",
  "positive_guidance",
  "negative_guidance",
  "high_confidence_earnings",
  "portfolio_earnings",
  "watchlist_earnings",
] as const;

export type EarningsScreenId = (typeof EARNINGS_SCREEN_IDS)[number];

export const EARNINGS_SCREEN_LABELS: Record<EarningsScreenId, string> = {
  upcoming_earnings: "Upcoming Earnings",
  earnings_today: "Today's Earnings",
  earnings_tomorrow: "Tomorrow Earnings",
  this_week: "This Week",
  high_expected_growth: "High Expected Growth",
  high_revenue_growth: "High Revenue Growth",
  eps_growth: "EPS Growth",
  margin_expansion: "Margin Expansion",
  beat_estimate: "Beat Estimate",
  miss_estimate: "Miss Estimate",
  positive_guidance: "Positive Guidance",
  negative_guidance: "Negative Guidance",
  high_confidence_earnings: "High Confidence Earnings",
  portfolio_earnings: "Portfolio Earnings",
  watchlist_earnings: "Watchlist Earnings",
};

/** Tag aliases accepted from 9B/9C composition payloads. */
const TAG_ALIASES: Record<EarningsScreenId, string[]> = {
  upcoming_earnings: ["upcoming_earnings", "upcoming"],
  earnings_today: ["earnings_today", "today"],
  earnings_tomorrow: ["earnings_tomorrow", "tomorrow"],
  this_week: ["this_week", "earnings_this_week", "week"],
  high_expected_growth: ["high_expected_growth", "expected_growth"],
  high_revenue_growth: ["high_revenue_growth", "revenue_beat", "revenue_growth"],
  eps_growth: ["eps_growth", "eps_beat"],
  margin_expansion: ["margin_expansion"],
  beat_estimate: ["beat_estimate", "eps_beat", "revenue_beat"],
  miss_estimate: ["miss_estimate", "eps_miss", "revenue_miss"],
  positive_guidance: ["positive_guidance", "guidance_raised"],
  negative_guidance: ["negative_guidance", "guidance_lowered"],
  high_confidence_earnings: ["high_confidence_earnings", "high_confidence"],
  portfolio_earnings: ["portfolio_earnings", "portfolio"],
  watchlist_earnings: ["watchlist_earnings", "watchlist"],
};

export interface EarningsScreenOptions {
  events?: ScreenEventCandidate[];
  screens?: EarningsScreenId[];
  rankingMode?: EventRankingMode;
  resultLimit?: number;
  minMatches?: number;
}

function matchEarnings(
  candidate: ScreenEventCandidate,
  screens: EarningsScreenId[]
): string[] {
  const matched: string[] = [];
  for (const id of screens) {
    if (id === "portfolio_earnings" && candidate.inPortfolio) {
      matched.push(EARNINGS_SCREEN_LABELS[id]);
      continue;
    }
    if (id === "watchlist_earnings" && candidate.inWatchlist) {
      matched.push(EARNINGS_SCREEN_LABELS[id]);
      continue;
    }
    if (id === "high_confidence_earnings") {
      const conf = candidate.confidence;
      if (typeof conf === "number" && Number.isFinite(conf) && conf >= 70) {
        matched.push(EARNINGS_SCREEN_LABELS[id]);
        continue;
      }
    }
    if (hasAnyTag(candidate, TAG_ALIASES[id])) {
      matched.push(EARNINGS_SCREEN_LABELS[id]);
    }
  }
  return matched;
}

export function runEarningsScreen(
  options: EarningsScreenOptions = {}
): EventScreenResult {
  const events = options.events ?? [];
  if (events.length === 0) {
    return emptyEventScreenResult(
      "earnings",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }

  const screens = options.screens ?? [...EARNINGS_SCREEN_IDS];
  const minMatches = options.minMatches ?? 1;
  const cards = [];

  for (const event of events) {
    const ticker = safeScreenText(event.ticker, "").toUpperCase();
    if (!ticker) continue;
    if (event.domain && event.domain !== "earnings") continue;
    const matched = matchEarnings({ ...event, ticker }, screens);
    if (matched.length < minMatches) continue;
    cards.push(buildEventCard({ ...event, ticker, domain: "earnings" }, matched));
  }

  return finalizeEventScreen({
    mode: "earnings",
    cards,
    emptyMessage: SCREEN_EVENT_EMPTY.noEarningsMatches,
    rankingMode: options.rankingMode ?? "Earnings",
    resultLimit: options.resultLimit,
  });
}

export class EarningsScreenEngine {
  run(options?: EarningsScreenOptions): EventScreenResult {
    return runEarningsScreen(options);
  }
}
