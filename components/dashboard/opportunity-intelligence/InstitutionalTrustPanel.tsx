"use client";

import { useMemo } from "react";
import { Shield } from "lucide-react";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import { buildTrustPanelView } from "@/lib/dashboard/institutional-exposure";
import { InstitutionalMetricCell } from "@/components/dashboard/opportunity-intelligence/InstitutionalMetricCell";
import { InstitutionalPanelSkeleton } from "@/components/dashboard/opportunity-intelligence/InstitutionalPanelSkeleton";

export function InstitutionalTrustPanel({
  snapshot,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  const view = useMemo(() => buildTrustPanelView(snapshot), [snapshot]);

  if (!snapshot) {
    return <InstitutionalPanelSkeleton title="Loading trust metrics…" cells={4} />;
  }

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="institutional-trust-panel"
    >
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs font-semibold text-text-primary">Trust Panel</p>
      </div>

      {view.empty ? (
        <p className="text-[11px] text-text-muted">{view.emptyMessage}</p>
      ) : null}

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <InstitutionalMetricCell metric={view.overallTrustScore} />
        <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            Trust Grade
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {view.trustGrade}
          </p>
          <p className="mt-1 text-[9px] text-text-faint">
            Trend {view.trustTrendLabel} · Confidence {view.confidenceLevel}
          </p>
          <p className="text-[9px] text-text-faint">
            Historical Trust {view.historicalTrust}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FactorList title="Trust Factors" rows={view.trustFactors.map((f) => `${f.label}: ${f.value}`)} />
        <FactorList title="Positive Drivers" rows={view.positiveDrivers} tone="gain" />
        <FactorList title="Negative Drivers" rows={view.negativeDrivers} tone="loss" />
      </div>
    </div>
  );
}

function FactorList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: string[];
  tone?: "gain" | "loss";
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <ul className="max-h-32 space-y-1 overflow-y-auto text-[11px] text-text-secondary">
        {rows.map((row) => (
          <li
            key={row}
            className={
              tone === "gain"
                ? "text-gain"
                : tone === "loss"
                  ? "text-loss"
                  : undefined
            }
          >
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
}
