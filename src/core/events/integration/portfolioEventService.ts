/**
 * Portfolio / watchlist / recommendation / dashboard / alert services (10D.5).
 */

import {
  addDays,
  getEventCategory,
  toDateKey,
} from "@/src/core/events/EventFilters";
import {
  eventCountdown,
  linkEventsToSymbol,
} from "@/src/core/events/integration/eventLinkingService";
import type { EventIntelligenceEvent } from "@/types/event";
import type {
  DashboardEventBuckets,
  PortfolioEventInsight,
  PreparedAlertDraft,
  PreparedAlertKind,
  RecommendationEventWarning,
  WatchlistEventInsight,
} from "@/types/eventIntegration";

export function buildPortfolioEventInsights(
  events: readonly EventIntelligenceEvent[],
  holdings: Array<{ symbol: string; name: string; sector?: string | null }>,
  today: string = toDateKey(new Date())
): PortfolioEventInsight[] {
  return holdings.map((holding) => {
    const matches = linkEventsToSymbol(events, holding.symbol, {
      sector: holding.sector,
      today,
      upcomingOnly: true,
    });
    const primary = matches[0] ?? null;
    return {
      symbol: holding.symbol.toUpperCase(),
      name: holding.name,
      matches,
      primary,
      risks: matches.filter((m) => m.riskLabel === "risk"),
      opportunities: matches.filter((m) => m.riskLabel === "opportunity"),
    };
  });
}

export const portfolioEventService = {
  buildInsights: buildPortfolioEventInsights,
};

export function buildWatchlistEventInsights(
  events: readonly EventIntelligenceEvent[],
  items: Array<{ symbol: string; sector?: string | null }>,
  today: string = toDateKey(new Date())
): WatchlistEventInsight[] {
  return items.map((item) => {
    const matches = linkEventsToSymbol(events, item.symbol, {
      sector: item.sector,
      today,
      upcomingOnly: true,
    });
    const primary = matches[0] ?? null;
    return {
      symbol: item.symbol.toUpperCase(),
      matches,
      primary,
      badgeKind: primary?.awareness[0] ?? null,
    };
  });
}

export const watchlistEventService = {
  buildInsights: buildWatchlistEventInsights,
};

export function buildRecommendationEventWarning(
  events: readonly EventIntelligenceEvent[],
  symbol: string,
  today: string = toDateKey(new Date())
): RecommendationEventWarning {
  const matches = linkEventsToSymbol(events, symbol, {
    today,
    upcomingOnly: true,
  }).filter(
    (m) =>
      m.awareness.includes("results_tomorrow") ||
      m.awareness.includes("results_today") ||
      m.awareness.includes("high_impact") ||
      m.awareness.includes("critical") ||
      m.event.importance === "high" ||
      m.event.importance === "critical"
  );
  const primary = matches[0] ?? null;
  if (!primary) {
    return { symbol: symbol.toUpperCase(), primary: null, label: null, impactScore: null };
  }
  const typeLabel =
    primary.awareness.includes("results_tomorrow") ||
    primary.awareness.includes("results_today")
      ? "Results"
      : primary.awareness.includes("dividend_today") ||
          primary.awareness.includes("dividend_upcoming")
        ? "Dividend"
        : primary.awareness.includes("macro") ||
            primary.awareness.includes("central_bank")
          ? "Macro"
          : "Event";
  return {
    symbol: symbol.toUpperCase(),
    primary,
    label: `${typeLabel} · ${primary.countdown.label}`,
    impactScore: primary.impactScore,
  };
}

export const recommendationEventService = {
  buildWarning: buildRecommendationEventWarning,
};

export function buildDashboardEventBuckets(
  events: readonly EventIntelligenceEvent[],
  today: string = toDateKey(new Date())
): DashboardEventBuckets {
  const weekEnd = addDays(today, 7);
  const criticalUpcoming = events
    .filter(
      (e) =>
        e.date >= today &&
        e.date <= weekEnd &&
        (e.importance === "critical" || e.importance === "high")
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const todays = events.filter((e) => e.date === today);
  const todaysEarnings = todays.filter(
    (e) =>
      e.eventType === "quarterly_results" ||
      e.eventType === "annual_results" ||
      e.eventType === "conference_call"
  );
  const todaysCorporateActions = todays.filter((e) => {
    const cat = getEventCategory(e.eventType);
    return cat === "corporate_actions";
  });
  const todaysMacro = todays.filter(
    (e) =>
      e.exchange === "MACRO" ||
      getEventCategory(e.eventType) === "economic" ||
      getEventCategory(e.eventType) === "central_bank"
  );

  return {
    asOf: today,
    criticalUpcoming,
    todaysEarnings,
    todaysCorporateActions,
    todaysMacro,
  };
}

export const dashboardEventService = {
  buildBuckets: buildDashboardEventBuckets,
  countdown: eventCountdown,
};

function alertKindForEvent(
  event: EventIntelligenceEvent,
  today: string
): PreparedAlertKind | null {
  const tomorrow = addDays(today, 1);
  if (
    (event.eventType === "quarterly_results" ||
      event.eventType === "annual_results") &&
    event.date === tomorrow
  ) {
    return "earnings_tomorrow";
  }
  if (event.eventType === "dividend" && event.date === tomorrow) {
    return "dividend_tomorrow";
  }
  if (event.eventType === "bonus") return "bonus";
  if (event.eventType === "stock_split") return "split";
  if (event.eventType === "buyback") return "buyback";
  if (
    (event.eventType === "rbi_policy" || event.eventType === "repo_rate") &&
    event.date === tomorrow
  ) {
    return "rbi_tomorrow";
  }
  if (event.eventType === "fed_meeting" && event.date === today) {
    return "fed_tonight";
  }
  if (
    event.exchange === "MACRO" &&
    (event.importance === "critical" || event.importance === "high") &&
    event.date >= today &&
    event.date <= tomorrow
  ) {
    return "critical_macro";
  }
  return null;
}

/** Prepare alert drafts only — no push/email/SMS delivery. */
export function prepareAlertDrafts(
  events: readonly EventIntelligenceEvent[],
  opts?: {
    today?: string;
    portfolioSymbols?: string[];
    watchlistSymbols?: string[];
  }
): PreparedAlertDraft[] {
  const today = opts?.today ?? toDateKey(new Date());
  const drafts: PreparedAlertDraft[] = [];
  const portfolio = new Set(
    (opts?.portfolioSymbols ?? []).map((s) => s.toUpperCase())
  );
  const watchlist = new Set(
    (opts?.watchlistSymbols ?? []).map((s) => s.toUpperCase())
  );

  for (const event of events) {
    const kind = alertKindForEvent(event, today);
    if (kind) {
      drafts.push({
        id: `alert-${event.id}-${kind}`,
        kind,
        title: event.title,
        body: `${event.title} · ${eventCountdown(event.date, today).label}`,
        eventId: event.id,
        symbol: event.ticker,
        importance: event.importance,
        fireAtDate: event.date,
        createdAt: `${today}T00:00:00.000Z`,
      });
    }

    const sym = event.ticker?.toUpperCase();
    if (sym && portfolio.has(sym) && event.date >= today && event.date <= addDays(today, 2)) {
      drafts.push({
        id: `alert-${event.id}-portfolio_risk`,
        kind: "portfolio_risk",
        title: `Portfolio · ${sym}`,
        body: `${event.title} may affect your holding`,
        eventId: event.id,
        symbol: sym,
        importance: event.importance,
        fireAtDate: event.date,
        createdAt: `${today}T00:00:00.000Z`,
      });
    }
    if (sym && watchlist.has(sym) && event.date >= today && event.date <= addDays(today, 2)) {
      drafts.push({
        id: `alert-${event.id}-watchlist_event`,
        kind: "watchlist_event",
        title: `Watchlist · ${sym}`,
        body: `${event.title} catalyst ahead`,
        eventId: event.id,
        symbol: sym,
        importance: event.importance,
        fireAtDate: event.date,
        createdAt: `${today}T00:00:00.000Z`,
      });
    }
  }

  return drafts;
}

export const alertPreparationService = {
  prepare: prepareAlertDrafts,
};
