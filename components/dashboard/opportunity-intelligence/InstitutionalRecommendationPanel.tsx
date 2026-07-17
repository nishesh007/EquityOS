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
import { InstitutionalTimelinePanel } from "@/components/dashboard/institutional/InstitutionalTimelinePanel";
import { RECOMMENDATION_METRIC_LABELS } from "@/src/core/recommendations";

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
          {RECOMMENDATION_METRIC_LABELS.institutionalConviction}{" "}
          {view.institutionalConviction}
        </p>
      </div>

      {view.empty ? (
        <p className="mb-2 text-[11px] text-text-muted">{view.emptyMessage}</p>
      ) : null}

      <p className="mb-2 text-sm text-text-primary">{view.recommendation}</p>
      <p className="mb-3 text-[10px] uppercase tracking-wider text-text-faint">
        {view.strategy} · {view.expectedHoldingPeriod} · {view.statusLabel}
      </p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            {RECOMMENDATION_METRIC_LABELS.conviction}
          </p>
          <p className="font-mono text-[11px] text-text-secondary">{view.conviction}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            {RECOMMENDATION_METRIC_LABELS.trust}
          </p>
          <p className="font-mono text-[11px] text-text-secondary">{view.trust}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            {RECOMMENDATION_METRIC_LABELS.validation}
          </p>
          <p className="font-mono text-[11px] text-text-secondary">{view.validation}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 rounded-md border border-surface-border-subtle/60 bg-surface-hover/30 px-2 py-2 sm:grid-cols-3 lg:grid-cols-9">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            {RECOMMENDATION_METRIC_LABELS.originalConviction}
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.originalConviction}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            {RECOMMENDATION_METRIC_LABELS.currentHealth}
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.currentHealth}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Current Trust
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.currentTrust}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Current Validation
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.currentValidation}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Current Risk
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.currentRisk}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Lifecycle Status
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.lifecycleStatus}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Trend
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.healthTrend}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Status Badge
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.statusBadge}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Health Badge
          </p>
          <p className="font-mono text-[11px] text-text-secondary">
            {view.healthBadge}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TraceList
          title={RECOMMENDATION_METRIC_LABELS.convictionDrivers}
          lines={view.convictionDrivers}
        />
        <TraceList
          title={RECOMMENDATION_METRIC_LABELS.riskFactors}
          lines={view.riskFactors}
        />
        <TraceList title="Supporting Signals" lines={view.supportingSignals} />
        <TraceList title="Why Not Others" lines={view.whyNotOthers} />
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

      <div className="mt-3">
        <InstitutionalTimelinePanel
          view={candidate}
          snapshot={snapshot}
          compact
          title="Recommendation History"
        />
      </div>
    </div>
  );
}
