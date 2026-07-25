/**
 * Event Intelligence platform integration contracts (Sprint 10D.5).
 * Linking / awareness / alerts — no scoring or repository changes.
 */

import type { EventImportance, EventIntelligenceEvent } from "@/types/event";

export type EventAwarenessKind =
  | "results_tomorrow"
  | "results_today"
  | "dividend_today"
  | "dividend_upcoming"
  | "bonus"
  | "split"
  | "buyback"
  | "high_impact"
  | "critical"
  | "macro"
  | "corporate_action"
  | "portfolio_risk"
  | "watchlist"
  | "central_bank"
  | "agm";

export interface EventCountdown {
  days: number;
  label: string;
}

export interface LinkedSymbolEvent {
  event: EventIntelligenceEvent;
  symbol: string;
  matchReason: "ticker" | "affected_stock" | "sector";
  countdown: EventCountdown;
  awareness: EventAwarenessKind[];
  impactScore: number | null;
  riskLabel: "opportunity" | "risk" | "neutral";
}

export interface PortfolioEventInsight {
  symbol: string;
  name: string;
  matches: LinkedSymbolEvent[];
  primary: LinkedSymbolEvent | null;
  risks: LinkedSymbolEvent[];
  opportunities: LinkedSymbolEvent[];
}

export interface WatchlistEventInsight {
  symbol: string;
  matches: LinkedSymbolEvent[];
  primary: LinkedSymbolEvent | null;
  badgeKind: EventAwarenessKind | null;
}

export interface RecommendationEventWarning {
  symbol: string;
  primary: LinkedSymbolEvent | null;
  label: string | null;
  impactScore: number | null;
}

export interface DashboardEventBuckets {
  asOf: string;
  criticalUpcoming: EventIntelligenceEvent[];
  todaysEarnings: EventIntelligenceEvent[];
  todaysCorporateActions: EventIntelligenceEvent[];
  todaysMacro: EventIntelligenceEvent[];
}

export type PreparedAlertKind =
  | "earnings_tomorrow"
  | "dividend_tomorrow"
  | "bonus"
  | "split"
  | "buyback"
  | "rbi_tomorrow"
  | "fed_tonight"
  | "critical_macro"
  | "portfolio_risk"
  | "watchlist_event";

/** Alert draft only — no delivery channels in 10D.5. */
export interface PreparedAlertDraft {
  id: string;
  kind: PreparedAlertKind;
  title: string;
  body: string;
  eventId: string;
  symbol: string | null;
  importance: EventImportance;
  fireAtDate: string;
  createdAt: string;
}

export interface SavedEventRecord {
  eventId: string;
  savedAt: string;
}
