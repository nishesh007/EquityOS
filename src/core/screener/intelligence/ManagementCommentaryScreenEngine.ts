/**
 * Institutional AI Screener — management commentary screens (Sprint 9D.R3).
 * Composes Sprint 9B/9C commentary snapshots — no duplicated transcript logic.
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

export const MANAGEMENT_SCREEN_IDS = [
  "positive_commentary",
  "negative_commentary",
  "expansion_plans",
  "capex",
  "guidance",
  "demand_commentary",
  "margin_commentary",
  "risk_commentary",
] as const;

export type ManagementScreenId = (typeof MANAGEMENT_SCREEN_IDS)[number];

export const MANAGEMENT_SCREEN_LABELS: Record<ManagementScreenId, string> = {
  positive_commentary: "Positive Commentary",
  negative_commentary: "Negative Commentary",
  expansion_plans: "Expansion Plans",
  capex: "Capex",
  guidance: "Guidance",
  demand_commentary: "Demand Commentary",
  margin_commentary: "Margin Commentary",
  risk_commentary: "Risk Commentary",
};

const TAG_ALIASES: Record<ManagementScreenId, string[]> = {
  positive_commentary: ["positive_commentary", "bullish_tone"],
  negative_commentary: ["negative_commentary", "bearish_tone"],
  expansion_plans: ["expansion_plans", "expansion"],
  capex: ["capex"],
  guidance: ["guidance", "guidance_raised", "guidance_lowered"],
  demand_commentary: ["demand_commentary", "demand"],
  margin_commentary: ["margin_commentary", "margin_expansion", "margin_compression"],
  risk_commentary: ["risk_commentary", "risk"],
};

export interface ManagementScreenOptions {
  events?: ScreenEventCandidate[];
  screens?: ManagementScreenId[];
  rankingMode?: EventRankingMode;
  resultLimit?: number;
  minMatches?: number;
}

function matchManagement(
  candidate: ScreenEventCandidate,
  screens: ManagementScreenId[]
): string[] {
  const matched: string[] = [];
  for (const id of screens) {
    if (hasAnyTag(candidate, TAG_ALIASES[id])) {
      matched.push(MANAGEMENT_SCREEN_LABELS[id]);
    }
  }
  return matched;
}

export function runManagementScreen(
  options: ManagementScreenOptions = {}
): EventScreenResult {
  const events = options.events ?? [];
  if (events.length === 0) {
    return emptyEventScreenResult(
      "management",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }

  const screens = options.screens ?? [...MANAGEMENT_SCREEN_IDS];
  const minMatches = options.minMatches ?? 1;
  const cards = [];

  for (const event of events) {
    const ticker = safeScreenText(event.ticker, "").toUpperCase();
    if (!ticker) continue;
    if (event.domain && event.domain !== "management") continue;
    const matched = matchManagement({ ...event, ticker }, screens);
    if (matched.length < minMatches) continue;
    cards.push(
      buildEventCard({ ...event, ticker, domain: "management" }, matched)
    );
  }

  return finalizeEventScreen({
    mode: "management",
    cards,
    emptyMessage: SCREEN_EVENT_EMPTY.noEventMatches,
    rankingMode: options.rankingMode ?? "Management",
    resultLimit: options.resultLimit,
  });
}

export class ManagementCommentaryScreenEngine {
  run(options?: ManagementScreenOptions): EventScreenResult {
    return runManagementScreen(options);
  }
}
