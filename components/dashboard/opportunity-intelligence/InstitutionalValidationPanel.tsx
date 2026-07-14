"use client";

import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import { MetricGrid } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";
import { ShieldCheck } from "lucide-react";

function pct(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value)}`;
}

export function InstitutionalValidationPanel({
  snapshot,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  if (!snapshot) return null;

  const items = [
    {
      label: "Overall Validation",
      value: pct(
        snapshot.dashboard?.health.overallHealthScore ??
          snapshot.platform?.overallHealthScore
      ),
    },
    {
      label: "Historical Validation",
      value: pct(snapshot.dashboard?.summary.historicalPerformanceScore),
    },
    {
      label: "Rule Validation",
      value: pct(snapshot.dashboard?.health.ruleEngineHealth),
    },
    {
      label: "Data Integrity",
      value: pct(snapshot.dashboard?.summary.averageIntegrityScore),
    },
    {
      label: "Confidence Validation",
      value: pct(snapshot.explainability?.confidenceCoverage),
    },
    {
      label: "Pipeline Health",
      value: pct(snapshot.dashboard?.health.validationEngineHealth),
    },
    {
      label: "Trust Health",
      value: pct(
        snapshot.trust?.averageTrustScore ??
          snapshot.dashboard?.health.trustEngineHealth ??
          snapshot.platform?.overallTrustScore
      ),
    },
    {
      label: "Execution Quality",
      value: pct(
        snapshot.dashboard?.summary.recommendationQuality ??
          snapshot.platform?.overallPerformance
      ),
    },
  ].filter((item) => item.value != null);

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs font-semibold text-text-primary">
          Institutional Validation (Sprint 9F)
        </p>
        {snapshot.platform?.overallValidationStatus ? (
          <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
            {snapshot.platform.overallValidationStatus}
          </span>
        ) : null}
      </div>
      <MetricGrid items={items} />
    </div>
  );
}
