"use client";

import type {
  InstitutionalStrategyPick,
  SharedRecommendation,
} from "@/lib/recommendations";
import { onUiEvent } from "@/src/design/command/uiBus";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RecommendationDetailDrawer } from "./RecommendationDetailDrawer";
import {
  fromSharedRecommendation,
  fromStrategyPick,
  fromUnavailableSymbol,
  type RecommendationDetailContext,
  type RecommendationDrawerSource,
} from "./types";

interface RecommendationDetailDrawerContextValue {
  openRecommendation: (
    recommendation: SharedRecommendation,
    source?: RecommendationDrawerSource
  ) => void;
  openFromStrategyPick: (
    pick: InstitutionalStrategyPick,
    source?: RecommendationDrawerSource
  ) => void;
  openContext: (context: RecommendationDetailContext) => void;
  /** Fetch published package by symbol; opens empty status when unavailable. */
  openBySymbol: (
    symbol: string,
    company?: string,
    source?: RecommendationDrawerSource
  ) => Promise<void>;
  closeRecommendationDrawer: () => void;
  isOpen: boolean;
}

const RecommendationDetailDrawerContext =
  createContext<RecommendationDetailDrawerContextValue | null>(null);

async function fetchRecommendationBySymbol(
  symbol: string
): Promise<SharedRecommendation | null> {
  try {
    const response = await fetch("/api/recommendations", { cache: "no-store" });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      recommendations?: SharedRecommendation[];
    };
    const list = json.recommendations ?? [];
    const upper = symbol.toUpperCase();
    return list.find((item) => item.symbol.toUpperCase() === upper) ?? null;
  } catch {
    return null;
  }
}

export function RecommendationDetailDrawerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [context, setContext] = useState<RecommendationDetailContext | null>(
    null
  );
  const [open, setOpen] = useState(false);

  const reveal = useCallback((next: RecommendationDetailContext) => {
    setContext(next);
    setOpen(true);
  }, []);

  const openRecommendation = useCallback(
    (
      recommendation: SharedRecommendation,
      source?: RecommendationDrawerSource
    ) => {
      reveal(fromSharedRecommendation(recommendation, source));
    },
    [reveal]
  );

  const openFromStrategyPick = useCallback(
    (
      pick: InstitutionalStrategyPick,
      source: RecommendationDrawerSource = "dashboard"
    ) => {
      reveal(fromStrategyPick(pick, source));
    },
    [reveal]
  );

  const openContext = useCallback(
    (next: RecommendationDetailContext) => {
      reveal(next);
    },
    [reveal]
  );

  const openBySymbol = useCallback(
    async (
      symbol: string,
      company?: string,
      source: RecommendationDrawerSource = "company"
    ) => {
      const recommendation = await fetchRecommendationBySymbol(symbol);
      if (recommendation) {
        reveal(fromSharedRecommendation(recommendation, source));
        return;
      }
      reveal(fromUnavailableSymbol(symbol, company ?? symbol, source));
    },
    [reveal]
  );

  const closeRecommendationDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  const handleExited = useCallback(() => {
    setContext(null);
  }, []);

  // Search / command palette — open whenever a recommendation package exists.
  useEffect(() => {
    return onUiEvent("open-recommendation", (detail) => {
      const payload = detail as
        | { symbol?: string; company?: string }
        | undefined;
      if (!payload?.symbol) return;
      void openBySymbol(payload.symbol, payload.company, "search");
    });
  }, [openBySymbol]);

  // Hydrate dashboard / partial opens with the published SharedRecommendation
  // for the same symbol — read-only reuse of the existing recommendations API.
  useEffect(() => {
    if (!open || !context || context.source) return;
    if (context.statusMessage) return;
    const symbol = context.symbol;
    let cancelled = false;

    void fetchRecommendationBySymbol(symbol).then((recommendation) => {
      if (cancelled || !recommendation) return;
      setContext((current) => {
        if (!current || current.symbol.toUpperCase() !== symbol.toUpperCase()) {
          return current;
        }
        if (current.source) return current;
        return {
          ...fromSharedRecommendation(recommendation, current.openedFrom),
          currentPrice: current.currentPrice ?? null,
          changePercent: current.changePercent,
          changeAbsolute: current.changeAbsolute,
          marketCap: current.marketCap,
          tradeHints: current.tradeHints,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, context?.id, context?.symbol, context?.source, context?.statusMessage]);

  const value = useMemo(
    () => ({
      openRecommendation,
      openFromStrategyPick,
      openContext,
      openBySymbol,
      closeRecommendationDrawer,
      isOpen: open && context != null,
    }),
    [
      openRecommendation,
      openFromStrategyPick,
      openContext,
      openBySymbol,
      closeRecommendationDrawer,
      open,
      context,
    ]
  );

  return (
    <RecommendationDetailDrawerContext.Provider value={value}>
      {children}
      <RecommendationDetailDrawer
        context={context}
        open={open}
        onClose={closeRecommendationDrawer}
        onExited={handleExited}
      />
    </RecommendationDetailDrawerContext.Provider>
  );
}

export function useRecommendationDetailDrawer(): RecommendationDetailDrawerContextValue {
  const ctx = useContext(RecommendationDetailDrawerContext);
  if (!ctx) {
    throw new Error(
      "useRecommendationDetailDrawer must be used within RecommendationDetailDrawerProvider"
    );
  }
  return ctx;
}

/** Safe hook when provider may be absent (optional surfaces). */
export function useOptionalRecommendationDetailDrawer(): RecommendationDetailDrawerContextValue | null {
  return useContext(RecommendationDetailDrawerContext);
}
