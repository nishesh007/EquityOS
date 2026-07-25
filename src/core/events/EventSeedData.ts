/**
 * Event catalog composer (Sprint 10D.2 / 10D.3).
 * Aggregates earnings, corporate action and macro repositories.
 */

import { toDateKey } from "@/src/core/events/EventFilters";
import { listCorporateActionEvents } from "@/src/core/events/repositories/corporateActionRepository";
import { listEarningsEvents } from "@/src/core/events/repositories/earningsRepository";
import { listMacroEvents } from "@/src/core/events/repositories/macroEventRepository";
import type { EventIntelligenceEvent } from "@/types/event";

/** Build a fresh catalog anchored to the local calendar day. */
export function buildEventSeedCatalog(
  today: string = toDateKey(new Date())
): EventIntelligenceEvent[] {
  const events = [
    ...listEarningsEvents(today),
    ...listCorporateActionEvents(today),
    ...listMacroEvents(today),
  ];

  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}
