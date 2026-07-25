"use client";

import type {
  InstitutionalStrategyPick,
  SharedRecommendation,
} from "@/lib/recommendations";
import {
  createContext,
  useCallback,
  useContext,
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
