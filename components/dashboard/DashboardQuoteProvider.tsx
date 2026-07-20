"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

interface Subscriber {
  symbols: string[];
  initialQuotes: Record<string, EnrichedQuote>;
}

export interface DashboardQuoteContextValue {
  quotes: Map<string, EnrichedQuote>;
  marketOpen: boolean;
  marketStatus: string;
  pollIntervalMs: number;
  loading: boolean;
  /** True after the first shared fetch settles (success or error). */
  hasFetched: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  register: (
    id: string,
    symbols: string[],
    initialQuotes?: Record<string, EnrichedQuote>
  ) => void;
  unregister: (id: string) => void;
}

const DashboardQuoteContext = createContext<DashboardQuoteContextValue | null>(
  null
);

function isQuoteAvailable(quote: EnrichedQuote): boolean {
  return (
    quote.availability !== "unavailable" &&
    quote.price !== null &&
    quote.price > 0
  );
}

function mergeQuoteIntoMap(
  map: Map<string, EnrichedQuote>,
  symbol: string,
  quote: EnrichedQuote
): void {
  const key = symbol.toUpperCase();
  const existing = map.get(key);
  if (isQuoteAvailable(quote)) {
    map.set(key, quote);
  } else if (!existing || !isQuoteAvailable(existing)) {
    map.set(key, quote);
  }
}

function collectSymbols(subscribers: Map<string, Subscriber>): string[] {
  const set = new Set<string>();
  for (const sub of subscribers.values()) {
    for (const symbol of sub.symbols) {
      set.add(symbol);
    }
  }
  return [...set].sort();
}

/**
 * Single client-side quote owner for the dashboard tree.
 * Widgets register symbols; exactly one status + quotes poll loop runs.
 */
export function DashboardQuoteProvider({ children }: { children: ReactNode }) {
  const subscribersRef = useRef(new Map<string, Subscriber>());
  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);
  const [symbolsKey, setSymbolsKey] = useState("");
  const [quotes, setQuotes] = useState<Map<string, EnrichedQuote>>(
    () => new Map()
  );
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketStatus, setMarketStatus] = useState("closed");
  const [pollIntervalMs, setPollIntervalMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recomputeSymbolsKey = useCallback(() => {
    const next = collectSymbols(subscribersRef.current).join(",");
    setSymbolsKey((prev) => (prev === next ? prev : next));
  }, []);

  const register = useCallback(
    (
      id: string,
      symbols: string[],
      initialQuotes: Record<string, EnrichedQuote> = {}
    ) => {
      const prev = subscribersRef.current.get(id);
      const nextKey = symbols.join(",");
      const prevKey = prev?.symbols.join(",") ?? "";
      subscribersRef.current.set(id, { symbols, initialQuotes });

      if (Object.keys(initialQuotes).length > 0) {
        setQuotes((current) => {
          let changed = false;
          const map = new Map(current);
          for (const [symbol, quote] of Object.entries(initialQuotes)) {
            const key = symbol.toUpperCase();
            if (!map.has(key)) {
              map.set(key, quote);
              changed = true;
            }
          }
          return changed ? map : current;
        });
      }

      if (prevKey !== nextKey) {
        // Match useMarketQuotes: loading is true until the first fetch completes.
        if (!hasFetchedRef.current) {
          setLoading(true);
        }
        recomputeSymbolsKey();
      }
    },
    [recomputeSymbolsKey]
  );

  const unregister = useCallback(
    (id: string) => {
      if (!subscribersRef.current.has(id)) return;
      subscribersRef.current.delete(id);
      recomputeSymbolsKey();
    },
    [recomputeSymbolsKey]
  );

  const fetchQuotes = useCallback(async () => {
    const key = collectSymbols(subscribersRef.current).join(",");
    if (!key) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [statusRes, quotesRes] = await Promise.all([
        fetch("/api/market/status", { signal: controller.signal }),
        fetch(`/api/market/quotes?symbols=${encodeURIComponent(key)}`, {
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
          mergeQuoteIntoMap(map, symbol, quote);
        }
        return map;
      });
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err : new Error("Failed to fetch market quotes")
      );
    } finally {
      if (!controller.signal.aborted) {
        hasFetchedRef.current = true;
        setHasFetched(true);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!symbolsKey) {
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    void fetchQuotes();

    return () => {
      abortRef.current?.abort();
    };
  }, [symbolsKey, fetchQuotes]);

  useEffect(() => {
    if (!symbolsKey || !marketOpen || pollIntervalMs <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchQuotes();
    }, pollIntervalMs);

    return () => window.clearInterval(interval);
  }, [symbolsKey, marketOpen, pollIntervalMs, fetchQuotes]);

  const value = useMemo<DashboardQuoteContextValue>(
    () => ({
      quotes,
      marketOpen,
      marketStatus,
      pollIntervalMs,
      loading,
      hasFetched,
      error,
      refetch: fetchQuotes,
      register,
      unregister,
    }),
    [
      quotes,
      marketOpen,
      marketStatus,
      pollIntervalMs,
      loading,
      hasFetched,
      error,
      fetchQuotes,
      register,
      unregister,
    ]
  );

  return (
    <DashboardQuoteContext.Provider value={value}>
      {children}
    </DashboardQuoteContext.Provider>
  );
}

export function useDashboardQuoteContext(): DashboardQuoteContextValue | null {
  return useContext(DashboardQuoteContext);
}
