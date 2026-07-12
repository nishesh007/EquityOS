/**
 * Sprint 8A — Unified Live Market Data model and provider contracts.
 * UI and services consume MarketDataService; they never know which provider is active.
 */

export type DataSource = "live" | "cached" | "mock" | "unavailable";

export type ExchangeCode = "NSE" | "BSE" | "INDEX" | "INTERNAL";

export type SymbolFormat =
  | "internal"
  | "nse"
  | "bse"
  | "yahoo"
  | "alphavantage"
  | "finnhub"
  | "polygon"
  | "twelvedata"
  | "upstox"
  | "zerodha";

export interface NormalizedSymbol {
  /** Canonical internal symbol (e.g. RELIANCE) */
  internal: string;
  exchange: ExchangeCode;
  currency: string;
  companyName?: string;
  /** Provider-specific ticker formats */
  formats: Record<SymbolFormat, string>;
}

/** Full market data model — every company exposes these fields when available. */
export interface MarketData {
  symbol: string;
  companyName: string;
  exchange: ExchangeCode;
  currency: string;

  // Price
  ltp: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;

  // Trading
  volume: number;
  deliveryPercent?: number;
  vwap?: number;

  // 52 Week
  weekHigh52?: number;
  weekLow52?: number;

  // Valuation
  marketCap?: string | number;
  enterpriseValue?: string | number;
  pe?: number;
  pb?: number;
  dividendYield?: number;

  // Quality
  roe?: number;
  roce?: number;
  eps?: number;

  // Risk
  beta?: number;

  // Classification
  sector?: string;
  industry?: string;

  // Metadata
  provider: string;
  lastUpdated: string;
  source: DataSource;
}

export interface MarketDataResult {
  data: MarketData;
  provider: string;
  source: DataSource;
  attempted: string[];
}

/** Provider contract — future providers plug in without UI changes. */
export interface IMarketDataProvider {
  readonly name: string;
  isAvailable(): boolean;
  getQuote(symbol: string): Promise<MarketData>;
  getMarketData(symbol: string): Promise<MarketData>;
  normalizeSymbol(symbol: string): NormalizedSymbol;
}

export const INDEX_SYMBOLS = {
  NIFTY: "NIFTY",
  SENSEX: "SENSEX",
  BANKNIFTY: "BANKNIFTY",
  INDIAVIX: "INDIAVIX",
} as const;

export type IndexSymbol = (typeof INDEX_SYMBOLS)[keyof typeof INDEX_SYMBOLS];
