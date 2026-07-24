"use client";

/**
 * SSR: persisted institutional slots + OE status peek only.
 * After hydration: idle-kick one background OE scan (debounced server-side).
 * One delayed status refresh when empty — never a poll loop / never blocks shell.
 * Sprint 9A.1 — projects seven strategy cards from the master pool (no extra scans).
 */

import { AiOpportunitiesWidget } from "@/components/dashboard/widgets/DashboardWidgets";
import type {
  InstitutionalStrategySlot,
  SharedRecommendation,
} from "@/lib/recommendations";
import { rankInstitutionalSlotsFromRecommendations } from "@/lib/recommendations";
import {
  deriveOpportunityUiPhase,
  type OpportunityStatusSnapshot,
  type OpportunityUiPhase,
} from "@/lib/opportunity-engine/ui-phase";
import { useEffect, useState } from "react";

async function fetchDashboardRefresh(): Promise<{
  slots: InstitutionalStrategySlot[] | null;
  recommendations: SharedRecommendation[];
  status: OpportunityStatusSnapshot | null;
}> {
  const [recsRes, statusRes] = await Promise.all([
    fetch("/api/recommendations", { cache: "no-store" }),
    fetch("/api/opportunities/scan", { cache: "no-store" }),
  ]);

  let recommendations: SharedRecommendation[] = [];
  let slots: InstitutionalStrategySlot[] | null = null;

  if (recsRes.ok) {
    const json = (await recsRes.json()) as {
      recommendations?: SharedRecommendation[];
      strategyDashboard?: InstitutionalStrategySlot[];
    };
    recommendations = json.recommendations ?? [];
    if (Array.isArray(json.strategyDashboard)) {
      slots = json.strategyDashboard;
    }
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

  return { slots, recommendations, status };
}

function kickBackgroundScan(): void {
  void fetch("/api/opportunities/scan?async=1", { method: "POST" }).catch(
    () => undefined
  );
}

function filledCount(slots: InstitutionalStrategySlot[]): number {
  return slots.filter((slot) => slot.pick != null).length;
}

export function HydratedAiOpportunities({
  initialSlots,
  initialStatus,
}: {
  initialSlots: InstitutionalStrategySlot[];
  initialStatus: OpportunityStatusSnapshot;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [status, setStatus] = useState<OpportunityStatusSnapshot>(() => ({
    ...initialStatus,
    recommendationCount: filledCount(initialSlots),
  }));
  const initialFilled = filledCount(initialSlots);
  const initialScanKey = `${initialStatus.scanCount}:${initialStatus.lastScannedAt ?? ""}`;

  useEffect(() => {
    setSlots(initialSlots);
    setStatus({
      isScanning: initialStatus.isScanning,
      lastScannedAt: initialStatus.lastScannedAt,
      scanCount: initialStatus.scanCount,
      recommendationCount: filledCount(initialSlots),
      lastError: initialStatus.lastError ?? null,
      scanQueued: false,
    });
  }, [
    initialSlots,
    initialStatus.isScanning,
    initialStatus.lastScannedAt,
    initialStatus.scanCount,
    initialStatus.lastError,
  ]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const initiallyEmpty = initialFilled === 0;

    const run = () => {
      // Single master scan kick — never one-per-strategy.
      kickBackgroundScan();

      if (!initiallyEmpty) return;

      setStatus((prev) => ({
        ...prev,
        scanQueued: prev.isScanning ? false : true,
      }));

      // Single delayed refresh — not polling during initial load.
      refreshTimer = setTimeout(() => {
        void fetchDashboardRefresh().then(
          ({ slots: nextSlots, recommendations, status: nextStatus }) => {
            if (cancelled) return;

            if (nextSlots) {
              setSlots(nextSlots);
            } else if (recommendations.length > 0) {
              setSlots(
                rankInstitutionalSlotsFromRecommendations(
                  recommendations,
                  nextStatus?.lastScannedAt ??
                    recommendations[0]?.timestamp ??
                    new Date(0).toISOString()
                )
              );
            }

            if (nextStatus) {
              setStatus({
                ...nextStatus,
                scanQueued: false,
                recommendationCount:
                  nextSlots != null
                    ? filledCount(nextSlots)
                    : recommendations.length > 0
                      ? recommendations.length
                      : nextStatus.recommendationCount,
              });
            } else {
              setStatus((prev) => ({
                ...prev,
                scanQueued: false,
                recommendationCount:
                  nextSlots != null
                    ? filledCount(nextSlots)
                    : recommendations.length,
              }));
            }
          }
        );
      }, 8_000);
    };

    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(run, { timeout: 2_500 })
        : null;
    const fallback = window.setTimeout(run, idle == null ? 0 : 2_500);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      if (idle != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idle);
      }
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [initialFilled, initialScanKey]);

  const phase: OpportunityUiPhase = deriveOpportunityUiPhase({
    ...status,
    recommendationCount: filledCount(slots),
  });

  return <AiOpportunitiesWidget slots={slots} phase={phase} />;
}
