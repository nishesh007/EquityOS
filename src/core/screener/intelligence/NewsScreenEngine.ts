/**
 * Institutional AI Screener — news event screens (Sprint 9D.R3).
 * Composes Sprint 9C news alert snapshots — no duplicated news ranking.
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

export const NEWS_SCREEN_IDS = [
  "breaking_news",
  "positive_news",
  "negative_news",
  "analyst_upgrade",
  "analyst_downgrade",
  "target_increase",
  "target_decrease",
  "large_order_win",
  "regulatory_approval",
  "management_interview",
  "industry_news",
  "sector_news",
] as const;

export type NewsScreenId = (typeof NEWS_SCREEN_IDS)[number];

export const NEWS_SCREEN_LABELS: Record<NewsScreenId, string> = {
  breaking_news: "Breaking News",
  positive_news: "Positive News",
  negative_news: "Negative News",
  analyst_upgrade: "Analyst Upgrade",
  analyst_downgrade: "Analyst Downgrade",
  target_increase: "Target Increase",
  target_decrease: "Target Decrease",
  large_order_win: "Large Order Win",
  regulatory_approval: "Regulatory Approval",
  management_interview: "Management Interview",
  industry_news: "Industry News",
  sector_news: "Sector News",
};

const TAG_ALIASES: Record<NewsScreenId, string[]> = {
  breaking_news: ["breaking_news"],
  positive_news: ["positive_news"],
  negative_news: ["negative_news"],
  analyst_upgrade: ["analyst_upgrade"],
  analyst_downgrade: ["analyst_downgrade"],
  target_increase: ["target_increase", "target_price_change", "target_raised"],
  target_decrease: ["target_decrease", "target_cut"],
  large_order_win: ["large_order_win", "major_contract"],
  regulatory_approval: ["regulatory_approval", "policy_news"],
  management_interview: ["management_interview", "management_change"],
  industry_news: ["industry_news", "macro_news"],
  sector_news: ["sector_news"],
};

export interface NewsScreenOptions {
  events?: ScreenEventCandidate[];
  screens?: NewsScreenId[];
  rankingMode?: EventRankingMode;
  resultLimit?: number;
  minMatches?: number;
}

function matchNews(
  candidate: ScreenEventCandidate,
  screens: NewsScreenId[]
): string[] {
  const matched: string[] = [];
  for (const id of screens) {
    if (hasAnyTag(candidate, TAG_ALIASES[id])) {
      matched.push(NEWS_SCREEN_LABELS[id]);
    }
  }
  return matched;
}

export function runNewsScreen(
  options: NewsScreenOptions = {}
): EventScreenResult {
  const events = options.events ?? [];
  if (events.length === 0) {
    return emptyEventScreenResult("news", SCREEN_EVENT_EMPTY.awaitingEventScan);
  }

  const screens = options.screens ?? [...NEWS_SCREEN_IDS];
  const minMatches = options.minMatches ?? 1;
  const cards = [];

  for (const event of events) {
    const ticker = safeScreenText(event.ticker, "").toUpperCase();
    if (!ticker) continue;
    if (event.domain && event.domain !== "news") continue;
    const matched = matchNews({ ...event, ticker }, screens);
    if (matched.length < minMatches) continue;
    cards.push(buildEventCard({ ...event, ticker, domain: "news" }, matched));
  }

  return finalizeEventScreen({
    mode: "news",
    cards,
    emptyMessage: SCREEN_EVENT_EMPTY.noNewsMatches,
    rankingMode: options.rankingMode ?? "News",
    resultLimit: options.resultLimit,
  });
}

export class NewsScreenEngine {
  run(options?: NewsScreenOptions): EventScreenResult {
    return runNewsScreen(options);
  }
}
