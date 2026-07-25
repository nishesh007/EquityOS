/**
 * Event Intelligence service façade (Sprint 10D.1).
 * Returns foundation seed catalog — live feeds land in later sprints.
 */

import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import type { EventIntelligenceEvent } from "@/types/event";

export interface EventIntelligenceCatalog {
  events: EventIntelligenceEvent[];
  asOf: string;
  source: "seed";
}

export async function fetchEventIntelligenceCatalog(): Promise<EventIntelligenceCatalog> {
  const asOf = toDateKey(new Date());
  return {
    events: buildEventSeedCatalog(asOf),
    asOf,
    source: "seed",
  };
}
