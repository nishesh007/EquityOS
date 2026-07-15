/**
 * Watchlist Alert Engine — watchlist opportunity intelligence (Sprint 9C.R2).
 * Reuses watchlist items ∩ opportunity snapshots; emits into R1 Alert Engine.
 */

import { generateAlert, registerAlertEngine } from "../AlertFacade";
import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  decideWatchlistAlerts,
  decisionToSourceEvent,
} from "./AlertDecisionEngine";
import {
  emptyIntelligenceBatch,
  INTELLIGENCE_ALERT_EMPTY,
  toAlertPresentationCard,
  type IntelligenceAlertBatch,
  type OpportunitySnapshot,
  type WatchlistItemSnapshot,
} from "./AlertPresentationModels";
import { deduplicateAlerts } from "./AlertDeduplicationEngine";

export interface WatchlistAlertInput {
  items: WatchlistItemSnapshot[];
  opportunities?: Map<string, OpportunitySnapshot> | Record<string, OpportunitySnapshot>;
  priorItems?: Record<string, WatchlistItemSnapshot> | null;
  now?: Date;
}

let priorWatchlist: Record<string, WatchlistItemSnapshot> = {};

export function getWatchlistAlertPriorState(): Record<string, WatchlistItemSnapshot> {
  return { ...priorWatchlist };
}

export function resetWatchlistAlertPriorState(): void {
  priorWatchlist = {};
}

export function seedWatchlistAlertPrior(
  items: readonly WatchlistItemSnapshot[]
): void {
  for (const item of items) {
    const key = safeAlertText(item.symbol, "").toUpperCase();
    if (key) priorWatchlist[key] = { ...item };
  }
}

function toOppMap(
  input?: Map<string, OpportunitySnapshot> | Record<string, OpportunitySnapshot>
): Map<string, OpportunitySnapshot> {
  if (!input) return new Map();
  if (input instanceof Map) {
    return new Map(
      [...input.entries()].map(([k, v]) => [k.toUpperCase(), v])
    );
  }
  return new Map(
    Object.entries(input).map(([k, v]) => [k.toUpperCase(), v])
  );
}

export class WatchlistAlertEngine {
  generate(input: WatchlistAlertInput): IntelligenceAlertBatch {
    registerAlertEngine();
    const now = input.now ?? new Date();

    if (!input.items.length) {
      return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.noWatchlist);
    }

    const oppMap = toOppMap(input.opportunities);
    const priorMap = input.priorItems ?? priorWatchlist;

    const collected: InstitutionalAlert[] = [];
    let created = 0;
    let deduplicated = 0;
    let grouped = 0;

    for (const item of input.items) {
      const key = safeAlertText(item.symbol, "").toUpperCase();
      if (!key) continue;
      const prior = priorMap[key] ?? null;
      const opportunity = oppMap.get(key) ?? null;
      const decisions = decideWatchlistAlerts(item, prior, opportunity);

      for (const decision of decisions) {
        const result = generateAlert(decisionToSourceEvent(decision), now);
        if (result.alert) collected.push(result.alert);
        if (result.created) created += 1;
        if (result.deduplicated) deduplicated += 1;
        if (result.grouped) grouped += 1;
      }

      priorWatchlist[key] = { ...item };
    }

    const deduped = deduplicateAlerts(collected);
    if (deduped.alerts.length === 0) {
      return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.noWatchlist);
    }

    return {
      alerts: deduped.alerts,
      cards: deduped.alerts.map((a) =>
        toAlertPresentationCard(
          a,
          typeof a.metadata.extras.kindLabel === "string"
            ? a.metadata.extras.kindLabel
            : undefined
        )
      ),
      total: deduped.alerts.length,
      created,
      deduplicated: deduplicated + deduped.merged,
      grouped,
      empty: false,
      emptyMessage: INTELLIGENCE_ALERT_EMPTY.noWatchlist,
    };
  }
}

let singleton: WatchlistAlertEngine | null = null;

export function getWatchlistAlertIntelligenceEngine(): WatchlistAlertEngine {
  if (!singleton) singleton = new WatchlistAlertEngine();
  return singleton;
}

export function resetWatchlistAlertIntelligenceEngine(): void {
  singleton = null;
  resetWatchlistAlertPriorState();
}

/** Public API — generateWatchlistAlerts() */
export function generateWatchlistAlerts(
  input: WatchlistAlertInput
): IntelligenceAlertBatch {
  try {
    return getWatchlistAlertIntelligenceEngine().generate(input);
  } catch {
    return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis);
  }
}
