"use client";

/**
 * SSR: persisted institutional slots + OE status peek only.
 * On mount: immediately fetch GET /api/recommendations.
 * Banner state uses publishedRecommendations only.
 * Strategy cards use strategyDashboard only.
 */

import { AiOpportunitiesWidget } from "@/components/dashboard/widgets/DashboardWidgets";
import type {
  InstitutionalStrategySlot,
  SharedRecommendation,
} from "@/lib/recommendations";
import { filledSlotCount } from "@/lib/recommendations";
import {
  deriveOpportunityUiPhase,
  type OpportunityStatusSnapshot,
  type OpportunityUiPhase,
} from "@/lib/opportunity-engine/ui-phase";
import type { RecommendationFreshness } from "@/lib/opportunity-engine/recommendation-freshness";
import { useEffect, useState } from "react";

export interface PublishedMeta {
  sessionId: string | null;
  scanId: string | null;
  generatedAt: string | null;
  recommendationVersion: string | null;
}

async function fetchRecommendations(): Promise<{
  strategyDashboard: InstitutionalStrategySlot[] | null;
  publishedRecommendations: SharedRecommendation[];
  publishedMeta: PublishedMeta;
  status: OpportunityStatusSnapshot | null;
  freshness: RecommendationFreshness | null;
}> {
  const [recsRes, statusRes] = await Promise.all([
    fetch("/api/recommendations", { cache: "no-store" }),
    fetch("/api/opportunities/scan", { cache: "no-store" }),
  ]);

  let publishedRecommendations: SharedRecommendation[] = [];
  let strategyDashboard: InstitutionalStrategySlot[] | null = null;
  let freshness: RecommendationFreshness | null = null;
  let publishedMeta: PublishedMeta = {
    sessionId: null,
    scanId: null,
    generatedAt: null,
    recommendationVersion: null,
  };

  if (recsRes.ok) {
    const json = (await recsRes.json()) as {
      recommendations?: SharedRecommendation[];
      strategyDashboard?: InstitutionalStrategySlot[];
      published?: {
        sessionId?: string;
        scanId?: string;
        generatedAt?: string;
        recommendationVersion?: string;
      } | null;
      freshness?: RecommendationFreshness;
      generatedAt?: string | null;
      marketDate?: string | null;
      stale?: boolean;
      staleReason?: string | null;
    };
    publishedRecommendations = json.recommendations ?? [];
    if (Array.isArray(json.strategyDashboard)) {
      strategyDashboard = json.strategyDashboard;
    }
    publishedMeta = {
      sessionId: json.published?.sessionId ?? null,
      scanId: json.published?.scanId ?? null,
      generatedAt:
        json.published?.generatedAt ?? json.generatedAt ?? null,
      recommendationVersion: json.published?.recommendationVersion ?? null,
    };
    freshness =
      json.freshness ??
      (json.generatedAt || json.stale
        ? {
            generatedAt: json.generatedAt ?? null,
            marketDate: json.marketDate ?? null,
            stale: Boolean(json.stale),
            staleReason: json.staleReason ?? null,
            displayMessage: null,
            hasRecommendations: publishedRecommendations.length > 0,
          }
        : null);
  }

  let status: OpportunityStatusSnapshot | null = null;
  if (statusRes.ok) {
    const json = (await statusRes.json()) as {
      isScanning?: boolean;
      lastScannedAt?: string | null;
      scanCount?: number;
      recommendationCount?: number;
      lastError?: string | null;
    };
    status = {
      isScanning: Boolean(json.isScanning),
      lastScannedAt: json.lastScannedAt ?? null,
      scanCount: json.scanCount ?? 0,
      recommendationCount: json.recommendationCount ?? 0,
      lastError: json.lastError ?? null,
    };
  }

  return {
    strategyDashboard,
    publishedRecommendations,
    publishedMeta,
    status,
    freshness,
  };
}

function kickBackgroundScan(): void {
  void fetch("/api/opportunities/scan?async=1", { method: "POST" }).catch(
    () => undefined
  );
}

export function HydratedAiOpportunities({
  initialSlots,
  initialStatus,
  initialFreshness = null,
  initialPublishedRecommendations = [],
  initialPublishedMeta = null,
}: {
  initialSlots: InstitutionalStrategySlot[];
  initialStatus: OpportunityStatusSnapshot;
  initialFreshness?: RecommendationFreshness | null;
  initialPublishedRecommendations?: SharedRecommendation[];
  initialPublishedMeta?: PublishedMeta | null;
}) {
  const [strategyDashboard, setStrategyDashboard] = useState(initialSlots);
  const [publishedRecommendations, setPublishedRecommendations] = useState(
    initialPublishedRecommendations
  );
  const [publishedMeta, setPublishedMeta] = useState<PublishedMeta>(
    () =>
      initialPublishedMeta ?? {
        sessionId: null,
        scanId: null,
        generatedAt: initialFreshness?.generatedAt ?? null,
        recommendationVersion: null,
      }
  );
  const [freshness, setFreshness] = useState<RecommendationFreshness | null>(
    initialFreshness
  );
  const [status, setStatus] = useState<OpportunityStatusSnapshot>(() => ({
    ...initialStatus,
    recommendationCount: initialPublishedRecommendations.length,
  }));
  const initialScanKey = `${initialStatus.scanCount}:${initialStatus.lastScannedAt ?? ""}`;

  // Sync SSR props — never replace populated client dashboard with empty SSR slots.
  useEffect(() => {
    setStrategyDashboard((current) => {
      if (
        filledSlotCount(initialSlots) === 0 &&
        filledSlotCount(current) > 0
      ) {
        return current;
      }
      return initialSlots;
    });
    if (initialPublishedRecommendations.length > 0) {
      setPublishedRecommendations(initialPublishedRecommendations);
    }
    if (initialPublishedMeta) {
      setPublishedMeta(initialPublishedMeta);
    }
    setFreshness(initialFreshness);
    setStatus({
      isScanning: initialStatus.isScanning,
      lastScannedAt: initialStatus.lastScannedAt,
      scanCount: initialStatus.scanCount,
      recommendationCount: Math.max(
        initialPublishedRecommendations.length,
        initialStatus.recommendationCount
      ),
      lastError: initialStatus.lastError ?? null,
      scanQueued: false,
    });
  }, [
    initialSlots,
    initialFreshness,
    initialPublishedRecommendations,
    initialPublishedMeta,
    initialStatus.isScanning,
    initialStatus.lastScannedAt,
    initialStatus.scanCount,
    initialStatus.recommendationCount,
    initialStatus.lastError,
  ]);

  // On mount / scan-key change: fetch published recommendations + dashboard.
  useEffect(() => {
    let cancelled = false;

    kickBackgroundScan();

    void fetchRecommendations().then(
      ({
        strategyDashboard: nextDashboard,
        publishedRecommendations: nextPublished,
        publishedMeta: nextMeta,
        status: nextStatus,
        freshness: nextFreshness,
      }) => {
        if (cancelled) return;

        if (nextFreshness) setFreshness(nextFreshness);
        setPublishedRecommendations(nextPublished);
        setPublishedMeta(nextMeta);

        if (nextDashboard) {
          setStrategyDashboard((current) => {
            // Prefer API dashboard when it has more picks; otherwise keep current.
            if (
              filledSlotCount(nextDashboard) >= filledSlotCount(current)
            ) {
              return nextDashboard;
            }
            return current;
          });
        }

        if (nextStatus) {
          setStatus({
            ...nextStatus,
            scanQueued: false,
            recommendationCount: nextPublished.length,
          });
        } else {
          setStatus((prev) => ({
            ...prev,
            recommendationCount: nextPublished.length,
          }));
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [initialScanKey]);

  const phase: OpportunityUiPhase = deriveOpportunityUiPhase({
    ...status,
    recommendationCount: publishedRecommendations.length,
  });

  return (
    <AiOpportunitiesWidget
      slots={strategyDashboard}
      publishedRecommendations={publishedRecommendations}
      publishedMeta={publishedMeta}
      phase={phase}
      freshness={freshness}
    />
  );
}
