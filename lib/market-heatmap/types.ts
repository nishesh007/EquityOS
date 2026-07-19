/**
 * Sector & Market Heatmap — types.
 */

import type { BreadthUniverseId } from "@/lib/market-breadth/types";

export type HeatmapUniverseId =
  | "nse"
  | "nifty500"
  | "nifty200"
  | "nifty100"
  | "nifty50";

export const HEATMAP_UNIVERSE_OPTIONS: readonly {
  id: HeatmapUniverseId;
  label: string;
}[] = [
  { id: "nse", label: "Entire NSE" },
  { id: "nifty500", label: "Nifty 500" },
  { id: "nifty200", label: "Nifty 200" },
  { id: "nifty100", label: "Nifty 100" },
  { id: "nifty50", label: "Nifty 50" },
] as const;

export type HeatmapColorMetric =
  | "dailyChange"
  | "weeklyChange"
  | "monthlyChange"
  | "breadth"
  | "relativeStrength"
  | "volume"
  | "delivery"
  | "marketCap";

export const HEATMAP_COLOR_METRICS: readonly {
  id: HeatmapColorMetric;
  label: string;
}[] = [
  { id: "dailyChange", label: "Daily Change" },
  { id: "weeklyChange", label: "Weekly Change" },
  { id: "monthlyChange", label: "Monthly Change" },
  { id: "breadth", label: "Breadth" },
  { id: "relativeStrength", label: "Relative Strength" },
  { id: "volume", label: "Volume" },
  { id: "delivery", label: "Delivery" },
  { id: "marketCap", label: "Market Cap" },
] as const;

export type MoneyFlowBias = "inflow" | "outflow" | "neutral";

export type PerformanceBand =
  | "strongGain"
  | "moderateGain"
  | "neutral"
  | "moderateLoss"
  | "strongLoss";

export interface HeatmapStockCell {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  weeklyChangePercent: number | null;
  monthlyChangePercent: number | null;
  volume: number | null;
  deliveryPercent: number | null;
  marketCapCr: number | null;
  rsi: number | null;
  relativeStrength: number;
  sectorRank: number;
  momentumScore: number;
}

export interface HeatmapSectorTile {
  name: string;
  dailyChangePercent: number;
  weeklyChangePercent: number | null;
  monthlyChangePercent: number | null;
  breadthPercent: number;
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  averageVolume: number | null;
  averageDeliveryPercent: number | null;
  marketCapCr: number | null;
  relativeStrength: number;
  relativeStrengthRank: number;
  relativeWeaknessRank: number;
  momentumScore: number;
  volumeExpansion: number | null;
  deliveryExpansion: number | null;
  moneyFlow: MoneyFlowBias;
  stocks: HeatmapStockCell[];
}

export interface MarketHeatmapSnapshot {
  universe: HeatmapUniverseId;
  universeLabel: string;
  totalStocks: number;
  quotedStocks: number;
  sectorCount: number;
  marketAvgChangePercent: number;
  sectors: HeatmapSectorTile[];
  moneyInflowSectors: string[];
  moneyOutflowSectors: string[];
  lastUpdated: string;
  dataSource: string;
  quoteCoveragePercent: number;
  periodCoveragePercent: number;
}

export function toBreadthUniverseId(
  id: HeatmapUniverseId
): BreadthUniverseId {
  return id;
}
