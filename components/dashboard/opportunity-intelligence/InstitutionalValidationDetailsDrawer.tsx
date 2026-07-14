"use client";

import { X } from "lucide-react";
import type { InstitutionalValidationDetailsView } from "@/lib/dashboard/institutional-exposure";

function Section({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) {
    return (
      <section>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
          {title}
        </p>
        <p className="text-[11px] text-text-muted">N/A</p>
      </section>
    );
  }
  return (
    <section>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <ul className="space-y-1 text-[11px] text-text-secondary">
        {lines.map((line) => (
          <li key={line} className="flex gap-1.5">
            <span className="text-accent">›</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InstitutionalValidationDetailsDrawer({
  open,
  onClose,
  details,
}: {
  open: boolean;
  onClose: () => void;
  details: InstitutionalValidationDetailsView;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      data-testid="institutional-validation-details-drawer"
    >
      <button
        type="button"
        aria-label="Close validation details"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-surface-border bg-surface-raised shadow-card">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Institutional Validation Details
            </p>
            <p className="text-[11px] text-text-muted">
              Sprint 9E / 9F exposure — existing engine outputs only
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-faint hover:bg-surface-hover hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Section title="Overall Summary" lines={details.overallSummary} />
          <Section title="Rule Execution" lines={details.ruleExecution} />
          <Section
            title="Historical Validation"
            lines={details.historicalValidation}
          />
          <Section title="Pipeline Validation" lines={details.pipelineValidation} />
          <Section title="Confidence Analysis" lines={details.confidenceAnalysis} />
          <Section title="Trust Analysis" lines={details.trustAnalysis} />
          <Section title="Execution Timeline" lines={details.executionTimeline} />
          <Section title="Validation Warnings" lines={details.warnings} />
          <Section title="Validation Errors" lines={details.errors} />
          <Section title="Recommendation" lines={details.recommendation} />
        </div>
      </aside>
    </div>
  );
}
