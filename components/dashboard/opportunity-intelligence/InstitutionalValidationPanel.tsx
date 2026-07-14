"use client";

import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import {
  formatScoreDisplay,
  hasValidationActivity,
} from "@/lib/dashboard/display-value";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ShieldCheck } from "lucide-react";

const OVERALL_VALIDATION_TOOLTIP =
  "Overall Validation is a weighted score calculated from Rule Validation, Pipeline Health, Data Integrity, Trust, Confidence, Historical Validation and Execution Quality.";

function MetricCell({
  label,
  value,
  info,
}: {
  label: string;
  value: string;
  info?: string;
}) {
  const isPlaceholder =
    value === "N/A" || value === "Collecting..." || value === "Unavailable";

  return (
    <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
      <div className="flex items-center gap-1">
        <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
          {label}
        </p>
        {info ? <InfoTooltip text={info} /> : null}
      </div>
      <p
        className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${
          isPlaceholder ? "text-text-muted" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function InstitutionalValidationPanel({
  snapshot,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  if (!snapshot) {
    return (
      <div className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">
            Institutional Validation (Sprint 9F)
          </p>
        </div>
        <p className="text-xs text-text-muted">Loading validation metrics…</p>
      </div>
    );
  }

  const hasActivity = hasValidationActivity({
    totalValidations: snapshot.dashboard?.summary.totalValidations,
    totalCalculations: snapshot.trust?.totalCalculations,
    decisionTraces: snapshot.explainability?.decisionTraces,
    generatedExplanations: snapshot.explainability?.generatedExplanations,
  });

  const items = [
    {
      label: "Overall Validation",
      value: formatScoreDisplay(
        snapshot.dashboard?.health.overallHealthScore ??
          snapshot.platform?.overallHealthScore,
        { hasActivity }
      ),
      info: OVERALL_VALIDATION_TOOLTIP,
    },
    {
      label: "Historical Validation",
      value: formatScoreDisplay(
        snapshot.dashboard?.summary.historicalPerformanceScore,
        { hasActivity }
      ),
    },
    {
      label: "Rule Validation",
      value: formatScoreDisplay(snapshot.dashboard?.health.ruleEngineHealth, {
        hasActivity,
      }),
    },
    {
      label: "Data Integrity",
      value: formatScoreDisplay(snapshot.dashboard?.summary.averageIntegrityScore, {
        hasActivity,
      }),
    },
    {
      label: "Confidence",
      value: formatScoreDisplay(snapshot.explainability?.confidenceCoverage, {
        hasActivity,
      }),
    },
    {
      label: "Pipeline Health",
      value: formatScoreDisplay(
        snapshot.dashboard?.health.validationEngineHealth,
        { hasActivity }
      ),
    },
    {
      label: "Trust",
      value: formatScoreDisplay(
        snapshot.trust?.averageTrustScore ??
          snapshot.dashboard?.health.trustEngineHealth ??
          snapshot.platform?.overallTrustScore,
        { hasActivity }
      ),
    },
    {
      label: "Execution Quality",
      value: formatScoreDisplay(
        snapshot.dashboard?.summary.recommendationQuality ??
          snapshot.platform?.overallPerformance,
        { hasActivity }
      ),
    },
  ];

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <MetricCell
            key={item.label}
            label={item.label}
            value={item.value}
            info={item.info}
          />
        ))}
      </div>
    </div>
  );
}
