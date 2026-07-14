"use client";

import { type ReactNode } from "react";
import type {
  InstitutionalResearchDrawerView,
  ResearchCaseView,
  ResearchDriverGroup,
  ResearchRiskPanelView,
  ResearchScorecardView,
} from "@/lib/dashboard/institutional-research-presentation";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";
import { RecommendationTimeline } from "@/components/dashboard/opportunity-intelligence/RecommendationTimeline";
import {
  ContributionList,
  MetricGrid,
  TraceList,
} from "@/components/dashboard/opportunity-intelligence/MetricBlocks";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      {children}
    </section>
  );
}

function ChipRow({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded border border-surface-border-subtle bg-surface-hover/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-secondary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ProgressBar({
  label,
  value,
  tone = "accent",
}: {
  label: string;
  value: number | null;
  tone?: "accent" | "gain" | "loss";
}) {
  const pct =
    value != null && Number.isFinite(value)
      ? Math.max(0, Math.min(100, Math.round(value)))
      : null;
  const bar =
    tone === "gain"
      ? "bg-gain"
      : tone === "loss"
        ? "bg-loss"
        : "bg-accent";

  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] text-text-faint">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {pct == null || pct === 0 ? "N/A" : `${pct}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${pct == null || pct === 0 ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

function RadarScoreLayout({ scorecard }: { scorecard: ResearchScorecardView }) {
  return (
    <div className="space-y-2">
      <MetricGrid
        items={[
          { label: "AI Conviction", value: scorecard.aiConviction },
          { label: "Validation Score", value: scorecard.validationScore },
          { label: "Trust Score", value: scorecard.trustScore },
          { label: "Quality Score", value: scorecard.qualityScore },
          { label: "Risk Score", value: scorecard.riskScore },
          { label: "Execution Score", value: scorecard.executionScore },
          { label: "Overall Grade", value: scorecard.overallGrade },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {scorecard.radar.map((row) => (
          <ProgressBar key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function CaseCard({
  title,
  view,
  tone,
}: {
  title: string;
  view: ResearchCaseView;
  tone: "gain" | "loss";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tone === "gain"
          ? "border-gain/25 bg-gain/5"
          : "border-loss/25 bg-loss/5"
      }`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <div className="mb-2 flex gap-3 text-[11px]">
        <span>
          Probability{" "}
          <span className="font-mono font-medium text-text-primary">
            {view.probability}
          </span>
        </span>
        <span>
          Expected{" "}
          <span
            className={`font-mono font-medium ${
              tone === "gain" ? "text-gain" : "text-loss"
            }`}
          >
            {view.expectedMove}
          </span>
        </span>
      </div>
      <TraceList
        title={tone === "gain" ? "Supporting Evidence" : "Failure Reasons"}
        lines={view.evidence}
      />
      <div className="mt-2">
        <ChipRow items={view.catalystsOrRisks} />
      </div>
    </div>
  );
}

function DriverGroups({ groups }: { groups: ResearchDriverGroup[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group) =>
        group.rows.length > 0 ? (
          <ContributionList
            key={group.title}
            title={group.title}
            rows={group.rows}
            positive={!/risk|negative|bear/i.test(group.title)}
          />
        ) : (
          <div key={group.title}>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-faint">
              {group.title}
            </p>
            <p className="text-[11px] text-text-muted">{group.emptyLabel}</p>
          </div>
        )
      )}
    </div>
  );
}

function RiskPanel({ risk }: { risk: ResearchRiskPanelView }) {
  return (
    <div className="space-y-2">
      <MetricGrid
        items={[
          { label: "Execution Risk", value: risk.executionRisk },
          { label: "Liquidity Risk", value: risk.liquidityRisk },
          { label: "Volatility", value: risk.volatility },
          { label: "Gap Risk", value: risk.gapRisk },
          { label: "Event Risk", value: risk.eventRisk },
          { label: "Sector Risk", value: risk.sectorRisk },
          { label: "Overall Risk Grade", value: risk.overallRiskGrade },
        ]}
      />
      <ChipRow items={risk.chips} />
    </div>
  );
}

function NextReviewNote({
  events,
}: {
  events: InstitutionalResearchDrawerView["catalystTimeline"];
}) {
  const next = events.find((e) => e.id === "next_review");
  if (!next) return null;
  return (
    <p className="text-[11px] text-text-muted">
      Next Review: Awaiting Validation
    </p>
  );
}

export function InstitutionalResearchPanelContent({
  research,
}: {
  research: InstitutionalResearchDrawerView;
}) {
  return (
    <div className="space-y-5" data-testid="institutional-research-panel">
      <Section title="Executive Summary">
        <p className="text-[12px] leading-relaxed text-text-secondary">
          {research.executiveSummary}
        </p>
        <div className="mt-2">
          <InstitutionalTrustBadges badges={research.badges} />
        </div>
        <div className="mt-2">
          <ChipRow items={research.catalystChips} />
        </div>
      </Section>

      <Section title="Investment Thesis">
        <MetricGrid
          items={[
            {
              label: "Business Summary",
              value: research.investmentThesis.businessSummary,
            },
            {
              label: "Current Opportunity",
              value: research.investmentThesis.currentOpportunity,
            },
            {
              label: "Expected Edge",
              value: research.investmentThesis.expectedEdge,
            },
            {
              label: "Market Context",
              value: research.investmentThesis.marketContext,
            },
            {
              label: "AI Summary",
              value: research.investmentThesis.aiSummary,
            },
          ]}
        />
        <TraceList
          title="Primary Drivers"
          lines={research.investmentThesis.primaryDrivers}
        />
        <TraceList
          title="Secondary Drivers"
          lines={
            research.investmentThesis.secondaryDrivers.length > 0
              ? research.investmentThesis.secondaryDrivers
              : ["Insufficient Evidence"]
          }
        />
      </Section>

      <Section title="Why This Stock">
        <DriverGroups groups={research.whyThisStock} />
      </Section>

      <Section title="Why Not Other Stocks">
        <TraceList
          title="Rejected Candidates / Filters"
          lines={research.whyNotOthers.rejectedCandidates}
        />
        <TraceList title="Reasons" lines={research.whyNotOthers.reasons} />
        <div className="flex flex-wrap gap-1">
          {research.whyNotOthers.categories.map((cat) => (
            <span
              key={cat.label}
              className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                cat.matched
                  ? "border-loss/30 bg-loss/10 text-loss"
                  : "border-surface-border-subtle text-text-faint"
              }`}
            >
              {cat.label}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Bull Case / Bear Case">
        <div className="grid gap-2 sm:grid-cols-2">
          <CaseCard title="Bull Case" view={research.bullCase} tone="gain" />
          <CaseCard title="Bear Case" view={research.bearCase} tone="loss" />
        </div>
      </Section>

      <Section title="Risk Factors">
        <RiskPanel risk={research.riskPanel} />
        <ContributionList
          title="Risk Factor Contributions"
          rows={research.confidenceBreakdown.drivers.filter((d) => d.contribution < 0)}
          positive={false}
        />
      </Section>

      <Section title="Catalyst Timeline">
        <RecommendationTimeline
          events={research.catalystTimeline.filter(
            (e) => e.available || e.id === "next_review"
          )}
        />
        <NextReviewNote events={research.catalystTimeline} />
      </Section>

      <Section title="Recommendation Timeline">
        <RecommendationTimeline events={research.recommendationTimeline} />
      </Section>

      <Section title="Confidence Timeline">
        <RecommendationTimeline events={research.confidenceTimeline} />
      </Section>

      <Section title="Historical Similarity">
        {research.historicalSimilarity.empty ? (
          <p className="text-[11px] text-text-muted">
            {research.historicalSimilarity.emptyMessage}
          </p>
        ) : (
          <>
            <TraceList
              title="Similar Historical Setups"
              lines={research.historicalSimilarity.similarSetups}
            />
            <MetricGrid
              items={[
                {
                  label: "Average Outcome",
                  value: research.historicalSimilarity.averageOutcome,
                },
                {
                  label: "Win Rate",
                  value: research.historicalSimilarity.winRate,
                },
                {
                  label: "Avg Holding Period",
                  value: research.historicalSimilarity.averageHoldingPeriod,
                },
                {
                  label: "Average Return",
                  value: research.historicalSimilarity.averageReturn,
                },
              ]}
            />
          </>
        )}
      </Section>

      <Section title="Sector Contribution">
        <p className="font-mono text-sm text-text-primary">
          {research.sectorContribution}
        </p>
      </Section>

      <Section title="Institutional Scorecard">
        <RadarScoreLayout scorecard={research.scorecard} />
      </Section>

      <Section title="Confidence Breakdown">
        <MetricGrid
          items={[
            {
              label: "Confidence",
              value: research.confidenceBreakdown.confidence,
            },
            {
              label: "Supporting Weight",
              value: research.confidenceBreakdown.supportingWeight,
              tone: "text-gain",
            },
            {
              label: "Negative Weight",
              value: research.confidenceBreakdown.negativeWeight,
              tone: "text-loss",
            },
            {
              label: "Net Score",
              value: research.confidenceBreakdown.netScore,
            },
          ]}
        />
        <ContributionList
          title="Driver Contributions"
          rows={research.confidenceBreakdown.drivers}
          positive={false}
        />
      </Section>
    </div>
  );
}
