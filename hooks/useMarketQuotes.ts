"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * Client hook for live market quotes.
 * Polls every 5 seconds during market hours; disabled outside session.
 */
export function useMarketQuotes(
  symbols: string[],
  options: UseMarketQuotesOptions = {}
): UseMarketQuotesResult {
  const { initialQuotes = {}, enabled = true } = options;
  const normalized = useMemo(() => normalizeSymbols(symbols), [symbols.join(",")]);
  const symbolsKey = normalized.join(",");

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
  const [loading, setLoading] = useState(enabled && normalized.length > 0);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (!enabled || normalized.length === 0) return;

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

      const map = new Map<string, EnrichedQuote>();
      for (const [symbol, quote] of Object.entries(data.quotes)) {
        map.set(symbol.toUpperCase(), quote);
      }
      setQuotes(map);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error("Failed to fetch market quotes"));
    } finally {
      setLoading(false);
    }
  }, [enabled, normalized.length, symbolsKey]);

  useEffect(() => {
    if (!enabled || normalized.length === 0) {
      setLoading(false);
      return;
    }

    void fetchQuotes();

    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, fetchQuotes, symbolsKey]);

  useEffect(() => {
    if (!enabled || !marketOpen || pollIntervalMs <= 0 || normalized.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchQuotes();
    }, pollIntervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, marketOpen, pollIntervalMs, fetchQuotes, normalized.length]);

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
