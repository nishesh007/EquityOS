/**
 * Event Intelligence service façade (Sprint 10D.2).
 * Composes repository catalogs — live feeds land in later sprints.
 */

import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import type { EventIntelligenceEvent } from "@/types/event";

export interface EventIntelligenceCatalog {
  events: EventIntelligenceEvent[];
  asOf: string;
  source: "seed";
  counts: {
    earnings: number;
    corporateActions: number;
    economic: number;
  };
}

export async function fetchEventIntelligenceCatalog(): Promise<EventIntelligenceCatalog> {
  const asOf = toDateKey(new Date());
  const events = buildEventSeedCatalog(asOf);
  return {
    events,
    asOf,
    source: "seed",
    counts: {
      earnings: events.filter(
        (e) =>
          e.eventType === "quarterly_results" ||
          e.eventType === "annual_results" ||
          e.eventType === "conference_call"
      ).length,
      corporateActions: events.filter((e) => e.corporateActionDetail != null)
        .length,
      economic: events.filter((e) => e.exchange === "MACRO").length,
    },
  };
}
