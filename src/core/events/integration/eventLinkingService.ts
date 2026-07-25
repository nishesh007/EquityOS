/**
 * Shared event linking helpers (Sprint 10D.5).
 * Pure matching — does not touch repositories or scoring engines.
 */

import {
  addDays,
  getEventCategory,
  toDateKey,
} from "@/src/core/events/EventFilters";
import type { EventIntelligenceEvent } from "@/types/event";
import type {
  EventAwarenessKind,
  EventCountdown,
  LinkedSymbolEvent,
} from "@/types/eventIntegration";

export function eventCountdown(
  eventDate: string,
  today: string = toDateKey(new Date())
): EventCountdown {
  if (eventDate === today) return { days: 0, label: "Today" };
  if (eventDate === addDays(today, 1)) return { days: 1, label: "1 Day" };
  if (eventDate < today) {
    return { days: -1, label: "Past" };
  }
  const start = new Date(`${today}T00:00:00`);
  const end = new Date(`${eventDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return { days, label: `${days} Days` };
}

export function deriveAwarenessKinds(
  event: EventIntelligenceEvent,
  today: string
): EventAwarenessKind[] {
  const kinds: EventAwarenessKind[] = [];
  const category = getEventCategory(event.eventType);
  const tomorrow = addDays(today, 1);

  if (
    (event.eventType === "quarterly_results" ||
      event.eventType === "annual_results") &&
    event.date === tomorrow
  ) {
    kinds.push("results_tomorrow");
  }
  if (
    (event.eventType === "quarterly_results" ||
      event.eventType === "annual_results") &&
    event.date === today
  ) {
    kinds.push("results_today");
  }
  if (event.eventType === "dividend" && event.date === today) {
    kinds.push("dividend_today");
  }
  if (event.eventType === "dividend" && event.date > today) {
    kinds.push("dividend_upcoming");
  }
  if (event.eventType === "bonus") kinds.push("bonus");
  if (event.eventType === "stock_split") kinds.push("split");
  if (event.eventType === "buyback") kinds.push("buyback");
  if (event.eventType === "agm" || event.eventType === "egm") kinds.push("agm");
  if (event.importance === "critical") kinds.push("critical");
  if (event.importance === "high" || (event.impactScore ?? 0) >= 75) {
    kinds.push("high_impact");
  }
  if (category === "central_bank") kinds.push("central_bank");
  if (category === "economic" || category === "central_bank" || event.macroDetail) {
    kinds.push("macro");
  }
  if (category === "corporate_actions") kinds.push("corporate_action");

  return [...new Set(kinds)];
}

function normalizeSymbol(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function classifyRisk(
  event: EventIntelligenceEvent
): LinkedSymbolEvent["riskLabel"] {
  if (
    event.eventType === "dividend" ||
    event.eventType === "bonus" ||
    event.marketDirection === "bullish"
  ) {
    return "opportunity";
  }
  if (
    event.importance === "critical" ||
    event.importance === "high" ||
    event.marketDirection === "bearish" ||
    event.eventType === "quarterly_results" ||
    event.eventType === "annual_results"
  ) {
    return "risk";
  }
  return "neutral";
}

/** Match catalog events to a symbol (ticker / affected stocks / optional sector). */
export function linkEventsToSymbol(
  events: readonly EventIntelligenceEvent[],
  symbol: string,
  opts?: { sector?: string | null; today?: string; upcomingOnly?: boolean }
): LinkedSymbolEvent[] {
  const today = opts?.today ?? toDateKey(new Date());
  const sym = normalizeSymbol(symbol);
  const sector = (opts?.sector ?? "").trim().toLowerCase();
  const upcomingOnly = opts?.upcomingOnly ?? true;

  const matches: LinkedSymbolEvent[] = [];

  for (const event of events) {
    if (upcomingOnly && event.date < today) continue;

    let matchReason: LinkedSymbolEvent["matchReason"] | null = null;
    if (normalizeSymbol(event.ticker) === sym) matchReason = "ticker";
    else if (event.affectedStocks.some((s) => normalizeSymbol(s) === sym)) {
      matchReason = "affected_stock";
    } else if (
      sector &&
      (event.sector?.toLowerCase() === sector ||
        event.affectedSectors.some((s) => s.toLowerCase() === sector) ||
        event.macroDetail?.sectorImpact.positive.some(
          (s) => s.toLowerCase().includes(sector) || sector.includes(s.toLowerCase())
        ) ||
        event.macroDetail?.sectorImpact.negative.some(
          (s) => s.toLowerCase().includes(sector) || sector.includes(s.toLowerCase())
        ))
    ) {
      // Macro/sector overlays only for high-importance catalysts
      if (
        event.importance === "critical" ||
        event.importance === "high" ||
        event.macroDetail?.theme === "central_bank"
      ) {
        matchReason = "sector";
      }
    }

    if (!matchReason) continue;

    matches.push({
      event,
      symbol: sym,
      matchReason,
      countdown: eventCountdown(event.date, today),
      awareness: deriveAwarenessKinds(event, today),
      impactScore: event.impactScore ?? null,
      riskLabel: classifyRisk(event),
    });
  }

  return matches.sort((a, b) => {
    if (a.event.date !== b.event.date) {
      return a.event.date.localeCompare(b.event.date);
    }
    return (b.impactScore ?? 0) - (a.impactScore ?? 0);
  });
}

export function findEventById(
  events: readonly EventIntelligenceEvent[],
  id: string
): EventIntelligenceEvent | null {
  return events.find((e) => e.id === id) ?? null;
}

export function eventHref(eventId: string): string {
  return `/events?event=${encodeURIComponent(eventId)}`;
}

export const eventLinkingService = {
  countdown: eventCountdown,
  awareness: deriveAwarenessKinds,
  linkToSymbol: linkEventsToSymbol,
  findById: findEventById,
  href: eventHref,
};
