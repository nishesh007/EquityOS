/**
 * Market Context Service — Sprint 11B.1A.
 * Consumes existing EquityOS market APIs once, maps to engine input, and
 * exposes getMarketContext / refresh / subscribe. No duplicate fetching.
 */

import { marketDataService } from "@/lib/market-data";
import type { OhlcBar } from "@/lib/providers/types";
import { fetchMarketIndices } from "@/services/marketData";
import {
  fetchMarketBreadth,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import type { MarketBreadth, MarketIndex, MarketPulse } from "@/types";
import { getMarketContextEngine } from "./MarketContextEngine";
import type {
  BreadthContextSnapshot,
  IndexContextSnapshot,
  MarketContext,
  MarketContextInput,
  MarketContextListener,
  MarketContextRawData,
  MarketContextServiceOptions,
  VixContextSnapshot,
} from "./MarketContextTypes";
import { createFallbackMarketContext } from "./MarketContextUtils";

const OHLC_TIMEFRAME = "3M" as const;

function isUsableIndex(index: MarketIndex | undefined): boolean {
  return Boolean(
    index &&
      Number.isFinite(index.value) &&
      index.value > 0 &&
      index.quote?.availability !== "unavailable"
  );
}

function closesFromCandles(candles: OhlcBar[]): number[] {
  return candles
    .map((bar) => bar.close)
    .filter((close) => Number.isFinite(close) && close > 0);
}

function findIndex(
  indices: MarketIndex[],
  symbol: string
): MarketIndex | undefined {
  const target = symbol.toUpperCase();
  return indices.find((index) => index.symbol.toUpperCase() === target);
}

function toIndexSnapshot(
  index: MarketIndex | undefined,
  candles: OhlcBar[],
  fallbackName: string,
  fallbackSymbol: string
): IndexContextSnapshot {
  if (!isUsableIndex(index) || !index) {
    return {
      symbol: fallbackSymbol,
      name: fallbackName,
      price: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      closes: closesFromCandles(candles),
      candles,
      available: false,
    };
  }

  return {
    symbol: index.symbol,
    name: index.name,
    price: index.value,
    changePercent: index.changePercent,
    high: index.high,
    low: index.low,
    open: index.quote?.open ?? undefined,
    previousClose: index.quote?.previousClose ?? undefined,
    closes: closesFromCandles(candles),
    candles,
    available: true,
  };
}

function toVixSnapshot(
  indices: MarketIndex[],
  pulse: MarketPulse
): VixContextSnapshot {
  const vixIndex = findIndex(indices, "INDIAVIX");
  const level =
    pulse.indiaVix > 0
      ? pulse.indiaVix
      : vixIndex && vixIndex.value > 0
        ? vixIndex.value
        : 0;
  const changePercent =
    pulse.indiaVixChange !== 0
      ? pulse.indiaVixChange
      : (vixIndex?.changePercent ?? 0);

  return {
    level,
    changePercent,
    available: level > 0,
  };
}

function toBreadthSnapshot(breadth: MarketBreadth): BreadthContextSnapshot {
  const hasCounts =
    breadth.advances + breadth.declines + breadth.unchanged > 0;
  return {
    advances: breadth.advances,
    declines: breadth.declines,
    unchanged: breadth.unchanged,
    newHighs: breadth.newHighs,
    newLows: breadth.newLows,
    sectors: breadth.sectors ?? [],
    available: hasCounts || (breadth.sectors?.length ?? 0) > 0,
  };
}

function estimateVolumeChangePercent(candles: OhlcBar[]): number | null {
  if (candles.length < 21) return null;
  const recent = candles.slice(-5);
  const prior = candles.slice(-20, -5);
  const recentAvg =
    recent.reduce((sum, bar) => sum + bar.volume, 0) / recent.length;
  const priorAvg =
    prior.reduce((sum, bar) => sum + bar.volume, 0) / prior.length;
  if (priorAvg <= 0) return null;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}

/**
 * Maps already-fetched EquityOS market payloads into engine input.
 * Callers must not re-fetch inside this function.
 */
export function mapRawDataToMarketContextInput(
  raw: MarketContextRawData
): MarketContextInput {
  const nifty = findIndex(raw.indices, "NIFTY");
  const sensex = findIndex(raw.indices, "SENSEX");
  const bankNifty = findIndex(raw.indices, "BANKNIFTY");

  return {
    nifty: toIndexSnapshot(nifty, raw.niftyCandles, "Nifty 50", "NIFTY"),
    sensex: toIndexSnapshot(sensex, raw.sensexCandles, "Sensex", "SENSEX"),
    bankNifty: toIndexSnapshot(
      bankNifty,
      raw.bankNiftyCandles,
      "Bank Nifty",
      "BANKNIFTY"
    ),
    indiaVix: toVixSnapshot(raw.indices, raw.pulse),
    breadth: toBreadthSnapshot(raw.breadth),
    volumeChangePercent: estimateVolumeChangePercent(raw.niftyCandles),
    asOf: raw.fetchedAt,
  };
}

async function loadOhlcSafe(symbol: string): Promise<OhlcBar[]> {
  try {
    const result = await marketDataService.getOhlcCandles(symbol, OHLC_TIMEFRAME);
    return Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * Fetches all required market inputs in a single coordinated pass
 * through existing EquityOS services (no duplicate provider calls).
 */
export async function fetchMarketContextRawData(): Promise<MarketContextRawData> {
  const [indices, breadth, pulse, niftyCandles, bankNiftyCandles, sensexCandles] =
    await Promise.all([
      fetchMarketIndices(),
      fetchMarketBreadth(),
      fetchMarketPulse(),
      loadOhlcSafe("NIFTY"),
      loadOhlcSafe("BANKNIFTY"),
      loadOhlcSafe("SENSEX"),
    ]);

  return {
    indices,
    breadth,
    pulse,
    niftyCandles,
    bankNiftyCandles,
    sensexCandles,
    fetchedAt: new Date(),
  };
}

export class MarketContextService {
  private readonly listeners = new Set<MarketContextListener>();
  private cache: MarketContext | null = null;
  private inflight: Promise<MarketContext> | null = null;

  /**
   * Returns the latest market context, using in-memory cache when available.
   */
  async getMarketContext(
    options: MarketContextServiceOptions = {}
  ): Promise<MarketContext> {
    if (!options.forceRefresh && this.cache) {
      return this.cache;
    }
    return this.refresh();
  }

  /**
   * Force-recomputes market context from live EquityOS market services.
   */
  async refresh(): Promise<MarketContext> {
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.computeFreshContext().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Subscribe to context updates. Returns an unsubscribe function.
   */
  subscribe(listener: MarketContextListener): () => void {
    this.listeners.add(listener);
    if (this.cache) {
      listener(this.cache);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Synchronous peek at the cached context (null before first refresh). */
  getCachedContext(): MarketContext | null {
    return this.cache;
  }

  clearCache(): void {
    this.cache = null;
  }

  private async computeFreshContext(): Promise<MarketContext> {
    try {
      const raw = await fetchMarketContextRawData();
      const input = mapRawDataToMarketContextInput(raw);
      const context = getMarketContextEngine().analyze(input);
      this.cache = context;
      this.notify(context);
      return context;
    } catch {
      const fallback = createFallbackMarketContext(
        new Date(),
        "Market context refresh failed — neutral fallback applied"
      );
      this.cache = fallback;
      getMarketContextEngine().analyze({
        nifty: {
          symbol: "NIFTY",
          name: "Nifty 50",
          price: 0,
          changePercent: 0,
          high: 0,
          low: 0,
          closes: [],
          candles: [],
          available: false,
        },
        sensex: {
          symbol: "SENSEX",
          name: "Sensex",
          price: 0,
          changePercent: 0,
          high: 0,
          low: 0,
          closes: [],
          candles: [],
          available: false,
        },
        bankNifty: {
          symbol: "BANKNIFTY",
          name: "Bank Nifty",
          price: 0,
          changePercent: 0,
          high: 0,
          low: 0,
          closes: [],
          candles: [],
          available: false,
        },
        indiaVix: { level: 0, changePercent: 0, available: false },
        breadth: {
          advances: 0,
          declines: 0,
          unchanged: 0,
          newHighs: 0,
          newLows: 0,
          sectors: [],
          available: false,
        },
        volumeChangePercent: null,
        asOf: fallback.lastUpdated,
      });
      this.notify(fallback);
      return fallback;
    }
  }

  private notify(context: MarketContext): void {
    for (const listener of this.listeners) {
      try {
        listener(context);
      } catch {
        // Listener errors must not break the service.
      }
    }
  }
}

let serviceSingleton: MarketContextService | null = null;

export function getMarketContextService(): MarketContextService {
  if (!serviceSingleton) {
    serviceSingleton = new MarketContextService();
  }
  return serviceSingleton;
}

export function resetMarketContextService(): void {
  if (serviceSingleton) {
    serviceSingleton.clearCache();
  }
  serviceSingleton = null;
}

/** Convenience: getMarketContext() via the shared service singleton. */
export async function getMarketContext(
  options?: MarketContextServiceOptions
): Promise<MarketContext> {
  return getMarketContextService().getMarketContext(options);
}

/** Convenience: refresh() via the shared service singleton. */
export async function refreshMarketContext(): Promise<MarketContext> {
  return getMarketContextService().refresh();
}

/** Convenience: subscribe() via the shared service singleton. */
export function subscribeMarketContext(
  listener: MarketContextListener
): () => void {
  return getMarketContextService().subscribe(listener);
}
