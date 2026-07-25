/**
 * Event Intelligence Platform — domain contracts (Sprint 10D.1 / 10D.2).
 * Foundation model for corporate actions, earnings, macro and catalysts.
 * Earnings & corporate action payloads added in 10D.2.
 */

import type { ConferenceCallDetail, EarningsDetail } from "@/types/earnings";
import type { CorporateActionDetails } from "@/types/corporateActions";
import type { MacroDetail, MacroRegion, MacroTheme } from "@/types/macro";

export type EventType =
  | "quarterly_results"
  | "annual_results"
  | "conference_call"
  | "dividend"
  | "bonus"
  | "stock_split"
  | "rights_issue"
  | "buyback"
  | "agm"
  | "egm"
  | "ipo"
  | "listing"
  | "delisting"
  | "merger"
  | "demerger"
  | "open_offer"
  | "rbi_policy"
  | "rbi_minutes"
  | "rbi_governor_speech"
  | "fed_meeting"
  | "fomc_minutes"
  | "ecb_policy"
  | "boj_policy"
  | "gdp"
  | "quarterly_gdp"
  | "cpi"
  | "core_cpi"
  | "wpi"
  | "ppi"
  | "pmi"
  | "pmi_services"
  | "iip"
  | "nfp"
  | "unemployment_rate"
  | "trade_balance"
  | "current_account"
  | "forex_reserves"
  | "repo_rate"
  | "reverse_repo"
  | "crr"
  | "slr"
  | "fiscal_budget"
  | "gst_collection"
  | "government_borrowing"
  | "oil_inventory"
  | "crude_prices"
  | "msci_review"
  | "ftse_review"
  | "generic_economic";

/** Visual / filter category grouping for event types. */
export type EventCategory =
  | "results"
  | "corporate_actions"
  | "economic"
  | "central_bank"
  | "ipo"
  | "critical"
  | "neutral";

export type EventStatus =
  | "upcoming"
  | "today"
  | "tomorrow"
  | "live"
  | "completed"
  | "cancelled";

export type EventImportance = "critical" | "high" | "medium" | "low";

export type MarketDirection =
  | "bullish"
  | "bearish"
  | "neutral"
  | "mixed"
  | "unknown";

export type MarketCapBucket =
  | "mega"
  | "large"
  | "mid"
  | "small"
  | "micro"
  | "unknown";

export type EventExchange = "NSE" | "BSE" | "NYSE" | "NASDAQ" | "MACRO";

/** Calendar / workspace view modes. */
export type EventViewMode =
  | "day"
  | "week"
  | "month"
  | "timeline"
  | "agenda";

export type EventQuickRange =
  | "upcoming"
  | "completed"
  | "today"
  | "this_week"
  | "this_month"
  | "upcoming_earnings"
  | "completed_earnings"
  | "conference_calls"
  | "high_dividend"
  | "central_banks"
  | "inflation"
  | "growth"
  | "employment"
  | "trade"
  | "liquidity"
  | "india"
  | "us"
  | "global"
  | "critical_macro"
  | "todays_releases";

export interface EventIntelligenceEvent {
  id: string;
  title: string;
  company: string | null;
  ticker: string | null;
  sector: string | null;
  industry: string | null;
  exchange: EventExchange;
  eventType: EventType;
  /** ISO date YYYY-MM-DD (local calendar day). */
  date: string;
  /** HH:mm 24h, or null when all-day / TBA. */
  time: string | null;
  timezone: string;
  status: EventStatus;
  importance: EventImportance;
  description: string;
  expectedImpact: string | null;
  marketDirection: MarketDirection;
  affectedStocks: string[];
  affectedSectors: string[];
  historicalAvailable: boolean;
  tags: string[];
  marketCap: MarketCapBucket;
  createdAt: string;
  updatedAt: string;

  /* ── Sprint 10D.2 enrichment (optional by event kind) ── */
  earningsDetail?: EarningsDetail | null;
  conferenceCallDetail?: ConferenceCallDetail | null;
  corporateActionDetail?: CorporateActionDetails | null;

  /* ── Sprint 10D.3 macro enrichment ── */
  macroDetail?: MacroDetail | null;

  /* ── Reserved for later sub-sprints ── */
  aiSummary?: string | null;
  confidence?: number | null;
  historicalAnalysis?: string | null;
  preparationChecklist?: string[] | null;
  impactScore?: number | null;
}

export interface EventDateRange {
  from: string | null;
  to: string | null;
}

export interface EventFilterState {
  dateRange: EventDateRange;
  eventTypes: EventType[];
  sectors: string[];
  industries: string[];
  marketCaps: MarketCapBucket[];
  importance: EventImportance[];
  exchanges: EventExchange[];
  quickRanges: EventQuickRange[];
  company: string;
  ticker: string;
  /** Free-text search scoped inside the filter panel. */
  filterSearch: string;
  /** Financial quarter labels e.g. Q1, Q2. */
  quarters: string[];
  highDividendOnly: boolean;
  macroThemes: MacroTheme[];
  macroRegions: MacroRegion[];
}

export interface EventSearchState {
  query: string;
  debouncedQuery: string;
}

export interface EventIntelligencePageState {
  view: EventViewMode;
  selectedDate: string;
  filtersOpen: boolean;
  filters: EventFilterState;
  search: EventSearchState;
  isLoading: boolean;
  error: string | null;
}
