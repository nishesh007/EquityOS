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
  | "Strong Bullish"
  | "Bullish"
  | "Neutral"
  | "Bearish"
  | "Strong Bearish"
  | "Insufficient Data";

export interface BreadthTrendPoint {
  date: string;
  breadthPercent: number;
  netAdvances: number;
}

/** Full institutional breadth snapshot. */
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
  participationPercent: number;
  newHighs52w: number;
  newLows52w: number;
  aboveEma20: number | null;
  aboveEma50: number | null;
  aboveEma200: number | null;
  averageRsi: number | null;
  averageDailyReturn: number | null;
  sectorBreadth: SectorPerformance[];
  breadthTrend5d: BreadthTrendPoint[];
  breadthTrend20d: BreadthTrendPoint[];
  technicalCoveragePercent: number;
  quoteCoveragePercent: number;
  lastUpdated: string;
  dataSource: string;
  gainers: MarketMover[];
  losers: MarketMover[];
  weekHighs: MarketMover[];
  weekLows: MarketMover[];
  mostActive: MarketMover[];
}
