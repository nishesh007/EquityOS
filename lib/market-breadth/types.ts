/**
 * Market Breadth — types (presentation + engine contract).
 * Calculations are pure; data loading lives in the engine.
 */

import type { MarketMover, SectorPerformance } from "@/types";

export type BreadthUniverseId =
  | "nse"
  | "nifty500"
  | "nifty200"
  | "nifty100"
  | "nifty50"
  | "portfolio"
  | "watchlist";

export const BREADTH_UNIVERSE_OPTIONS: readonly {
  id: BreadthUniverseId;
  label: string;
}[] = [
  { id: "nse", label: "Entire NSE" },
  { id: "nifty500", label: "Nifty 500" },
  { id: "nifty200", label: "Nifty 200" },
  { id: "nifty100", label: "Nifty 100" },
  { id: "nifty50", label: "Nifty 50" },
  { id: "portfolio", label: "Portfolio" },
  { id: "watchlist", label: "Watchlist" },
] as const;

export type MarketMood =
  | "Extremely Bullish"
  | "Bullish"
  | "Neutral"
  | "Bearish"
  | "Extremely Bearish"
  | "Insufficient Data";

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface BreadthTrendPoint {
  date: string;
  breadthPercent: number;
  netAdvances: number;
}

export interface ParticipationTrendPoint {
  date: string;
  aboveEma20Pct: number | null;
  aboveEma50Pct: number | null;
  aboveEma200Pct: number | null;
}

export interface SectorBreadthRow extends SectorPerformance {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
}

/** Full institutional breadth / market internals snapshot. */
export interface MarketBreadthSnapshot {
  universe: BreadthUniverseId;
  universeLabel: string;
  totalStocks: number;
  quotedStocks: number;
  advances: number;
  declines: number;
  unchanged: number;
  advanceDeclineRatio: number;
  breadthPercent: number;
  netAdvances: number;
  marketMood: MarketMood;
  moodGauge: number;
  moodFactors: { id: string; score: number; label: string }[];
  participationPercent: number;
  highLowRatio: number;
  newHighs52w: number;
  newLows52w: number;
  aboveEma20: number | null;
  aboveEma50: number | null;
  aboveEma200: number | null;
  aboveEma20Pct: number | null;
  aboveEma50Pct: number | null;
  aboveEma200Pct: number | null;
  aboveEma20Trend: TrendDirection;
  aboveEma50Trend: TrendDirection;
  aboveEma200Trend: TrendDirection;
  technicalSampleSize: number;
  averageRsi: number | null;
  averageDailyReturn: number | null;
  sectorBreadth: SectorBreadthRow[];
  strongestSector: string | null;
  weakestSector: string | null;
  breadthTrend5d: BreadthTrendPoint[];
  breadthTrend20d: BreadthTrendPoint[];
  technicalCoveragePercent: number;
  quoteCoveragePercent: number;
  marketStatus: string;
  marketStatusLabel: string;
  lastUpdated: string;
  dataSource: string;
  gainers: MarketMover[];
  losers: MarketMover[];
  weekHighs: MarketMover[];
  weekLows: MarketMover[];
  mostActive: MarketMover[];
}
