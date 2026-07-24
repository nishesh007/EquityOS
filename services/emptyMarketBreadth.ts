/**
 * Empty MarketBreadth placeholder — no I/O, safe for dashboard context peeks.
 * Kept separate from researchDashboardData so SSR slots never pull heatmap disk/fs.
 */

import type { MarketBreadth } from "@/types";

export const emptyMarketBreadth: MarketBreadth = {
  advances: 0,
  declines: 0,
  unchanged: 0,
  newHighs: 0,
  newLows: 0,
  sectors: [],
  gainers: [],
  losers: [],
  weekHighs: [],
  weekLows: [],
  mostActive: [],
  universe: "nse",
  universeLabel: "Entire NSE",
  totalStocks: 0,
  marketMood: "Insufficient Data",
  moodGauge: 50,
  highLowRatio: 0,
  marketStatusLabel: "—",
};
