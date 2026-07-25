"use client";

import type {
  InstitutionalStrategyPick,
  SharedRecommendation,
} from "@/lib/recommendations";
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

  const openRecommendation = useCallback(
    (
      recommendation: SharedRecommendation,
      source?: RecommendationDrawerSource
    ) => {
      setContext(fromSharedRecommendation(recommendation, source));
    },
    []
  );

  const openFromStrategyPick = useCallback(
    (
      pick: InstitutionalStrategyPick,
      source: RecommendationDrawerSource = "dashboard"
    ) => {
      setContext(fromStrategyPick(pick, source));
    },
    []
  );

  const openContext = useCallback((next: RecommendationDetailContext) => {
    setContext(next);
  }, []);

  const closeRecommendationDrawer = useCallback(() => {
    setContext(null);
  }, []);

  // Hydrate dashboard / partial opens with the published SharedRecommendation
  // for the same symbol — read-only reuse of the existing recommendations API.
  useEffect(() => {
    if (!context || context.source) return;
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
  }, [context?.id, context?.symbol, context?.source]);

  const value = useMemo(
    () => ({
      openRecommendation,
      openFromStrategyPick,
      openContext,
      closeRecommendationDrawer,
      isOpen: context != null,
    }),
    [
      openRecommendation,
      openFromStrategyPick,
      openContext,
      closeRecommendationDrawer,
      context,
    ]
  );

  return (
    <RecommendationDetailDrawerContext.Provider value={value}>
      {children}
      <RecommendationDetailDrawer
        context={context}
        open={context != null}
        onClose={closeRecommendationDrawer}
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
