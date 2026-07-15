/**
 * Institutional AI Screener — corporate action screens (Sprint 9D.R3).
 * Composes Sprint 9C corporate-action snapshots — no duplicated CA logic.
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

export const CORPORATE_ACTION_SCREEN_IDS = [
  "dividend",
  "bonus",
  "split",
  "buyback",
  "rights_issue",
  "merger",
  "demerger",
  "acquisition",
  "promoter_buying",
  "promoter_selling",
  "block_deal",
  "bulk_deal",
  "institutional_buying",
  "institutional_selling",
] as const;

export type CorporateActionScreenId =
  (typeof CORPORATE_ACTION_SCREEN_IDS)[number];

export const CORPORATE_ACTION_SCREEN_LABELS: Record<
  CorporateActionScreenId,
  string
> = {
  dividend: "Dividend",
  bonus: "Bonus",
  split: "Split",
  buyback: "Buyback",
  rights_issue: "Rights Issue",
  merger: "Merger",
  demerger: "Demerger",
  acquisition: "Acquisition",
  promoter_buying: "Promoter Buying",
  promoter_selling: "Promoter Selling",
  block_deal: "Block Deal",
  bulk_deal: "Bulk Deal",
  institutional_buying: "Institutional Buying",
  institutional_selling: "Institutional Selling",
};

const TAG_ALIASES: Record<CorporateActionScreenId, string[]> = {
  dividend: ["dividend"],
  bonus: ["bonus"],
  split: ["split"],
  buyback: ["buyback"],
  rights_issue: ["rights_issue", "rights"],
  merger: ["merger"],
  demerger: ["demerger"],
  acquisition: ["acquisition"],
  promoter_buying: ["promoter_buying", "promoter_activity"],
  promoter_selling: ["promoter_selling", "promoter_activity"],
  block_deal: ["block_deal", "shareholding_change"],
  bulk_deal: ["bulk_deal", "shareholding_change"],
  institutional_buying: ["institutional_buying", "shareholding_change"],
  institutional_selling: ["institutional_selling", "shareholding_change"],
};

export interface CorporateActionScreenOptions {
  events?: ScreenEventCandidate[];
  screens?: CorporateActionScreenId[];
  rankingMode?: EventRankingMode;
  resultLimit?: number;
  minMatches?: number;
}

function matchActions(
  candidate: ScreenEventCandidate,
  screens: CorporateActionScreenId[]
): string[] {
  const matched: string[] = [];
  for (const id of screens) {
    if (hasAnyTag(candidate, TAG_ALIASES[id])) {
      matched.push(CORPORATE_ACTION_SCREEN_LABELS[id]);
    }
  }
  return matched;
}

export function runCorporateActionScreen(
  options: CorporateActionScreenOptions = {}
): EventScreenResult {
  const events = options.events ?? [];
  if (events.length === 0) {
    return emptyEventScreenResult(
      "corporate-action",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }

  const screens = options.screens ?? [...CORPORATE_ACTION_SCREEN_IDS];
  const minMatches = options.minMatches ?? 1;
  const cards = [];

  for (const event of events) {
    const ticker = safeScreenText(event.ticker, "").toUpperCase();
    if (!ticker) continue;
    if (event.domain && event.domain !== "corporate_action") continue;
    const matched = matchActions({ ...event, ticker }, screens);
    if (matched.length < minMatches) continue;
    cards.push(
      buildEventCard({ ...event, ticker, domain: "corporate_action" }, matched)
    );
  }

  return finalizeEventScreen({
    mode: "corporate-action",
    cards,
    emptyMessage: SCREEN_EVENT_EMPTY.noCorporateActions,
    rankingMode: options.rankingMode ?? "CorporateAction",
    resultLimit: options.resultLimit,
  });
}

export class CorporateActionScreenEngine {
  run(options?: CorporateActionScreenOptions): EventScreenResult {
    return runCorporateActionScreen(options);
  }
}
