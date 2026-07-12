/**
 * Static seed data for mock provider fallback.
 * Keeps UI functional when no API keys are configured.
 */

import type { ChartTimeframe, MarketIndex, PricePoint } from "@/types";
import { getNseSymbolMeta } from "@/lib/fundamentals/nse-registry";
import { isValidNseSymbol, normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import { createRng, hashSeed } from "@/lib/random";

export interface MockQuoteSeed {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  deliveryPercent: number;
  vwap: number;
  marketCap: string;
  sector: string;
  industry: string;
}

export const MOCK_INDEX_QUOTES: Record<string, MockQuoteSeed> = {
  NIFTY: {
    symbol: "NIFTY",
    ltp: 24856.65,
    open: 24720,
    high: 24912.3,
    low: 24680.15,
    previousClose: 24669.2,
    change: 187.45,
    changePercent: 0.76,
    volume: 0,
    deliveryPercent: 0,
    vwap: 24820,
    marketCap: "—",
    sector: "Index",
    industry: "Index",
  },
  SENSEX: {
    symbol: "SENSEX",
    ltp: 81742.1,
    open: 81400,
    high: 81950.4,
    low: 81280.6,
    previousClose: 81129.25,
    change: 612.85,
    changePercent: 0.76,
    volume: 0,
    deliveryPercent: 0,
    vwap: 81600,
    marketCap: "—",
    sector: "Index",
    industry: "Index",
  },
  BANKNIFTY: {
    symbol: "BANKNIFTY",
    ltp: 52840.25,
    open: 53050,
    high: 53120.8,
    low: 52680.4,
    previousClose: 52982.85,
    change: -142.6,
    changePercent: -0.27,
    volume: 0,
    deliveryPercent: 0,
    vwap: 52900,
    marketCap: "—",
    sector: "Index",
    industry: "Index",
  },
  INDIAVIX: {
    symbol: "INDIAVIX",
    ltp: 13.42,
    open: 14.1,
    high: 14.25,
    low: 13.18,
    previousClose: 14.1,
    change: -0.68,
    changePercent: -4.82,
    volume: 0,
    deliveryPercent: 0,
    vwap: 13.5,
    marketCap: "—",
    sector: "Index",
    industry: "Volatility",
  },
};

export const MOCK_STOCK_QUOTES: Record<string, MockQuoteSeed> = {
  RELIANCE: {
    symbol: "RELIANCE",
    ltp: 2890.5,
    open: 2865,
    high: 2910,
    low: 2855,
    previousClose: 2855.1,
    change: 35.4,
    changePercent: 1.24,
    volume: 5200000,
    deliveryPercent: 58.2,
    vwap: 2882.4,
    marketCap: "₹19.5L Cr",
    sector: "Conglomerate",
    industry: "Oil & Gas / Retail / Telecom",
  },
  TCS: {
    symbol: "TCS",
    ltp: 4125.8,
    open: 4100,
    high: 4140,
    low: 4090,
    previousClose: 4091,
    change: 34.8,
    changePercent: 0.85,
    volume: 2100000,
    deliveryPercent: 62.1,
    vwap: 4118.2,
    marketCap: "₹15.0L Cr",
    sector: "IT",
    industry: "IT Services & Consulting",
  },
  HDFCBANK: {
    symbol: "HDFCBANK",
    ltp: 1724.3,
    open: 1732,
    high: 1738,
    low: 1718,
    previousClose: 1731.58,
    change: -7.28,
    changePercent: -0.42,
    volume: 8100000,
    deliveryPercent: 48.5,
    vwap: 1726.8,
    marketCap: "₹13.2L Cr",
    sector: "Banking",
    industry: "Private Sector Bank",
  },
  INFY: {
    symbol: "INFY",
    ltp: 1892.15,
    open: 1868,
    high: 1900,
    low: 1865,
    previousClose: 1863.1,
    change: 29.05,
    changePercent: 1.56,
    volume: 6500000,
    deliveryPercent: 55.8,
    vwap: 1885.6,
    marketCap: "₹7.8L Cr",
    sector: "IT",
    industry: "IT Services & Consulting",
  },
  ICICIBANK: {
    symbol: "ICICIBANK",
    ltp: 1285.4,
    open: 1282,
    high: 1292,
    low: 1278,
    previousClose: 1281.3,
    change: 4.1,
    changePercent: 0.32,
    volume: 7200000,
    deliveryPercent: 51.2,
    vwap: 1284.1,
    marketCap: "₹9.1L Cr",
    sector: "Banking",
    industry: "Private Sector Bank",
  },
  BHARTIARTL: {
    symbol: "BHARTIARTL",
    ltp: 1685.4,
    open: 1668,
    high: 1692,
    low: 1665,
    previousClose: 1660.8,
    change: 24.6,
    changePercent: 1.48,
    volume: 4200000,
    deliveryPercent: 44.6,
    vwap: 1678.9,
    marketCap: "₹9.8L Cr",
    sector: "Telecom",
    industry: "Telecommunications",
  },
  SBIN: {
    symbol: "SBIN",
    ltp: 812.35,
    open: 818,
    high: 820,
    low: 808,
    previousClose: 817.55,
    change: -5.2,
    changePercent: -0.64,
    volume: 8100000,
    deliveryPercent: 42.8,
    vwap: 814.2,
    marketCap: "₹7.3L Cr",
    sector: "Banking",
    industry: "Public Sector Bank",
  },
  LT: {
    symbol: "LT",
    ltp: 3642.8,
    open: 3608,
    high: 3658,
    low: 3600,
    previousClose: 3594.5,
    change: 48.3,
    changePercent: 1.34,
    volume: 1800000,
    deliveryPercent: 56.4,
    vwap: 3635.2,
    marketCap: "₹5.0L Cr",
    sector: "Infrastructure",
    industry: "Engineering & Construction",
  },
  WIPRO: {
    symbol: "WIPRO",
    ltp: 285.6,
    open: 288,
    high: 289,
    low: 284,
    previousClose: 287.75,
    change: -2.15,
    changePercent: -0.75,
    volume: 6500000,
    deliveryPercent: 38.2,
    vwap: 286.4,
    marketCap: "₹1.5L Cr",
    sector: "IT",
    industry: "IT Services & Consulting",
  },
  ADANIENT: {
    symbol: "ADANIENT",
    ltp: 2845.2,
    open: 2798,
    high: 2860,
    low: 2790,
    previousClose: 2782.8,
    change: 62.4,
    changePercent: 2.24,
    volume: 2300000,
    deliveryPercent: 41.5,
    vwap: 2838.6,
    marketCap: "₹3.2L Cr",
    sector: "Conglomerate",
    industry: "Diversified",
  },
  MARUTI: {
    symbol: "MARUTI",
    ltp: 12450.0,
    open: 12300,
    high: 12480,
    low: 12280,
    previousClose: 12264.5,
    change: 185.5,
    changePercent: 1.51,
    volume: 900000,
    deliveryPercent: 52.8,
    vwap: 12412.4,
    marketCap: "₹3.9L Cr",
    sector: "Auto",
    industry: "Passenger Vehicles",
  },
};

function generatePriceHistory(
  basePrice: number,
  points: number,
  volatility: number,
  trend: number
): PricePoint[] {
  const history: PricePoint[] = [];
  let price = basePrice * (1 - trend * 0.15);
  const referenceTime = Date.UTC(2026, 6, 11, 15, 30);

  for (let i = points - 1; i >= 0; i--) {
    const drift = trend * volatility * 0.3;
    const noise = (Math.sin(i * 0.7) + Math.cos(i * 1.3)) * volatility * 0.5;
    price = Math.max(price * (1 + drift + noise * 0.02), basePrice * 0.6);
    history.push({
      timestamp: new Date(referenceTime - i * 3600000).toISOString(),
      price: Math.round(price * 100) / 100,
      volume: Math.round(
        1e6 + ((Math.sin(basePrice * 0.01 + i * 1.7) + 1) / 2) * 5e6
      ),
    });
  }

  history[history.length - 1].price = basePrice;
  return history;
}

export function buildMockOhlc(
  basePrice: number,
  changePercent: number
): Record<ChartTimeframe, PricePoint[]> {
  const trend = changePercent >= 0 ? 1 : -1;
  return {
    "1D": generatePriceHistory(basePrice, 24, 0.3, trend),
    "1W": generatePriceHistory(basePrice, 35, 0.5, trend),
    "1M": generatePriceHistory(basePrice, 30, 0.8, trend),
    "3M": generatePriceHistory(basePrice, 28, 1.0, trend),
    "6M": generatePriceHistory(basePrice, 26, 1.2, trend),
    "1Y": generatePriceHistory(basePrice, 52, 1.5, trend),
    "5Y": generatePriceHistory(basePrice, 60, 2.0, trend),
  };
}

export function mockQuoteToIndex(seed: MockQuoteSeed, meta: Partial<MarketIndex>): MarketIndex {
  return {
    id: meta.id ?? seed.symbol.toLowerCase(),
    name: meta.name ?? seed.symbol,
    symbol: seed.symbol,
    value: seed.ltp,
    change: seed.change,
    changePercent: seed.changePercent,
    high: seed.high,
    low: seed.low,
    sparkline: meta.sparkline ?? [
      seed.low,
      seed.ltp * 0.998,
      seed.ltp * 1.001,
      seed.ltp,
    ],
  };
}

export function synthesizeMockQuote(symbol: string): MockQuoteSeed {
  const normalized = normalizeNseSymbol(symbol);
  const meta = getNseSymbolMeta(normalized);
  const rng = createRng(hashSeed(`quote-${normalized}`));
  const ltp = meta?.price && meta.price > 0 ? meta.price : round(50 + rng() * 8000, 2);
  const changePercent = meta?.changePercent ?? round((rng() - 0.5) * 3, 2);
  const change = round(ltp * (changePercent / 100), 2);
  const previousClose = round(ltp - change, 2);
  const intraday = 0.008 + rng() * 0.02;

  return {
    symbol: normalized,
    ltp,
    open: round(previousClose * (1 + (rng() - 0.5) * 0.01)),
    high: round(Math.max(ltp, previousClose) * (1 + intraday)),
    low: round(Math.min(ltp, previousClose) * (1 - intraday * 0.9)),
    previousClose,
    change,
    changePercent,
    volume: Math.round((2e6 + rng() * 1.5e7) / 100) * 100,
    deliveryPercent: round(35 + rng() * 35, 1),
    vwap: round(ltp * (0.995 + rng() * 0.01), 2),
    marketCap: meta?.marketCap ?? "—",
    sector: meta?.sector ?? "Equities",
    industry: meta?.industry ?? "Listed Company",
  };
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getMockQuote(symbol: string): MockQuoteSeed | null {
  const normalized = normalizeNseSymbol(symbol);
  const existing =
    MOCK_STOCK_QUOTES[normalized] ??
    MOCK_INDEX_QUOTES[normalized];
  if (existing) return existing;
  if (!isValidNseSymbol(normalized)) return null;
  return synthesizeMockQuote(normalized);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(volume);
}
