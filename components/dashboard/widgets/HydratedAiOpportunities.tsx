"use client";

/**
 * Hydrates AI Opportunities from /api/recommendations when OE store is empty.
 * API kicks ensureOpportunityEngineState (non-blocking scan) server-side.
 */

import { AiOpportunitiesWidget } from "@/components/dashboard/widgets/DashboardWidgets";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import type { SharedRecommendation } from "@/lib/recommendations";
import { useEffect, useState } from "react";

export function HydratedAiOpportunities({
  initial,
}: {
  initial: SharedRecommendation[];
}) {
  const [recommendations, setRecommendations] = useState(initial);
  const [loading, setLoading] = useState(initial.length === 0);

  useEffect(() => {
    setRecommendations(initial);
    if (initial.length > 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetch("/api/recommendations", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { recommendations?: SharedRecommendation[] };
      })
      .then((json) => {
        if (cancelled) return;
        const next = json?.recommendations ?? [];
        if (next.length > 0) setRecommendations(next);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  if (loading && recommendations.length === 0) {
    return <WidgetSkeleton label="AI Opportunities" className="h-72" />;
  }

  return <AiOpportunitiesWidget recommendations={recommendations} />;
}
