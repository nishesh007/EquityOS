"use client";

import {
  buildEmptyInstitutionalTrustView,
  buildInstitutionalTrustView,
  type InstitutionalTrustView,
  type TrustHistoryRecord,
  type TrustOutcomeRow,
  type TrustOutcomeSummary,
} from "@/lib/recommendations/institutional-trust-presenter";
import type { SharedRecommendation } from "@/lib/recommendations";
import type { DataTransparency, ResearchConfidence } from "@/types";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import { linkEventsToSymbol } from "@/src/core/events/integration";
import { useCallback, useEffect, useMemo, useState } from "react";

interface RecommendationsApiPayload {
  history?: TrustHistoryRecord[];
  outcomes?: {
    summary?: TrustOutcomeSummary | null;
    rows?: TrustOutcomeRow[];
  } | null;
}

export function useInstitutionalTrust(
  symbol: string,
  shared: SharedRecommendation | null,
  extras: {
    dataTransparency?: DataTransparency | null;
    researchConfidence?: ResearchConfidence | null;
  } = {},
  enabled = true
): {
  view: InstitutionalTrustView;
  loading: boolean;
  error: string | null;
  retry: () => void;
} {
  const [payload, setPayload] = useState<RecommendationsApiPayload | null>(null);
  const [payloadSymbol, setPayloadSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !symbol) {
      setPayload(null);
      setPayloadSymbol(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const upper = symbol.toUpperCase();
    setLoading(true);
    setError(null);

    void fetch("/api/recommendations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("unavailable");
        }
        return (await response.json()) as RecommendationsApiPayload;
      })
      .then((json) => {
        if (cancelled) return;
        setPayload(json);
        setPayloadSymbol(upper);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPayload(null);
        setPayloadSymbol(upper);
        setLoading(false);
        setError("Historical validation could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, enabled, retryToken]);

  const eventsLinkedCount = useMemo(() => {
    if (!enabled || !symbol) return 0;
    const today = toDateKey(new Date());
    return linkEventsToSymbol(buildEventSeedCatalog(today), symbol, {
      today,
      upcomingOnly: true,
    }).length;
  }, [symbol, enabled]);

  const view = useMemo(() => {
    if (!enabled || !symbol) {
      return buildEmptyInstitutionalTrustView(symbol || "—", shared);
    }

    const ready = payloadSymbol === symbol.toUpperCase() ? payload : null;

    return buildInstitutionalTrustView({
      symbol,
      shared,
      history: ready?.history ?? [],
      outcomeSummary: ready?.outcomes?.summary ?? null,
      outcomeRows: ready?.outcomes?.rows ?? [],
      dataTransparency: extras.dataTransparency ?? null,
      researchConfidence: extras.researchConfidence ?? null,
      eventsLinkedCount,
    });
  }, [
    enabled,
    symbol,
    shared,
    payload,
    payloadSymbol,
    extras.dataTransparency,
    extras.researchConfidence,
    eventsLinkedCount,
  ]);

  return { view, loading, error, retry };
}
