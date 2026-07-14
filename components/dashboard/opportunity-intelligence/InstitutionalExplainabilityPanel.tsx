"use client";

import { useMemo } from "react";
import { GitBranch } from "lucide-react";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import { buildExplainabilityPanelView } from "@/lib/dashboard/institutional-exposure";
import { InstitutionalPanelSkeleton } from "@/components/dashboard/opportunity-intelligence/InstitutionalPanelSkeleton";
import { TraceList } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";

export function InstitutionalExplainabilityPanel({
  snapshot,
  candidate = null,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
}) {
  const view = useMemo(
    () => buildExplainabilityPanelView(snapshot, candidate),
    [snapshot, candidate]
  );

  if (!snapshot) {
    return (
      <InstitutionalPanelSkeleton title="Loading explainability…" cells={4} />
    );
  }

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="institutional-explainability-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">
            Explainability Panel
          </p>
        </div>
        <div className="text-[10px] text-text-faint">
          Health {view.healthScore} · Updated {view.lastRunAt}
        </div>
      </div>

      {view.empty ? (
        <p className="text-[11px] text-text-muted">{view.emptyMessage}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <TraceList title="Decision Trace" lines={view.decisionTrace} />
          <TraceList title="Rule Execution Order" lines={view.ruleExecutionOrder} />
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Rule Contribution
            </p>
            <p className="font-mono text-xs text-text-primary">
              {view.ruleContribution}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Confidence Breakdown
            </p>
            <ul className="space-y-1 text-[11px] text-text-secondary">
              {view.confidenceBreakdown.map((row) => (
                <li key={row.label} className="flex justify-between gap-2">
                  <span>{row.label}</span>
                  <span className="font-mono tabular-nums">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <TraceList title="Positive Drivers" lines={view.positiveDrivers} />
          <TraceList title="Negative Drivers" lines={view.negativeDrivers} />
          <TraceList title="Decision Timeline" lines={view.decisionTimeline} />
          <TraceList title="Failure Reasons" lines={view.failureReasons} />
          <TraceList title="Skipped Rules" lines={view.skippedRules} />
          <TraceList title="Dependency Graph" lines={view.dependencyGraph} />
        </div>
      )}
    </div>
  );
}
