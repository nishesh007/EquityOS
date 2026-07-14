"use client";

import type { ConfidenceHistoryView } from "@/lib/dashboard/institutional-history-presentation";
import { formatOptionalTimestamp } from "@/lib/dashboard/display-value";
import { MetricGrid } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";

function barWidth(value: number | null): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ConfidenceHistoryChart({
  history,
}: {
  history: ConfidenceHistoryView;
}) {
  if (history.empty || history.points.length === 0) {
    return (
      <p className="text-[11px] text-text-muted" data-testid="confidence-history-empty">
        {history.emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="confidence-history-chart">
      <MetricGrid
        items={[
          { label: "Confidence Trend", value: history.confidenceTrend },
          { label: "Validation Trend", value: history.validationTrend },
          { label: "Trust Trend", value: history.trustTrend },
          { label: "Composite Trend", value: history.compositeTrend },
          { label: "Grade Trend", value: history.gradeTrend },
        ]}
      />

      <div className="space-y-2">
        {history.points.map((point) => (
          <div
            key={point.id}
            className="rounded-md border border-surface-border-subtle/60 bg-surface-hover/20 px-2.5 py-2"
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-text-primary">
                {point.label}
              </p>
              <p className="font-mono text-[10px] text-text-faint">
                {formatOptionalTimestamp(point.at, "Awaiting Validation")} ·{" "}
                {point.status} · Grade {point.institutionalGrade}
              </p>
            </div>
            <ScoreBar label="Confidence" value={point.confidence} tone="accent" />
            <ScoreBar label="Validation" value={point.validation} tone="gain" />
            <ScoreBar label="Trust" value={point.trust} tone="accent" />
            <ScoreBar label="Composite" value={point.composite} tone="gain" />
          </div>
        ))}
      </div>

      {history.statusChanges.length > 0 ? (
        <ul className="space-y-1 text-[11px] text-text-muted">
          {history.statusChanges.map((line) => (
            <li key={line}>› {line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "accent" | "gain";
}) {
  const width = barWidth(value);
  const display =
    value == null || !Number.isFinite(value) || value === 0 ? "N/A" : String(Math.round(value));
  return (
    <div className="mb-1">
      <div className="mb-0.5 flex justify-between text-[9px] text-text-faint">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            tone === "gain" ? "bg-gain" : "bg-accent"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
