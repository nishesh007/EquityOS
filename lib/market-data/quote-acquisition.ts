/**
 * Institutional quote acquisition.
 *
 * Production price path (never Mock):
 *   Live Provider → Cache → Last Successful Quote → Unavailable
 *
 * Live providers (in order): Yahoo → Finnhub → Polygon → NSE
 * Adaptive batching + retry + exponential backoff + concurrency limits.
 * Successful quotes are persisted locally for stale reuse.
 *
 * Server-only — persists via quote-store (node:fs).
 */

import "server-only";

import { finnhubAdapter } from "@/lib/adapters/finnhub";
import { nseAdapter } from "@/lib/adapters/nse";
import { polygonAdapter } from "@/lib/adapters/polygon";
import { yahooAdapter } from "@/lib/adapters/yahoo";
import {
  flushQuoteStore,
  getStoredQuote,
  saveSuccessfulQuote,
  type StoredQuote,
} from "@/lib/market-data/quote-store";
import { loadProviderConfig, isProviderConfigured } from "@/lib/providers/config";
import {
  recordProviderFailure,
  recordProviderSuccess,
  setProviderAvailable,
} from "@/lib/market-data/provider-health";
import { normalizeSymbol } from "@/lib/market-data/symbols";
import type { MarketData, MarketDataResult } from "@/lib/market-data/types";
import { liveQuoteToMarketData } from "@/lib/market-data/mappers";
import type { LiveQuote } from "@/lib/providers/types";

export type QuoteAcquisitionProvider =
  | "Yahoo"
  | "Finnhub"
  | "Polygon"
  | "NSE"
  | "cache"
  | "last_successful"
  | "unavailable";

export interface AcquiredQuote {
  symbol: string;
  price: number | null;
  volume: number;
  timestamp: string;
  provider: string;
  age: number;
  stale: boolean;
  quoteAge: number;
  source: "live" | "cached" | "unavailable";
  attempted: string[];
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
}

export interface QuoteFreshnessStats {
  requested: number;
  quotesFetched: number;
  fresh: number;
  stale: number;
  unavailable: number;
  providerFailures: number;
  cacheHits: number;
  cacheHitRatio: number;
  providerLatencyMs: Record<string, number>;
  providerSuccess: Record<string, number>;
  providerFailure: Record<string, number>;
  batchSizeFinal: number;
  concurrencyFinal: number;
  durationMs: number;
}

export interface QuoteAcquisitionResult {
  quotes: Map<string, AcquiredQuote>;
  stats: QuoteFreshnessStats;
}

const PROVIDER_PIPELINE = ["Yahoo", "Finnhub", "Polygon", "NSE"] as const;

const DEFAULT_MAX_AGE_HOURS = 72;
const MIN_BATCH = 4;
const MAX_BATCH = 32;
const MIN_CONCURRENCY = 2;
const MAX_CONCURRENCY = 12;
const MAX_RETRIES = 3;

function readMaxAgeMs(): number {
  const raw = process.env.QUOTE_MAX_AGE_HOURS?.trim();
  const hours = raw ? Number(raw) : DEFAULT_MAX_AGE_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_MAX_AGE_HOURS * 3_600_000;
  return hours * 3_600_000;
}

export function getQuoteMaxAgeMs(): number {
  return readMaxAgeMs();
}

function emptyStats(requested: number): QuoteFreshnessStats {
  return {
    requested,
    quotesFetched: 0,
    fresh: 0,
    stale: 0,
    unavailable: 0,
    providerFailures: 0,
    cacheHits: 0,
    cacheHitRatio: 0,
    providerLatencyMs: {},
    providerSuccess: {},
    providerFailure: {},
    batchSizeFinal: MIN_BATCH,
    concurrencyFinal: MIN_CONCURRENCY,
    durationMs: 0,
  };
}

function noteLatency(
  stats: QuoteFreshnessStats,
  provider: string,
  latency: number,
  ok: boolean
): void {
  const prev = stats.providerLatencyMs[provider] ?? 0;
  const count =
    (stats.providerSuccess[provider] ?? 0) + (stats.providerFailure[provider] ?? 0);
  stats.providerLatencyMs[provider] = Math.round((prev * count + latency) / (count + 1));
  if (ok) {
    stats.providerSuccess[provider] = (stats.providerSuccess[provider] ?? 0) + 1;
  } else {
    stats.providerFailure[provider] = (stats.providerFailure[provider] ?? 0) + 1;
    stats.providerFailures += 1;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|rate.?limit|too many|throttle|ECONNRESET|ETIMEDOUT|aborted|timeout/i.test(
    message
  );
}

function toLiveQuoteFromRaw(
  symbol: string,
  provider: string,
  raw: {
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    previousClose: number;
    volume: number;
  }
): LiveQuote {
  const now = new Date().toISOString();
  return {
    symbol: symbol.toUpperCase(),
    ltp: raw.price,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    previousClose: raw.previousClose,
    change: raw.change,
    changePercent: raw.changePercent,
    volume: raw.volume,
    provider,
    source: "live",
    fetchedAt: now,
  };
}

async function fetchFromYahoo(symbol: string): Promise<LiveQuote> {
  const raw = await yahooAdapter.fetch({ symbol });
  return toLiveQuoteFromRaw(symbol, "Yahoo", raw);
}

async function fetchFromFinnhub(symbol: string): Promise<LiveQuote> {
  if (!isProviderConfigured("finnhub")) {
    throw new Error("Finnhub not configured");
  }
  const raw = await finnhubAdapter.fetch({ symbol });
  if (!(raw.currentPrice > 0)) {
    throw new Error(`Finnhub: no quote for ${symbol}`);
  }
  return toLiveQuoteFromRaw(symbol, "Finnhub", {
    price: raw.currentPrice,
    change: raw.change,
    changePercent: raw.percentChange,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    previousClose: raw.previousClose,
    volume: 0,
  });
}

async function fetchFromPolygon(symbol: string): Promise<LiveQuote> {
  if (!isProviderConfigured("polygon")) {
    throw new Error("Polygon not configured");
  }
  // Use prior daily bar close as last traded price when snapshot is unavailable.
  const bars = await polygonAdapter.fetchAggregates(symbol, "5D");
  const last = bars.at(-1);
  if (!last || !(last.close > 0)) {
    throw new Error(`Polygon: no quote bar for ${symbol}`);
  }
  const prev = bars.at(-2)?.close ?? last.open;
  const change = last.close - prev;
  const changePercent = prev > 0 ? (change / prev) * 100 : 0;
  return {
    symbol: symbol.toUpperCase(),
    ltp: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    previousClose: prev,
    change,
    changePercent,
    volume: last.volume,
    provider: "Polygon",
    source: "live",
    fetchedAt: last.timestamp,
  };
}

async function fetchFromNse(symbol: string): Promise<LiveQuote> {
  if (!isProviderConfigured("nse")) {
    throw new Error("NSE not enabled");
  }
  const raw = await nseAdapter.fetch({ symbol });
  return toLiveQuoteFromRaw(symbol, "NSE", {
    price: raw.price,
    change: raw.change,
    changePercent: raw.changePercent,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    previousClose: raw.previousClose,
    volume: raw.volume,
  });
}

type LiveFetcher = (symbol: string) => Promise<LiveQuote>;

function buildLiveFetchers(): Array<{ name: QuoteAcquisitionProvider; fetch: LiveFetcher }> {
  const config = loadProviderConfig();
  setProviderAvailable("Yahoo", true);
  setProviderAvailable("Finnhub", isProviderConfigured("finnhub"));
  setProviderAvailable("Polygon", isProviderConfigured("polygon"));
  setProviderAvailable("NSE", config.nse.enabled);

  const chain: Array<{ name: QuoteAcquisitionProvider; fetch: LiveFetcher }> = [
    { name: "Yahoo", fetch: fetchFromYahoo },
  ];
  if (isProviderConfigured("finnhub")) {
    chain.push({ name: "Finnhub", fetch: fetchFromFinnhub });
  }
  if (isProviderConfigured("polygon")) {
    chain.push({ name: "Polygon", fetch: fetchFromPolygon });
  }
  if (config.nse.enabled) {
    chain.push({ name: "NSE", fetch: fetchFromNse });
  }
  return chain;
}

function storedToAcquired(
  stored: StoredQuote,
  attempted: string[],
  via: "cache" | "last_successful"
): AcquiredQuote {
  return {
    symbol: stored.symbol,
    price: stored.price,
    volume: stored.volume,
    timestamp: stored.timestamp,
    provider: stored.provider,
    age: stored.age,
    stale: true,
    quoteAge: stored.age,
    source: "cached",
    attempted: [...attempted, via],
  };
}

function liveToAcquired(quote: LiveQuote, attempted: string[]): AcquiredQuote {
  const timestamp = quote.fetchedAt;
  const age = Math.max(0, Date.now() - new Date(timestamp).getTime());
  return {
    symbol: quote.symbol.toUpperCase(),
    price: quote.ltp,
    volume: quote.volume,
    timestamp,
    provider: quote.provider,
    age,
    stale: false,
    quoteAge: age,
    source: "live",
    attempted,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
  };
}

function unavailableAcquired(symbol: string, attempted: string[]): AcquiredQuote {
  return {
    symbol: symbol.toUpperCase(),
    price: null,
    volume: 0,
    timestamp: new Date().toISOString(),
    provider: "unavailable",
    age: Number.POSITIVE_INFINITY,
    stale: true,
    quoteAge: Number.POSITIVE_INFINITY,
    source: "unavailable",
    attempted,
  };
}

async function fetchLiveWithRetry(
  symbol: string,
  fetcher: LiveFetcher,
  provider: string,
  stats: QuoteFreshnessStats
): Promise<LiveQuote> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const started = Date.now();
    try {
      const quote = await fetcher(symbol);
      const latency = Date.now() - started;
      noteLatency(stats, provider, latency, true);
      recordProviderSuccess(provider, latency);
      return quote;
    } catch (error) {
      lastError = error;
      const latency = Date.now() - started;
      noteLatency(stats, provider, latency, false);
      recordProviderFailure(provider, latency);
      // Only retry throttles / transient network — not "no quote" misses.
      if (attempt < MAX_RETRIES - 1 && isRateLimitError(error)) {
        await sleep(250 * 2 ** attempt + Math.floor(Math.random() * 100));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function acquireOne(
  symbol: string,
  fetchers: Array<{ name: QuoteAcquisitionProvider; fetch: LiveFetcher }>,
  stats: QuoteFreshnessStats,
  maxAgeMs: number
): Promise<AcquiredQuote> {
  const normalized = normalizeSymbol(symbol).internal;
  const attempted: string[] = [];

  for (const entry of fetchers) {
    attempted.push(entry.name);
    try {
      const live = await fetchLiveWithRetry(
        normalized,
        entry.fetch,
        entry.name,
        stats
      );
      if (!(live.ltp > 0)) {
        throw new Error(`${entry.name}: null price`);
      }
      if (live.source === "mock" || /^(free|mock)$/i.test(live.provider)) {
        throw new Error(`${entry.name}: mock price rejected`);
      }
      saveSuccessfulQuote({
        symbol: normalized,
        price: live.ltp,
        volume: live.volume,
        timestamp: live.fetchedAt,
        provider: live.provider,
      });
      return liveToAcquired(live, attempted);
    } catch {
      // Continue pipeline — never let one provider collapse the symbol.
      continue;
    }
  }

  // Cached quote (in-process durable store, still within max age preference).
  const stored = getStoredQuote(normalized);
  if (stored && stored.price > 0) {
    stats.cacheHits += 1;
    if (stored.age <= maxAgeMs) {
      return storedToAcquired(stored, attempted, "cache");
    }
    // Last successful quote beyond preferred freshness — still usable as stale.
    return storedToAcquired(stored, attempted, "last_successful");
  }

  return unavailableAcquired(normalized, attempted);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Acquire quotes for a universe with adaptive batching.
 * Never reduces coverage solely because a live provider throttled.
 */
export async function acquireQuotes(
  symbols: string[]
): Promise<QuoteAcquisitionResult> {
  const unique = [
    ...new Set(symbols.map((s) => normalizeSymbol(s).internal)),
  ];
  const started = Date.now();
  const stats = emptyStats(unique.length);
  const maxAgeMs = readMaxAgeMs();
  const fetchers = buildLiveFetchers();

  let batchSize = 12;
  let concurrency = 4;
  let consecutiveRateLimits = 0;
  const quotes = new Map<string, AcquiredQuote>();

  for (let offset = 0; offset < unique.length; ) {
    const batch = unique.slice(offset, offset + batchSize);
    let batchRateLimited = false;

    const batchResults = await mapPool(batch, concurrency, async (symbol) => {
      try {
        return await acquireOne(symbol, fetchers, stats, maxAgeMs);
      } catch (error) {
        if (isRateLimitError(error)) batchRateLimited = true;
        return unavailableAcquired(symbol, ["error"]);
      }
    });

    // Detect rate-limit collapse: many live attempts failed with throttle signals.
    const liveMisses = batchResults.filter((q) => q.source !== "live").length;
    if (
      !batchRateLimited &&
      liveMisses === batch.length &&
      batch.every((symbol) => {
        const q = batchResults.find((row) => row.symbol === symbol);
        return q && q.attempted.includes("Yahoo");
      })
    ) {
      // Soft signal — shrink only when the entire batch missed live after Yahoo attempts
      // and provider failure count spiked this batch.
      const failuresBefore = stats.providerFailures;
      if (failuresBefore > 0) {
        batchRateLimited = true;
      }
    }

    for (const quote of batchResults) {
      quotes.set(quote.symbol, quote);
      if (quote.source === "live" && quote.price != null && quote.price > 0) {
        stats.fresh += 1;
        stats.quotesFetched += 1;
      } else if (
        quote.source === "cached" &&
        quote.price != null &&
        quote.price > 0
      ) {
        stats.stale += 1;
        stats.quotesFetched += 1;
      } else {
        stats.unavailable += 1;
      }
    }

    if (batchRateLimited) {
      consecutiveRateLimits += 1;
      batchSize = Math.max(MIN_BATCH, Math.floor(batchSize / 2));
      concurrency = Math.max(MIN_CONCURRENCY, concurrency - 1);
      await sleep(400 * consecutiveRateLimits);
    } else {
      consecutiveRateLimits = 0;
      batchSize = Math.min(MAX_BATCH, batchSize + 2);
      concurrency = Math.min(MAX_CONCURRENCY, concurrency + 1);
    }

    offset += batch.length;
  }

  flushQuoteStore();

  stats.batchSizeFinal = batchSize;
  stats.concurrencyFinal = concurrency;
  stats.durationMs = Date.now() - started;
  stats.cacheHitRatio =
    stats.quotesFetched > 0 ? stats.cacheHits / stats.quotesFetched : 0;

  console.info(
    "[QuoteAcquisition]",
    JSON.stringify({
      fresh: stats.fresh,
      stale: stats.stale,
      unavailable: stats.unavailable,
      providerFailures: stats.providerFailures,
      providerLatencyMs: stats.providerLatencyMs,
      cacheHitRatio: Number(stats.cacheHitRatio.toFixed(4)),
      durationMs: stats.durationMs,
      pipeline: ["Live Provider", "Cache", "Last Successful Quote", "Unavailable"],
      liveProviders: PROVIDER_PIPELINE,
    })
  );

  return { quotes, stats };
}

export function acquiredQuoteToMarketDataResult(
  quote: AcquiredQuote
): MarketDataResult {
  if (quote.price == null || quote.price <= 0) {
    const normalized = normalizeSymbol(quote.symbol);
    return {
      data: {
        symbol: normalized.internal,
        companyName: normalized.companyName ?? normalized.internal,
        exchange: normalized.exchange,
        currency: normalized.currency,
        ltp: 0,
        previousClose: 0,
        open: 0,
        high: 0,
        low: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        provider: "unavailable",
        lastUpdated: quote.timestamp,
        source: "unavailable",
      },
      provider: "unavailable",
      source: "unavailable",
      attempted: quote.attempted,
    };
  }

  const live: LiveQuote = {
    symbol: quote.symbol,
    ltp: quote.price,
    open: quote.open ?? quote.price,
    high: quote.high ?? quote.price,
    low: quote.low ?? quote.price,
    previousClose: quote.previousClose ?? quote.price,
    change: quote.change ?? 0,
    changePercent: quote.changePercent ?? 0,
    volume: quote.volume,
    provider: quote.provider,
    source: quote.source === "live" ? "live" : "cached",
    fetchedAt: quote.timestamp,
  };

  return {
    data: liveQuoteToMarketData(live),
    provider: quote.provider,
    source: quote.source === "live" ? "live" : "cached",
    attempted: quote.attempted,
  };
}

export function printQuoteFreshnessStats(stats: QuoteFreshnessStats): void {
  console.info("fresh quotes:", stats.fresh);
  console.info("stale quotes:", stats.stale);
  console.info("provider failures:", stats.providerFailures);
  console.info("provider latency:", JSON.stringify(stats.providerLatencyMs));
  console.info(
    "cache hit ratio:",
    `${(stats.cacheHitRatio * 100).toFixed(2)}%`
  );
}

export function getQuoteAcquisitionPipeline(): string[] {
  return [
    "Live Provider",
    "Cache",
    "Last Successful Quote",
    "Unavailable",
  ];
}
