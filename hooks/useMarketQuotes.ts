"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useDashboardQuoteContext } from "@/components/dashboard/DashboardQuoteProvider";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";

interface MarketStatusResponse {
  marketOpen: boolean;
  marketStatus: string;
  marketStatusLabel: string;
  pollIntervalMs: number;
  serverTime: string;
}

interface QuotesResponse {
  quotes: Record<string, EnrichedQuote>;
  marketOpen: boolean;
  marketStatus: string;
  marketStatusLabel: string;
  pollIntervalMs: number;
  serverTime: string;
}

export interface UseMarketQuotesOptions {
  initialQuotes?: Record<string, EnrichedQuote>;
  enabled?: boolean;
}

export interface UseMarketQuotesResult {
  quotes: Map<string, EnrichedQuote>;
  marketOpen: boolean;
  marketStatus: string;
  pollIntervalMs: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort();
}

function isQuoteAvailable(quote: EnrichedQuote): boolean {
  return quote.availability !== "unavailable" && quote.price !== null && quote.price > 0;
}

/**
 * Client hook for live market quotes.
 * Polls every 5 seconds during market hours; disabled outside session.
 *
 * Inside DashboardQuoteProvider, subscribers share one status + quotes loop.
 * Outside the dashboard, each caller keeps its own independent poll loop.
 */
export function useMarketQuotes(
  symbols: string[],
  options: UseMarketQuotesOptions = {}
): UseMarketQuotesResult {
  const dashboard = useDashboardQuoteContext();
  const subscriberId = useId();
  const { initialQuotes = {}, enabled = true } = options;
  const normalized = useMemo(() => normalizeSymbols(symbols), [symbols]);
  const symbolsKey = normalized.join(",");
  const initialQuotesRef = useRef(initialQuotes);
  initialQuotesRef.current = initialQuotes;

  // Dashboard path: register symbols with the shared provider (no local polling).
  useEffect(() => {
    if (!dashboard || !enabled) return;
    dashboard.register(subscriberId, normalized, initialQuotesRef.current);
    return () => {
      dashboard.unregister(subscriberId);
    };
  }, [dashboard, subscriberId, symbolsKey, enabled, normalized]);

  // Standalone path — disabled while a dashboard provider owns quotes.
  const standaloneEnabled = enabled && !dashboard;

  const [quotes, setQuotes] = useState<Map<string, EnrichedQuote>>(() => {
    const map = new Map<string, EnrichedQuote>();
    for (const [symbol, quote] of Object.entries(initialQuotes)) {
      map.set(symbol.toUpperCase(), quote);
    }
    return map;
  });
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketStatus, setMarketStatus] = useState("closed");
  const [pollIntervalMs, setPollIntervalMs] = useState(0);
  const [loading, setLoading] = useState(standaloneEnabled && normalized.length > 0);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (!standaloneEnabled || normalized.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [statusRes, quotesRes] = await Promise.all([
        fetch("/api/market/status", { signal: controller.signal }),
        fetch(`/api/market/quotes?symbols=${encodeURIComponent(symbolsKey)}`, {
          signal: controller.signal,
        }),
      ]);

      if (!statusRes.ok || !quotesRes.ok) {
        throw new Error("Failed to fetch market quotes");
      }

      const status = (await statusRes.json()) as MarketStatusResponse;
      const data = (await quotesRes.json()) as QuotesResponse;

      setMarketOpen(status.marketOpen);
      setMarketStatus(status.marketStatus);
      setPollIntervalMs(status.pollIntervalMs);

      setQuotes((prev) => {
        const map = new Map(prev);
        for (const [symbol, quote] of Object.entries(data.quotes)) {
          const key = symbol.toUpperCase();
          const existing = map.get(key);
          if (isQuoteAvailable(quote)) {
            map.set(key, quote);
          } else if (!existing || !isQuoteAvailable(existing)) {
            map.set(key, quote);
          }
        }
        return map;
      });
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error("Failed to fetch market quotes"));
    } finally {
      setLoading(false);
    }
  }, [standaloneEnabled, normalized.length, symbolsKey]);

  useEffect(() => {
    if (!standaloneEnabled || normalized.length === 0) {
      setLoading(false);
      return;
    }

    void fetchQuotes();

    return () => {
      abortRef.current?.abort();
    };
  }, [standaloneEnabled, fetchQuotes, normalized.length]);

  useEffect(() => {
    if (!standaloneEnabled || !marketOpen || pollIntervalMs <= 0 || normalized.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchQuotes();
    }, pollIntervalMs);

    return () => window.clearInterval(interval);
  }, [standaloneEnabled, marketOpen, pollIntervalMs, fetchQuotes, normalized.length]);

  if (dashboard && enabled) {
    // Match standalone useState(enabled && symbols.length > 0): loading until first fetch.
    const loading =
      dashboard.loading || (normalized.length > 0 && !dashboard.hasFetched);
    return {
      quotes: dashboard.quotes,
      marketOpen: dashboard.marketOpen,
      marketStatus: dashboard.marketStatus,
      pollIntervalMs: dashboard.pollIntervalMs,
      loading,
      error: dashboard.error,
      refetch: dashboard.refetch,
    };
  }

  return {
    quotes,
    marketOpen,
    marketStatus,
    pollIntervalMs,
    loading,
    error,
    refetch: fetchQuotes,
  };
}
