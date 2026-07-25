/**
 * Earnings Intelligence models (Sprint 10D.2).
 * Strong typing for preview estimates and historical performance.
 */

import type {
  EventExchange,
  EventImportance,
  EventIntelligenceEvent,
  EventStatus,
  MarketCapBucket,
} from "@/types/event";

export type EarningsQuarter =
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | "FY";

export type BeatMissResult = "beat" | "miss" | "inline";

export interface EarningsEstimates {
  expectedRevenueCr: number | null;
  expectedEps: number | null;
  expectedYoyGrowthPct: number | null;
  expectedQoqGrowthPct: number | null;
  previousRevenueCr: number | null;
  previousEps: number | null;
  previousQuarterLabel: string | null;
  previousYearSameQuarterLabel: string | null;
  historicalSurprisePct: number | null;
  managementGuidance: string | null;
  consensusRating: string | null;
}

export interface QuarterlyHistoryPoint {
  label: string;
  quarter: EarningsQuarter;
  financialYear: string;
  revenueCr: number;
  eps: number;
  surprisePct: number | null;
  result: BeatMissResult;
  resultDate: string;
}

export interface PostResultMove {
  day1Pct: number | null;
  day3Pct: number | null;
  day5Pct: number | null;
  day10Pct: number | null;
  averageVolatilityPct: number | null;
}

export interface EarningsHistoricalPerformance {
  quarters: QuarterlyHistoryPoint[];
  averageSurprisePct: number | null;
  beatCount: number;
  missCount: number;
  inlineCount: number;
  postResultMove: PostResultMove;
}

export interface EarningsDetail {
  quarter: EarningsQuarter;
  financialYear: string;
  announcementDate: string;
  announcementTime: string | null;
  estimates: EarningsEstimates;
  historical: EarningsHistoricalPerformance;
  conferenceCallId: string | null;
}

export interface ConferenceCallDetail {
  hostCompany: string;
  hostTicker: string;
  dialIn: string | null;
  webcastUrl: string | null;
  relatedEarningsId: string | null;
  topics: string[];
}

/** Narrow earnings calendar event shape for Module 1 display. */
export interface EarningsEvent extends EventIntelligenceEvent {
  eventType: "quarterly_results" | "annual_results";
  company: string;
  ticker: string;
  sector: string;
  marketCap: Exclude<MarketCapBucket, "unknown">;
  exchange: Extract<EventExchange, "NSE" | "BSE">;
  status: EventStatus;
  importance: EventImportance;
  earningsDetail: EarningsDetail;
}

export interface ConferenceCallEvent extends EventIntelligenceEvent {
  eventType: "conference_call";
  conferenceCallDetail: ConferenceCallDetail;
}
