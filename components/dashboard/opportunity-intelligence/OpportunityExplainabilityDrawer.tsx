"use client";

import type { InstitutionalCandidateView } from "@/lib/opportunity-engine/institutional-presentation";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";
import { RecommendationTimeline } from "@/components/dashboard/opportunity-intelligence/RecommendationTimeline";
import {
  ContributionList,
  MetricGrid,
  TraceList,
} from "@/components/dashboard/opportunity-intelligence/MetricBlocks";
import { X } from "lucide-react";

function score(value: number | null | undefined, suffix = ""): string | null {
  if (value == null) return null;
  return `${value}${suffix}`;
}

export function OpportunityExplainabilityDrawer({
  symbol,
  company,
  view,
  open,
  onClose,
}: {
  symbol: string;
  company: string;
  view: InstitutionalCandidateView;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Close explainability drawer"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-surface-border bg-surface-raised shadow-card">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">{symbol}</p>
            <p className="text-[11px] text-text-muted">{company}</p>
            <InstitutionalTrustBadges badges={view.badges} />
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
          <section>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
              AI Conviction
            </p>
            <MetricGrid
              items={[
                { label: "Overall Score", value: score(view.overallScore) },
                { label: "Confidence", value: score(view.confidence, "%") },
                { label: "Trust Score", value: score(view.trustScore) },
                { label: "Validation Score", value: score(view.validationScore) },
                {
                  label: "Historical Validation Accuracy",
                  value: score(view.historicalValidationAccuracy),
                },
                { label: "Explainability Score", value: score(view.explainabilityScore) },
                { label: "Signal Stability", value: score(view.signalStability) },
                {
                  label: "Recommendation Quality",
                  value: score(view.recommendationQuality),
                },
                { label: "Risk Rating", value: view.riskRating },
                {
                  label: "Generated",
                  value: formatStamp(view.generatedAt),
                },
                {
                  label: "Last Updated",
                  value: formatStamp(view.lastUpdatedAt),
                },
              ]}
            />
          </section>

          <RecommendationTimeline events={view.timeline} />

          <section className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Explainability (Sprint 9E)
            </p>
            {view.primaryReasons.length > 0 ? (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-text-faint">
                  Primary Reasons
                </p>
                <ul className="space-y-1 text-[11px] text-text-muted">
                  {view.primaryReasons.map((reason) => (
                    <li key={reason}>· {reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ContributionList title="Supporting Factors" rows={view.supportingFactors} />
            <ContributionList
              title="Negative Factors"
              rows={view.negativeFactors}
              positive={false}
            />
            <MetricGrid
              items={[
                { label: "Sector Contribution", value: score(view.sectorContribution) },
                { label: "Momentum Contribution", value: score(view.momentumContribution) },
                { label: "Volume Contribution", value: score(view.volumeContribution) },
                {
                  label: "Fundamental Contribution",
                  value: score(view.fundamentalContribution),
                },
                {
                  label: "Market Regime Contribution",
                  value: score(view.marketRegimeContribution),
                },
                {
                  label: "Relative Strength Contribution",
                  value: score(view.relativeStrengthContribution),
                },
              ]}
            />
            <ContributionList
              title="Confidence Distribution"
              rows={view.confidenceDistribution}
              positive={false}
            />
            <ContributionList
              title="Rule Contributions"
              rows={view.ruleContributions}
              positive={false}
            />
            <TraceList title="Decision Trace" lines={view.decisionTrace} />
            <TraceList title="Execution Path" lines={view.executionPath} />
            <TraceList title="Validation Trace" lines={view.validationTrace} />
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Why This Stock?
            </p>
            <ContributionList title="Top Positive Drivers" rows={view.topPositiveDrivers} />
            <ContributionList
              title="Top Negative Drivers"
              rows={view.topNegativeDrivers}
              positive={false}
            />
            <ContributionList
              title="Risk Factors"
              rows={view.riskFactors}
              positive={false}
            />
            <MetricGrid
              items={[
                { label: "Expected Catalyst", value: view.expectedCatalyst },
                {
                  label: "Institutional Flow",
                  value:
                    view.institutionalFlow != null
                      ? String(view.institutionalFlow)
                      : null,
                },
                {
                  label: "Sector Strength",
                  value:
                    view.sectorStrength != null ? String(view.sectorStrength) : null,
                },
                { label: "Historical Similarity", value: view.historicalSimilarity },
              ]}
            />
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Explainability Panel
            </p>
            <TraceList title="Decision Tree" lines={view.decisionTrace} />
            <TraceList
              title="Rule Execution Order"
              lines={view.ruleContributions.map(
                (row, index) => `${index + 1}. ${row.label} (${row.contribution})`
              )}
            />
            <ContributionList
              title="Confidence Breakdown"
              rows={view.confidenceDistribution}
              positive={false}
            />
            <MetricGrid
              items={[
                { label: "Trust Breakdown", value: score(view.trustScore) },
                { label: "Validation Breakdown", value: score(view.validationScore) },
              ]}
            />
          </section>
        </div>
      </aside>
    </div>
  );
}

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
