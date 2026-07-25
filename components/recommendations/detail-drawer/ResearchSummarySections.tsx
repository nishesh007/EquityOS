"use client";

import type { ResearchIntelligenceView } from "@/lib/recommendations/research-intelligence-presenter";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import Link from "next/link";
import { DrawerEmptyState } from "./DrawerStates";
import {
  OpenAnalysisLink,
  RESEARCH_ICONS,
  ResearchSectionFrame,
  SummaryMetricGrid,
  SummaryVerdictPill,
} from "./ResearchSectionChrome";
import { SectionShell } from "./SectionChrome";

export function TechnicalSummarySection({
  view,
  loading,
}: {
  view: ResearchIntelligenceView["technical"];
  loading?: boolean;
}) {
  return (
    <ResearchSectionFrame
      index={5}
      title="Technical Summary"
      description="Trend, momentum, and key levels from the Technical Analysis engine."
      verdict={view.verdict}
      verdictTone={
        view.verdict.toLowerCase().includes("bull") ||
        view.verdict === "Strong" ||
        view.verdict === "Constructive"
          ? "positive"
          : view.verdict.toLowerCase().includes("bear") || view.verdict === "Weak"
            ? "negative"
            : "info"
      }
      explanation={view.explanation}
      openHref={view.companyHref}
      openLabel="Open Full Technical Analysis"
      loading={loading}
    >
      <SummaryMetricGrid metrics={view.metrics} />
    </ResearchSectionFrame>
  );
}

export function FundamentalSummarySection({
  view,
  loading,
}: {
  view: ResearchIntelligenceView["fundamental"];
  loading?: boolean;
}) {
  return (
    <ResearchSectionFrame
      index={6}
      title="Fundamental Summary"
      description="Financial quality highlights from the Fundamental engine."
      verdict={view.overallRating}
      verdictTone={
        view.overallScore != null && view.overallScore >= 70
          ? "positive"
          : view.overallScore != null && view.overallScore < 50
            ? "negative"
            : "info"
      }
      explanation={view.explanation}
      openHref={view.companyHref}
      openLabel="Open Fundamental Analysis"
      loading={loading}
    >
      <SummaryMetricGrid metrics={view.metrics} />
      {view.highlights.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {view.highlights.slice(0, 4).map((item) => (
            <li
              key={item}
              className="text-[11px] leading-snug text-text-secondary before:mr-1.5 before:text-sky-400 before:content-['•']"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.1em] text-text-faint">
        Overall Verdict · {view.overallVerdict}
        {view.overallScore != null ? ` · ${view.overallScore}` : ""}
      </p>
    </ResearchSectionFrame>
  );
}

export function ValuationSummarySection({
  view,
  loading,
}: {
  view: ResearchIntelligenceView["valuation"];
  loading?: boolean;
}) {
  const tone =
    view.overallVerdict.includes("Under")
      ? "positive"
      : view.overallVerdict.includes("Over")
        ? "negative"
        : "neutral";

  return (
    <ResearchSectionFrame
      index={7}
      title="Valuation Summary"
      description="DCF, Graham, Buffett/EPV, and relative valuation reads."
      verdict={view.overallVerdict}
      verdictTone={tone}
      explanation={view.explanation}
      openHref={view.companyHref}
      openLabel="Open Valuation Analysis"
      loading={loading}
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/8 px-2.5 py-2">
          <p className="text-[10px] text-text-muted">Intrinsic Value</p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-indigo-200">
            {view.intrinsicValue}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2">
          <p className="text-[10px] text-text-muted">Margin of Safety</p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-text-primary">
            {view.marginOfSafety}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2">
          <p className="text-[10px] text-text-muted">Fair Value Status</p>
          <p className="mt-0.5 text-xs font-semibold text-text-primary">
            {view.fairValueStatus}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {view.models.map((model) => (
          <div
            key={`${model.label}-${model.verdict}`}
            className="rounded-lg border border-surface-border-subtle/70 bg-surface/30 px-2 py-1.5"
          >
            <p className="text-[10px] font-medium text-text-muted">{model.label}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-text-primary">
              {model.verdict}
            </p>
            <p className="font-mono text-[10px] text-text-faint">{model.fairValue}</p>
          </div>
        ))}
      </div>
    </ResearchSectionFrame>
  );
}

export function RiskAnalysisSection({
  view,
  loading,
}: {
  view: ResearchIntelligenceView["risk"];
  loading?: boolean;
}) {
  return (
    <ResearchSectionFrame
      index={8}
      title="Risk Analysis"
      description="Published red flags and offsetting positives."
      verdict={view.overallRiskLevel}
      verdictTone={view.riskTone}
      explanation={view.explanation}
      openHref={view.companyHref}
      openLabel="Open Company Risk Detail"
      loading={loading}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SummaryVerdictPill label={`Trend · ${view.riskTrend}`} tone="info" />
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-300/90">
            Top Risks
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {(view.topRisks.length > 0
              ? view.topRisks
              : [
                  {
                    label: "No material flags",
                    severity: "Low",
                    description: "No elevated red flags in this package.",
                  },
                ]
            ).map((risk) => (
              <li key={`${risk.label}-${risk.severity}`} className="text-[11px]">
                <span className="font-semibold text-text-primary">
                  {risk.label}
                </span>
                <span className="ml-1 text-[10px] text-text-faint">
                  ({risk.severity})
                </span>
                <p className="text-text-secondary">{risk.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300/90">
            Positive Factors
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {view.positiveFactors.map((factor) => (
              <li key={factor} className="text-[11px] text-text-secondary">
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ResearchSectionFrame>
  );
}

export function EventsCatalystsSection({
  view,
}: {
  view: ResearchIntelligenceView["events"];
}) {
  const hasCatalysts =
    view.keyCatalysts.length > 0 || view.events.length > 0;

  return (
    <ResearchSectionFrame
      index={9}
      title="Events & Catalysts"
      description="Upcoming earnings, corporate actions, and macro overlays."
      verdict={view.available ? "Active Window" : "Quiet Window"}
      verdictTone={view.available ? "info" : "neutral"}
      explanation={view.expectedImpact}
      openHref={view.calendarHref}
      openLabel="Open Event Calendar"
    >
      {!hasCatalysts ? (
        <DrawerEmptyState
          title="No catalysts"
          message="No near-term events or catalysts are linked for this symbol right now."
        />
      ) : (
        <>
          <SummaryMetricGrid
            metrics={[
              { label: "Upcoming Earnings", value: view.upcomingEarnings },
              { label: "Corporate Actions", value: view.corporateActions },
              { label: "Macro Events", value: view.macroEvents },
            ]}
          />
          <div className="mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-faint">
              Key Catalysts
            </p>
            <ul className="mt-1 space-y-1">
              {view.keyCatalysts.slice(0, 5).map((item) => (
                <li key={item} className="text-[11px] text-text-secondary">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          {view.events.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {view.events.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-lg border border-surface-border-subtle/80 bg-surface/35 px-2.5 py-2 transition-colors hover:bg-surface-hover/50",
                    FOCUS_RING_CLASS
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-text-primary">
                      {event.title}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {event.category} · {event.date}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold text-sky-300">
                      {event.countdown}
                    </p>
                    <p className="text-[10px] text-text-faint">{event.impact}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </>
      )}
    </ResearchSectionFrame>
  );
}

export function FinancialQualitySnapshotSection({
  view,
  loading,
}: {
  view: ResearchIntelligenceView["quality"];
  loading?: boolean;
}) {
  return (
    <ResearchSectionFrame
      index={10}
      title="Financial Quality Snapshot"
      description="Compact quality score cards from the Financial Quality engine."
      verdict={view.overallVerdict}
      verdictTone={
        view.overallScore != null && view.overallScore >= 70
          ? "positive"
          : view.overallScore != null && view.overallScore < 50
            ? "negative"
            : "info"
      }
      openHref={view.companyHref}
      openLabel="Open Full Quality Analysis"
      loading={loading}
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {view.cards.map((card) => {
          const Icon = RESEARCH_ICONS[card.id] ?? ShieldFallback;
          return (
            <div
              key={card.id}
              className={cn(
                "rounded-lg border px-2.5 py-2",
                card.id === "overall"
                  ? "border-violet-500/30 bg-violet-500/8 sm:col-span-1"
                  : "border-surface-border-subtle/80 bg-surface/35"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-text-muted" aria-hidden />
                <p className="text-[10px] font-medium text-text-muted">
                  {card.label}
                </p>
              </div>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">
                {card.value}
              </p>
              <p className="text-[10px] font-semibold text-text-secondary">
                {card.verdict}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-text-faint">
                {card.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </ResearchSectionFrame>
  );
}

function ShieldFallback(props: { className?: string; "aria-hidden"?: boolean }) {
  const Icon = RESEARCH_ICONS.overall;
  return <Icon {...props} />;
}

export function RelatedResearchSection({
  view,
}: {
  view: ResearchIntelligenceView["related"];
}) {
  return (
    <SectionShell
      index={11}
      title="Related Research"
      description="Jump to existing EquityOS research surfaces — no duplicated detail."
    >
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {view.links.map((link) => {
          const Icon = RESEARCH_ICONS[link.id] ?? RESEARCH_ICONS.company;
          return (
            <Link
              key={link.id}
              href={link.href}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border border-surface-border-subtle/80 bg-surface/35 px-3 py-2.5 transition-colors hover:border-surface-border hover:bg-surface-hover/50",
                FOCUS_RING_CLASS
              )}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sky-500/25 bg-sky-500/10 text-sky-300">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-text-primary">
                  {link.label}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-text-muted">
                  {link.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <OpenAnalysisLink href={view.links[0]?.href ?? "/"} label="Open Company Workspace" />
    </SectionShell>
  );
}
