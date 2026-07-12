import type {
  AIMarketSummary,
  MarketBreadth,
  MarketIndex,
  MarketNews,
  MarketPulse,
  UpcomingResult,
} from "@/types";
import type { MarketData, NormalizedSymbol } from "@/lib/market-data";

export interface UnifiedMarketDataService {
  fetchIndices(): Promise<MarketIndex[]>;
  fetchBreadth(): Promise<MarketBreadth>;
  fetchPulse(): Promise<MarketPulse>;
  fetchNews(): Promise<MarketNews[]>;
  fetchUpcomingResults(): Promise<UpcomingResult[]>;
  fetchAIMarketSummary(): Promise<AIMarketSummary>;
  getQuote(symbol: string): ReturnType<typeof import("@/lib/market-data").getQuote>;
  getMarketData(symbol: string): ReturnType<typeof import("@/lib/market-data").getMarketData>;
  normalizeSymbol(symbol: string): NormalizedSymbol;
}

/** @deprecated Use UnifiedMarketDataService — kept for backward compatibility */
export interface MarketDataService {
  fetchIndices(): Promise<MarketIndex[]>;
  fetchBreadth(): Promise<MarketBreadth>;
  fetchPulse(): Promise<MarketPulse>;
  fetchNews(): Promise<MarketNews[]>;
  fetchUpcomingResults(): Promise<UpcomingResult[]>;
  fetchAIMarketSummary(): Promise<AIMarketSummary>;
}

export type { MarketIndex, MarketBreadth, MarketPulse, MarketNews, UpcomingResult, AIMarketSummary };
