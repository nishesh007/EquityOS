"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import { buildRecommendationPanelView } from "@/lib/dashboard/institutional-exposure";
import { InstitutionalPanelSkeleton } from "@/components/dashboard/opportunity-intelligence/InstitutionalPanelSkeleton";
import { TraceList } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";

export function InstitutionalRecommendationPanel({
  snapshot,
  candidate = null,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
}) {
  const view = useMemo(
    () => buildRecommendationPanelView(snapshot, candidate),
    [snapshot, candidate]
  );

  if (!snapshot && !candidate) {
    return (
      <InstitutionalPanelSkeleton title="Loading recommendation reasoning…" cells={4} />
    );
  }

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="institutional-recommendation-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">
            Recommendation Panel
          </p>
        </div>
        <p className="font-mono text-[11px] text-text-secondary">
          Quality {view.qualityScore}
        </p>
      </div>

      {view.empty ? (
        <p className="mb-2 text-[11px] text-text-muted">{view.emptyMessage}</p>
      ) : null}

      <p className="mb-3 text-sm text-text-primary">{view.recommendation}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <TraceList title="Why This Stock" lines={view.whyThisStock} />
        <TraceList title="Why Not Others" lines={view.whyNotOthers} />
        <TraceList title="Supporting Signals" lines={view.supportingSignals} />
        <TraceList title="Risk Factors" lines={view.riskFactors} />
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Expected Catalyst
          </p>
          <p className="text-[11px] text-text-secondary">{view.expectedCatalyst}</p>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Sector Contribution
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.sectorContribution}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Historical Similarity
          </p>
          <p className="text-[11px] text-text-secondary">
            {view.historicalSimilarity}
          </p>
        </div>
      </div>
    </div>
  );
}
