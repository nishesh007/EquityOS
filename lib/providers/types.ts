/**
 * Unified market data provider contracts.
 * All live data flows through providers — never from React components.
 */

import type { ChartTimeframe, PricePoint } from "@/types";

export type ProviderTier = "primary" | "secondary" | "mock";

export type DataSource = "live" | "cached" | "mock" | "unavailable";

export interface LiveQuote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  deliveryPercent?: number;
  vwap?: number;
  marketCap?: string;
  sector?: string;
  industry?: string;
  provider: string;
  source: DataSource;
  fetchedAt: string;
}

export interface OhlcBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  isAvailable(): boolean;
  fetchQuote(symbol: string): Promise<LiveQuote>;
  fetchIndex(indexSymbol: string): Promise<LiveQuote>;
  fetchOhlc(symbol: string, timeframe: ChartTimeframe): Promise<PricePoint[]>;
}

export interface ProviderResult<T> {
  data: T;
  provider: string;
  source: DataSource;
}

export const INDEX_SYMBOLS = {
  NIFTY: "NIFTY",
  SENSEX: "SENSEX",
  BANKNIFTY: "BANKNIFTY",
  INDIAVIX: "INDIAVIX",
} as const;

export type IndexSymbol = (typeof INDEX_SYMBOLS)[keyof typeof INDEX_SYMBOLS];
