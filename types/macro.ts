/**
 * Macro Economic Intelligence models (Sprint 10D.3).
 * Strong typing for indicators, sector/market impact and historical reactions.
 */

import type {
  EventImportance,
  EventIntelligenceEvent,
  EventStatus,
  EventType,
  MarketDirection,
} from "@/types/event";

export type MacroTheme =
  | "central_bank"
  | "inflation"
  | "growth"
  | "employment"
  | "trade"
  | "liquidity"
  | "other";

export type MacroRegion =
  | "india"
  | "us"
  | "global"
  | "eurozone"
  | "japan";

export type MacroFrequency =
  | "monthly"
  | "quarterly"
  | "annual"
  | "adhoc";

export type VolatilityLevel = "low" | "medium" | "high";

export interface EconomicIndicator {
  actual: number | null;
  forecast: number | null;
  consensus: number | null;
  previous: number | null;
  revision: number | null;
  unit: string;
  historicalAverage: number | null;
  historicalHigh: number | null;
  historicalLow: number | null;
  dataSource: string;
}

export interface HistoricalReading {
  label: string;
  date: string;
  actual: number;
  forecast: number | null;
}

export interface SectorImpact {
  positive: string[];
  negative: string[];
  sensitivityNote: string | null;
}

export interface MarketImpact {
  direction: MarketDirection;
  volatility: VolatilityLevel;
  affectedIndices: Array<
    "NIFTY" | "BANKNIFTY" | "FINNIFTY" | "MIDCAP" | "SMALLCAP"
  >;
  narrative: string;
}

export interface MacroReactionPoint {
  label: string;
  date: string;
  niftyMovePct: number | null;
  bankNiftyMovePct: number | null;
  inrMovePct: number | null;
  bondYieldMoveBps: number | null;
}

export interface MacroHistoricalReaction {
  seriesLabel: string;
  meetings: MacroReactionPoint[];
  averages: {
    niftyMovePct: number | null;
    bankNiftyMovePct: number | null;
    inrMovePct: number | null;
    bondYieldMoveBps: number | null;
  };
}

/** Placeholder contracts for future AI interpretation (no generation yet). */
export interface MacroAiPlaceholder {
  summary: string;
  bullCase: string;
  bearCase: string;
  baseCase: string;
  keyRisks: string[];
  marketExpectations: string;
}

export interface MacroDetail {
  country: string;
  authority: string;
  theme: MacroTheme;
  region: MacroRegion;
  frequency: MacroFrequency;
  indicator: EconomicIndicator;
  historicalReadings: HistoricalReading[];
  sectorImpact: SectorImpact;
  marketImpact: MarketImpact;
  historicalReaction: MacroHistoricalReaction | null;
  aiPlaceholder: MacroAiPlaceholder;
}

export interface CentralBankEvent extends EventIntelligenceEvent {
  eventType: Extract<
    EventType,
    | "rbi_policy"
    | "rbi_minutes"
    | "rbi_governor_speech"
    | "fed_meeting"
    | "fomc_minutes"
    | "ecb_policy"
    | "boj_policy"
  >;
  macroDetail: MacroDetail;
}

export interface MacroEvent extends EventIntelligenceEvent {
  status: EventStatus;
  importance: EventImportance;
  macroDetail: MacroDetail;
}

export const MACRO_THEME_LABELS: Readonly<Record<MacroTheme, string>> =
  Object.freeze({
    central_bank: "Central Banks",
    inflation: "Inflation",
    growth: "Growth",
    employment: "Employment",
    trade: "Trade",
    liquidity: "Liquidity",
    other: "Others",
  });

export const MACRO_REGION_LABELS: Readonly<Record<MacroRegion, string>> =
  Object.freeze({
    india: "India",
    us: "US",
    global: "Global",
    eurozone: "Eurozone",
    japan: "Japan",
  });
