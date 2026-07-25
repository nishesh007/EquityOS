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
      id: "merger",
      label: "Merger",
      shortLabel: "Merger",
      category: "corporate_actions",
      description: "Corporate merger transaction",
    },
    {
      id: "demerger",
      label: "Demerger",
      shortLabel: "Demerger",
      category: "corporate_actions",
      description: "Corporate demerger / spin-off",
    },
    {
      id: "open_offer",
      label: "Open Offer",
      shortLabel: "Offer",
      category: "corporate_actions",
      description: "Open offer to public shareholders",
    },
    {
      id: "rbi_policy",
      label: "RBI MPC",
      shortLabel: "RBI",
      category: "central_bank",
      description: "Reserve Bank of India MPC rate decision",
    },
    {
      id: "rbi_minutes",
      label: "RBI Minutes",
      shortLabel: "RBI Min",
      category: "central_bank",
      description: "RBI Monetary Policy Committee minutes",
    },
    {
      id: "rbi_governor_speech",
      label: "RBI Governor Speech",
      shortLabel: "RBI Spch",
      category: "central_bank",
      description: "RBI Governor public speech / remarks",
    },
    {
      id: "fed_meeting",
      label: "Fed Meeting",
      shortLabel: "Fed",
      category: "central_bank",
      description: "US Federal Reserve FOMC meeting",
    },
    {
      id: "fomc_minutes",
      label: "FOMC Minutes",
      shortLabel: "FOMC Min",
      category: "central_bank",
      description: "Federal Open Market Committee minutes",
    },
    {
      id: "ecb_policy",
      label: "ECB Policy",
      shortLabel: "ECB",
      category: "central_bank",
      description: "European Central Bank policy decision",
    },
    {
      id: "boj_policy",
      label: "BOJ Policy",
      shortLabel: "BOJ",
      category: "central_bank",
      description: "Bank of Japan policy decision",
    },
    {
      id: "gdp",
      label: "GDP",
      shortLabel: "GDP",
      category: "economic",
      description: "Gross domestic product release",
    },
    {
      id: "quarterly_gdp",
      label: "Quarterly GDP",
      shortLabel: "Q GDP",
      category: "economic",
      description: "Quarterly GDP advance / provisional estimates",
    },
    {
      id: "cpi",
      label: "CPI",
      shortLabel: "CPI",
      category: "economic",
      description: "Consumer price inflation",
    },
    {
      id: "core_cpi",
      label: "Core CPI",
      shortLabel: "Core CPI",
      category: "economic",
      description: "Core consumer price inflation",
    },
    {
      id: "wpi",
      label: "WPI",
      shortLabel: "WPI",
      category: "economic",
      description: "Wholesale price inflation",
    },
    {
      id: "ppi",
      label: "PPI",
      shortLabel: "PPI",
      category: "economic",
      description: "Producer price inflation",
    },
    {
      id: "pmi",
      label: "PMI Manufacturing",
      shortLabel: "PMI Mfg",
      category: "economic",
      description: "Manufacturing Purchasing Managers' Index",
    },
    {
      id: "pmi_services",
      label: "PMI Services",
      shortLabel: "PMI Svc",
      category: "economic",
      description: "Services Purchasing Managers' Index",
    },
    {
      id: "iip",
      label: "IIP",
      shortLabel: "IIP",
      category: "economic",
      description: "Index of Industrial Production",
    },
    {
      id: "nfp",
      label: "Non-Farm Payrolls",
      shortLabel: "NFP",
      category: "economic",
      description: "US non-farm payrolls employment release",
    },
    {
      id: "unemployment_rate",
      label: "Unemployment Rate",
      shortLabel: "UE Rate",
      category: "economic",
      description: "Unemployment rate release",
    },
    {
      id: "trade_balance",
      label: "Trade Balance",
      shortLabel: "Trade",
      category: "economic",
      description: "Merchandise trade balance",
    },
    {
      id: "current_account",
      label: "Current Account",
      shortLabel: "CAD",
      category: "economic",
      description: "Current account balance",
    },
    {
      id: "forex_reserves",
      label: "Forex Reserves",
      shortLabel: "FX Res",
      category: "economic",
      description: "Foreign exchange reserves update",
    },
    {
      id: "repo_rate",
      label: "Repo Rate",
      shortLabel: "Repo",
      category: "central_bank",
      description: "Policy repo rate announcement",
    },
    {
      id: "reverse_repo",
      label: "Reverse Repo",
      shortLabel: "Rev Repo",
      category: "central_bank",
      description: "Reverse repo rate announcement",
    },
    {
      id: "crr",
      label: "CRR",
      shortLabel: "CRR",
      category: "central_bank",
      description: "Cash Reserve Ratio decision",
    },
    {
      id: "slr",
      label: "SLR",
      shortLabel: "SLR",
      category: "central_bank",
      description: "Statutory Liquidity Ratio decision",
    },
    {
      id: "fiscal_budget",
      label: "Fiscal Budget",
      shortLabel: "Budget",
      category: "economic",
      description: "Union Budget / fiscal presentation",
    },
    {
      id: "gst_collection",
      label: "GST Collection",
      shortLabel: "GST",
      category: "economic",
      description: "Monthly GST collection print",
    },
    {
      id: "government_borrowing",
      label: "Government Borrowing",
      shortLabel: "G-Sec",
      category: "economic",
      description: "Government borrowing calendar / auction",
    },
    {
      id: "oil_inventory",
      label: "Oil Inventory",
      shortLabel: "Oil Inv",
      category: "economic",
      description: "Crude oil inventory report",
    },
    {
      id: "crude_prices",
      label: "Crude Prices",
      shortLabel: "Crude",
      category: "economic",
      description: "Crude oil price catalyst / print",
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
  tomorrow: "Tomorrow",
  live: "Live",
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
  { id: "mega" as const, label: "Mega Cap" },
  { id: "large" as const, label: "Large Cap" },
  { id: "mid" as const, label: "Mid Cap" },
  { id: "small" as const, label: "Small Cap" },
  { id: "micro" as const, label: "Micro Cap" },
]);

export const QUARTER_OPTIONS = Object.freeze([
  { id: "Q1" as const, label: "Q1" },
  { id: "Q2" as const, label: "Q2" },
  { id: "Q3" as const, label: "Q3" },
  { id: "Q4" as const, label: "Q4" },
]);

export const QUICK_RANGE_OPTIONS = Object.freeze([
  { id: "upcoming" as const, label: "Upcoming" },
  { id: "completed" as const, label: "Completed" },
  { id: "today" as const, label: "Today" },
  { id: "this_week" as const, label: "This Week" },
  { id: "this_month" as const, label: "This Month" },
  { id: "upcoming_earnings" as const, label: "Upcoming Earnings" },
  { id: "completed_earnings" as const, label: "Completed Earnings" },
  { id: "conference_calls" as const, label: "Conference Calls" },
  { id: "high_dividend" as const, label: "High Dividend" },
  { id: "central_banks" as const, label: "Central Banks" },
  { id: "inflation" as const, label: "Inflation" },
  { id: "growth" as const, label: "Growth" },
  { id: "employment" as const, label: "Employment" },
  { id: "trade" as const, label: "Trade" },
  { id: "liquidity" as const, label: "Liquidity" },
  { id: "india" as const, label: "India" },
  { id: "us" as const, label: "US" },
  { id: "global" as const, label: "Global" },
  { id: "critical_macro" as const, label: "Critical" },
  { id: "todays_releases" as const, label: "Today's Releases" },
]);

export const MACRO_THEME_OPTIONS = Object.freeze([
  { id: "central_bank" as const, label: "Central Banks" },
  { id: "inflation" as const, label: "Inflation" },
  { id: "growth" as const, label: "Growth" },
  { id: "employment" as const, label: "Employment" },
  { id: "trade" as const, label: "Trade" },
  { id: "liquidity" as const, label: "Liquidity" },
  { id: "other" as const, label: "Others" },
]);

export const MACRO_REGION_OPTIONS = Object.freeze([
  { id: "india" as const, label: "India" },
  { id: "us" as const, label: "US" },
  { id: "global" as const, label: "Global" },
  { id: "eurozone" as const, label: "Eurozone" },
  { id: "japan" as const, label: "Japan" },
]);

export const INTELLIGENCE_TYPE_CHIPS = Object.freeze([
  { id: "dividend" as const, label: "Dividend" },
  { id: "bonus" as const, label: "Bonus" },
  { id: "stock_split" as const, label: "Split" },
  { id: "buyback" as const, label: "Buyback" },
  { id: "rights_issue" as const, label: "Rights" },
]);

export const DEFAULT_EVENT_TIMEZONE = "Asia/Kolkata";

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_MAP[type]?.label ?? type;
}

export function getEventCategory(type: EventType): EventCategory {
  return EVENT_TYPE_MAP[type]?.category ?? "neutral";
}
