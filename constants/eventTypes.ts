/**
 * Event type catalog — labels, categories, icons (Sprint 10D.1).
 * Extend EVENT_TYPE_DEFINITIONS to add new event kinds.
 */

import type { EventCategory, EventType } from "@/types/event";

export interface EventTypeDefinition {
  id: EventType;
  label: string;
  shortLabel: string;
  category: EventCategory;
  description: string;
}

export const EVENT_TYPE_DEFINITIONS: readonly EventTypeDefinition[] =
  Object.freeze([
    {
      id: "quarterly_results",
      label: "Quarterly Results",
      shortLabel: "Q Results",
      category: "results",
      description: "Quarterly financial results announcement",
    },
    {
      id: "annual_results",
      label: "Annual Results",
      shortLabel: "Annual",
      category: "results",
      description: "Full-year financial results",
    },
    {
      id: "conference_call",
      label: "Conference Call",
      shortLabel: "Call",
      category: "results",
      description: "Earnings or management conference call",
    },
    {
      id: "dividend",
      label: "Dividend",
      shortLabel: "Div",
      category: "corporate_actions",
      description: "Dividend declaration or record date",
    },
    {
      id: "bonus",
      label: "Bonus",
      shortLabel: "Bonus",
      category: "corporate_actions",
      description: "Bonus share issue",
    },
    {
      id: "stock_split",
      label: "Stock Split",
      shortLabel: "Split",
      category: "corporate_actions",
      description: "Equity stock split",
    },
    {
      id: "rights_issue",
      label: "Rights Issue",
      shortLabel: "Rights",
      category: "corporate_actions",
      description: "Rights offering to existing shareholders",
    },
    {
      id: "buyback",
      label: "Buyback",
      shortLabel: "Buyback",
      category: "corporate_actions",
      description: "Share repurchase programme",
    },
    {
      id: "agm",
      label: "AGM",
      shortLabel: "AGM",
      category: "corporate_actions",
      description: "Annual General Meeting",
    },
    {
      id: "egm",
      label: "EGM",
      shortLabel: "EGM",
      category: "corporate_actions",
      description: "Extraordinary General Meeting",
    },
    {
      id: "ipo",
      label: "IPO",
      shortLabel: "IPO",
      category: "ipo",
      description: "Initial public offering",
    },
    {
      id: "listing",
      label: "Listing",
      shortLabel: "Listing",
      category: "ipo",
      description: "Exchange listing date",
    },
    {
      id: "delisting",
      label: "Delisting",
      shortLabel: "Delist",
      category: "critical",
      description: "Exchange delisting",
    },
    {
      id: "rbi_policy",
      label: "RBI Policy",
      shortLabel: "RBI",
      category: "central_bank",
      description: "Reserve Bank of India policy decision",
    },
    {
      id: "fed_meeting",
      label: "Fed Meeting",
      shortLabel: "Fed",
      category: "central_bank",
      description: "US Federal Reserve FOMC meeting",
    },
    {
      id: "gdp",
      label: "GDP",
      shortLabel: "GDP",
      category: "economic",
      description: "Gross domestic product release",
    },
    {
      id: "cpi",
      label: "CPI",
      shortLabel: "CPI",
      category: "economic",
      description: "Consumer price inflation",
    },
    {
      id: "wpi",
      label: "WPI",
      shortLabel: "WPI",
      category: "economic",
      description: "Wholesale price inflation",
    },
    {
      id: "pmi",
      label: "PMI",
      shortLabel: "PMI",
      category: "economic",
      description: "Purchasing Managers' Index",
    },
    {
      id: "iip",
      label: "IIP",
      shortLabel: "IIP",
      category: "economic",
      description: "Index of Industrial Production",
    },
    {
      id: "trade_balance",
      label: "Trade Balance",
      shortLabel: "Trade",
      category: "economic",
      description: "Merchandise trade balance",
    },
    {
      id: "forex_reserves",
      label: "Forex Reserves",
      shortLabel: "FX Res",
      category: "economic",
      description: "Foreign exchange reserves update",
    },
    {
      id: "msci_review",
      label: "MSCI Review",
      shortLabel: "MSCI",
      category: "critical",
      description: "MSCI index rebalancing review",
    },
    {
      id: "ftse_review",
      label: "FTSE Review",
      shortLabel: "FTSE",
      category: "critical",
      description: "FTSE index rebalancing review",
    },
    {
      id: "generic_economic",
      label: "Economic Event",
      shortLabel: "Macro",
      category: "economic",
      description: "Generic macroeconomic event",
    },
  ] as const);

export const EVENT_TYPE_MAP: Readonly<Record<EventType, EventTypeDefinition>> =
  Object.freeze(
    Object.fromEntries(
      EVENT_TYPE_DEFINITIONS.map((def) => [def.id, def])
    ) as Record<EventType, EventTypeDefinition>
  );

export const EVENT_TYPES: readonly EventType[] = Object.freeze(
  EVENT_TYPE_DEFINITIONS.map((d) => d.id)
);

export const EVENT_CATEGORY_LABELS: Readonly<Record<EventCategory, string>> =
  Object.freeze({
    results: "Results",
    corporate_actions: "Corporate Actions",
    economic: "Economic",
    central_bank: "Central Bank",
    ipo: "IPO / Listing",
    critical: "Critical",
    neutral: "Neutral",
  });

export const EVENT_IMPORTANCE_LABELS = Object.freeze({
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const);

export const EVENT_STATUS_LABELS = Object.freeze({
  upcoming: "Upcoming",
  today: "Today",
  completed: "Completed",
  cancelled: "Cancelled",
} as const);

export const EVENT_VIEW_OPTIONS = Object.freeze([
  { id: "day" as const, label: "Day" },
  { id: "week" as const, label: "Week" },
  { id: "month" as const, label: "Month" },
  { id: "timeline" as const, label: "Timeline" },
  { id: "agenda" as const, label: "Agenda" },
]);

export const MARKET_CAP_OPTIONS = Object.freeze([
  { id: "large" as const, label: "Large Cap" },
  { id: "mid" as const, label: "Mid Cap" },
  { id: "small" as const, label: "Small Cap" },
  { id: "micro" as const, label: "Micro Cap" },
]);

export const QUICK_RANGE_OPTIONS = Object.freeze([
  { id: "upcoming" as const, label: "Upcoming" },
  { id: "completed" as const, label: "Completed" },
  { id: "today" as const, label: "Today" },
  { id: "this_week" as const, label: "This Week" },
  { id: "this_month" as const, label: "This Month" },
]);

export const DEFAULT_EVENT_TIMEZONE = "Asia/Kolkata";

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_MAP[type]?.label ?? type;
}

export function getEventCategory(type: EventType): EventCategory {
  return EVENT_TYPE_MAP[type]?.category ?? "neutral";
}
