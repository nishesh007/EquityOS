"use client";

import { loadDrawerResearchBundle } from "@/components/recommendations/detail-drawer/loadDrawerResearchBundle";
import {
  buildEmptyResearchIntelligenceView,
  buildResearchIntelligenceView,
  type ResearchIntelligenceView,
} from "@/lib/recommendations/research-intelligence-presenter";
import type { SharedRecommendation } from "@/lib/recommendations";
import type { DataTransparency, ResearchConfidence } from "@/types";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import { linkEventsToSymbol } from "@/src/core/events/integration";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useResearchIntelligence(
  symbol: string,
  shared: SharedRecommendation | null,
  enabled: boolean
): {
  view: ResearchIntelligenceView;
  loading: boolean;
  error: string | null;
  retry: () => void;
  dataTransparency: DataTransparency | null;
  researchConfidence: ResearchConfidence | null;
} {
  const [bundleSymbol, setBundleSymbol] = useState<string | null>(null);
  const [research, setResearch] = useState<
    Awaited<ReturnType<typeof loadDrawerResearchBundle>>
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !symbol) {
      setResearch(null);
      setBundleSymbol(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const upper = symbol.toUpperCase();
    setLoading(true);
    setError(null);

    void loadDrawerResearchBundle(upper)
      .then((bundle) => {
        if (cancelled) return;
        setResearch(bundle);
        setBundleSymbol(upper);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResearch(null);
        setBundleSymbol(upper);
        setLoading(false);
        setError("Research summaries could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, enabled, retryToken]);

  const linkedEvents = useMemo(() => {
    if (!enabled || !symbol) return [];
    const today = toDateKey(new Date());
    const catalog = buildEventSeedCatalog(today);
    return linkEventsToSymbol(catalog, symbol, {
      today,
      upcomingOnly: true,
      sector: null,
    });
  }, [symbol, enabled]);

  const view = useMemo(() => {
    if (!enabled || !symbol) {
      return buildEmptyResearchIntelligenceView(symbol || "—", shared);
    }

    const ready =
      bundleSymbol === symbol.toUpperCase() && research != null
        ? research
        : null;

    return buildResearchIntelligenceView({
      symbol,
      research: ready?.research ?? null,
      intelligence: ready?.intelligence ?? null,
      shared,
      linkedEvents,
    });
  }, [enabled, symbol, shared, linkedEvents, research, bundleSymbol]);

  const dataTransparency =
    bundleSymbol === symbol.toUpperCase()
      ? research?.intelligence?.dataTransparency ?? null
      : null;
  const researchConfidence =
    bundleSymbol === symbol.toUpperCase()
      ? research?.intelligence?.researchConfidence ?? null
      : null;

  return {
    view,
    loading,
    error,
    retry,
    dataTransparency,
    researchConfidence,
  };
}
