"use client";

/**
 * SSR: persisted institutional slots + OE status peek only.
 * On mount: immediately fetch GET /api/recommendations and upgrade slots
 * when the API has more populated picks than current React state.
 * Never wipe populated client picks with an empty SSR initialSlots.
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

async function fetchRecommendations(): Promise<{
  strategyDashboard: InstitutionalStrategySlot[] | null;
  recommendations: SharedRecommendation[];
  status: OpportunityStatusSnapshot | null;
  freshness: RecommendationFreshness | null;
}> {
  const [recsRes, statusRes] = await Promise.all([
    fetch("/api/recommendations", { cache: "no-store" }),
    fetch("/api/opportunities/scan", { cache: "no-store" }),
  ]);

  let recommendations: SharedRecommendation[] = [];
  let strategyDashboard: InstitutionalStrategySlot[] | null = null;
  let freshness: RecommendationFreshness | null = null;

  if (recsRes.ok) {
    const json = (await recsRes.json()) as {
      recommendations?: SharedRecommendation[];
      strategyDashboard?: InstitutionalStrategySlot[];
      freshness?: RecommendationFreshness;
      generatedAt?: string | null;
      marketDate?: string | null;
      stale?: boolean;
      staleReason?: string | null;
    };
    recommendations = json.recommendations ?? [];
    if (Array.isArray(json.strategyDashboard)) {
      strategyDashboard = json.strategyDashboard;
    }
    freshness =
      json.freshness ??
      (json.generatedAt || json.stale
        ? {
            generatedAt: json.generatedAt ?? null,
            marketDate: json.marketDate ?? null,
            stale: Boolean(json.stale),
            staleReason: json.staleReason ?? null,
            displayMessage: null,
            hasRecommendations: recommendations.length > 0,
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

  return { strategyDashboard, recommendations, status, freshness };
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
}: {
  initialSlots: InstitutionalStrategySlot[];
  initialStatus: OpportunityStatusSnapshot;
  initialFreshness?: RecommendationFreshness | null;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [freshness, setFreshness] = useState<RecommendationFreshness | null>(
    initialFreshness
  );
  const [status, setStatus] = useState<OpportunityStatusSnapshot>(() => ({
    ...initialStatus,
    recommendationCount: filledSlotCount(initialSlots),
  }));
  const initialScanKey = `${initialStatus.scanCount}:${initialStatus.lastScannedAt ?? ""}`;

  // Sync SSR props — never replace populated client picks with empty SSR slots.
  useEffect(() => {
    let keptPopulatedClientSlots = false;
    setSlots((current) => {
      if (
        filledSlotCount(initialSlots) === 0 &&
        filledSlotCount(current) > 0
      ) {
        keptPopulatedClientSlots = true;
        return current;
      }
      return initialSlots;
    });
    setFreshness(initialFreshness);
    setStatus((prev) => ({
      isScanning: initialStatus.isScanning,
      lastScannedAt: initialStatus.lastScannedAt,
      scanCount: initialStatus.scanCount,
      recommendationCount: keptPopulatedClientSlots
        ? Math.max(prev.recommendationCount, filledSlotCount(initialSlots))
        : filledSlotCount(initialSlots),
      lastError: initialStatus.lastError ?? null,
      scanQueued: false,
    }));
  }, [
    initialSlots,
    initialFreshness,
    initialStatus.isScanning,
    initialStatus.lastScannedAt,
    initialStatus.scanCount,
    initialStatus.lastError,
  ]);

  // On mount / scan-key change: immediately fetch recommendations (no idle / 8s wait).
  useEffect(() => {
    let cancelled = false;

    kickBackgroundScan();

    void fetchRecommendations().then(
      ({ strategyDashboard, status: nextStatus, freshness: nextFreshness }) => {
        if (cancelled) return;

        if (nextFreshness) setFreshness(nextFreshness);

        const apiFilled = filledSlotCount(strategyDashboard);
        if (strategyDashboard && apiFilled > 0) {
          setSlots((current) => {
            const currentFilled = filledSlotCount(current);
            if (apiFilled > currentFilled) {
              return strategyDashboard;
            }
            return current;
          });
        }

        if (nextStatus) {
          setStatus((prev) => ({
            ...nextStatus,
            scanQueued: false,
            recommendationCount: Math.max(
              apiFilled,
              prev.recommendationCount,
              nextStatus.recommendationCount
            ),
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
    recommendationCount: filledSlotCount(slots),
  });

  return (
    <AiOpportunitiesWidget
      slots={slots}
      phase={phase}
      freshness={freshness}
    />
  );
}
