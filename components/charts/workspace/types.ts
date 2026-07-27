/**
 * Chart workspace — presentation types (local state only).
 */

import type { ChartTimeframe, IntradayInterval, OhlcTimeframe } from "@/types";
import {
  CHART_TIMEFRAMES,
  INTRADAY_INTERVALS,
  isChartTimeframe,
  isIntradayInterval,
} from "@/lib/market/ohlc-timeframes";

export type ChartLayoutId = "single" | "dual" | "quad" | "fullscreen";

export type ChartToolId =
  | "cursor"
  | "crosshair"
  | "trend"
  | "horizontal"
  | "vertical"
  | "rectangle"
  | "fibonacci"
  | "text"
  | "measure"
  | "screenshot";

/** Workspace TF bar — true intraday intervals + full chart timeframes. */
export type WorkspaceTimeframe = IntradayInterval | ChartTimeframe;

export const WORKSPACE_TIMEFRAMES: readonly WorkspaceTimeframe[] = [
  ...INTRADAY_INTERVALS,
  ...CHART_TIMEFRAMES,
] as const;

/** Map workspace TF → canonical OHLC timeframe (1:1 — never remaps). */
export function resolveOhlcTimeframe(tf: WorkspaceTimeframe): OhlcTimeframe {
  return tf;
}

/**
 * @deprecated Prefer resolveOhlcTimeframe + on-demand fetch.
 * Returns a ChartTimeframe only when the workspace TF is itself a chart TF.
 */
export function resolvePriceHistoryKey(
  tf: WorkspaceTimeframe
): ChartTimeframe | null {
  return isChartTimeframe(tf) ? tf : null;
}

export function isIntradayTimeframe(tf: WorkspaceTimeframe): boolean {
  return isIntradayInterval(tf);
}

export function isPreloadedChartTimeframe(
  tf: WorkspaceTimeframe
): tf is ChartTimeframe {
  return isChartTimeframe(tf);
}

export type IndicatorId =
  | "sma20"
  | "sma50"
  | "ema20"
  | "ema50"
  | "vwap"
  | "rsi"
  | "macd"
  | "bollinger"
  | "atr"
  | "supertrend"
  | "adx"
  | "volume";

export interface IndicatorConfig {
  id: IndicatorId;
  label: string;
  enabled: boolean;
  color: string;
  order: number;
}

export const DEFAULT_INDICATORS: readonly IndicatorConfig[] = [
  { id: "sma20", label: "SMA 20", enabled: true, color: "#38bdf8", order: 0 },
  { id: "sma50", label: "SMA 50", enabled: false, color: "#a78bfa", order: 1 },
  { id: "ema20", label: "EMA 20", enabled: true, color: "#fbbf24", order: 2 },
  { id: "ema50", label: "EMA 50", enabled: false, color: "#fb923c", order: 3 },
  { id: "vwap", label: "VWAP", enabled: false, color: "#2dd4bf", order: 4 },
  { id: "rsi", label: "RSI", enabled: false, color: "#e879f9", order: 5 },
  { id: "macd", label: "MACD", enabled: false, color: "#60a5fa", order: 6 },
  {
    id: "bollinger",
    label: "Bollinger Bands",
    enabled: false,
    color: "#94a3b8",
    order: 7,
  },
  { id: "atr", label: "ATR", enabled: false, color: "#f472b6", order: 8 },
  {
    id: "supertrend",
    label: "Supertrend",
    enabled: false,
    color: "#4ade80",
    order: 9,
  },
  { id: "adx", label: "ADX", enabled: false, color: "#c084fc", order: 10 },
  { id: "volume", label: "Volume", enabled: true, color: "#64748b", order: 11 },
] as const;

export type DrawingKind =
  | "trend"
  | "horizontal"
  | "vertical"
  | "rectangle"
  | "fibonacci"
  | "text"
  | "measure";

export interface ChartDrawing {
  id: string;
  kind: DrawingKind;
  /** Normalized 0–1 coordinates within the chart plot. */
  points: { x: number; y: number }[];
  label?: string;
  locked: boolean;
  hidden: boolean;
  color: string;
  createdAt: number;
}

export interface ChartWorkspacePrefs {
  version: 1;
  layout: ChartLayoutId;
  timeframe: WorkspaceTimeframe;
  tool: ChartToolId;
  sidebarCollapsed: boolean;
  compareMode: boolean;
  compareSymbols: string[];
  paneTimeframes: WorkspaceTimeframe[];
}

export const DEFAULT_CHART_PREFS: ChartWorkspacePrefs = {
  version: 1,
  layout: "single",
  timeframe: "1D",
  tool: "crosshair",
  sidebarCollapsed: false,
  compareMode: false,
  compareSymbols: [],
  paneTimeframes: ["1D", "1W", "1M", "1D"],
};

export const CHART_LAYOUTS: readonly {
  id: ChartLayoutId;
  label: string;
  panes: number;
}[] = [
  { id: "single", label: "Single", panes: 1 },
  { id: "dual", label: "Dual", panes: 2 },
  { id: "quad", label: "Quad", panes: 4 },
  { id: "fullscreen", label: "Full Screen", panes: 1 },
] as const;
