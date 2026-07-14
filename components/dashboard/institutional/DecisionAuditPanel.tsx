"use client";

import type { DecisionAuditView } from "@/lib/dashboard/institutional-history-presentation";
import { MetricGrid } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";

export function DecisionAuditPanel({ audit }: { audit: DecisionAuditView }) {
  if (audit.empty) {
    return (
      <p className="text-[11px] text-text-muted" data-testid="decision-audit-empty">
        {audit.emptyMessage}
      </p>
    );
  }

  return (
    <div data-testid="decision-audit-panel">
      <MetricGrid
        items={[
          { label: "Decision Time", value: audit.decisionTime },
          { label: "Decision Version", value: audit.decisionVersion },
          { label: "Recommendation Version", value: audit.recommendationVersion },
          { label: "Validation Version", value: audit.validationVersion },
          { label: "Trust Version", value: audit.trustVersion },
          { label: "AI Version", value: audit.aiVersion },
          { label: "Platform Version", value: audit.platformVersion },
          { label: "Execution ID", value: audit.executionId },
          { label: "Snapshot ID", value: audit.snapshotId },
        ]}
      />
    </div>
  );
}
