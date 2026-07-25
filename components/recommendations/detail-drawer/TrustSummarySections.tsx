"use client";

import type { InstitutionalTrustView, TrustTone } from "@/lib/recommendations/institutional-trust-presenter";
import { cn } from "@/lib/utils";
import { DrawerEmptyState } from "./DrawerStates";
import { SectionShell } from "./SectionChrome";
import { SummaryVerdictPill } from "./ResearchSectionChrome";

function toneBadge(tone: TrustTone): string {
  switch (tone) {
    case "positive":
      return "border-emerald-500/35 bg-emerald-500/12 text-emerald-400";
    case "negative":
      return "border-rose-500/35 bg-rose-500/12 text-rose-400";
    case "ai":
      return "border-violet-500/35 bg-violet-500/12 text-violet-300";
    case "info":
      return "border-sky-500/35 bg-sky-500/12 text-sky-300";
    default:
      return "border-amber-500/35 bg-amber-500/12 text-amber-400";
  }
}

function TrustFrame({
  index,
  title,
  description,
  loading,
  children,
}: {
  index: number;
  title: string;
  description: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SectionShell index={index} title={title} description={description}>
      {children}
      {loading ? (
        <p className="mt-1.5 text-[10px] text-text-faint">Refreshing trust layer…</p>
      ) : null}
    </SectionShell>
  );
}

export function SimilarHistoricalSetupsSection({
  view,
  loading,
}: {
  view: InstitutionalTrustView["similarSetups"];
  loading?: boolean;
}) {
  return (
    <TrustFrame
      index={12}
      title="Similar Historical Setups"
      description="Comparable published setups from recommendation history and outcomes."
      loading={loading}
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        <SummaryVerdictPill
          label={
            view.setupCount != null
              ? `${view.setupCount} similar`
              : "No similar setups"
          }
          tone={view.available ? "info" : "neutral"}
        />
        <SummaryVerdictPill label={`Win ${view.successRate}`} tone="positive" />
        <SummaryVerdictPill label={`Avg ${view.averageReturn}`} tone="ai" />
      </div>
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {[
          ["Success Rate", view.successRate],
          ["Average Return", view.averageReturn],
          ["Avg Holding", view.averageHoldingPeriod],
          ["Best Outcome", view.bestOutcome],
          ["Worst Outcome", view.worstOutcome],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
          >
            <dt className="text-[10px] text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-[11px] font-semibold text-text-primary">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {view.setups.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {view.setups.map((setup) => (
            <div
              key={`${setup.symbol}-${setup.date}-${setup.returnLabel}`}
              className="rounded-lg border border-surface-border-subtle/70 bg-surface/30 px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-text-primary">
                  {setup.company}{" "}
                  <span className="font-mono text-text-muted">{setup.symbol}</span>
                </p>
                <span className="font-mono text-[10px] text-text-secondary">
                  {setup.returnLabel}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-text-muted">
                {setup.date} · {setup.recommendation} · {setup.holdingDays} · Conf{" "}
                {setup.confidence}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <DrawerEmptyState
            title="No historical validation"
            message={
              view.placeholder ??
              "No comparable historical setups have been published yet."
            }
          />
        </div>
      )}
    </TrustFrame>
  );
}

export function RecommendationPerformanceSection({
  view,
  loading,
}: {
  view: InstitutionalTrustView["performance"];
  loading?: boolean;
}) {
  return (
    <TrustFrame
      index={13}
      title="Recommendation Performance"
      description="Institutional outcome statistics from the published performance layer."
      loading={loading}
    >
      {view.available ? (
        <>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {view.cards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
              >
                <p className="text-[10px] text-text-muted">{card.label}</p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-sm font-semibold tabular-nums",
                    card.tone === "positive" && "text-emerald-400",
                    card.tone === "negative" && "text-rose-400",
                    card.tone === "ai" && "text-violet-300",
                    card.tone === "info" && "text-sky-300",
                    card.tone === "neutral" && "text-text-primary"
                  )}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300/90">
                Best Recommendation
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {view.bestRecommendation}
              </p>
            </div>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-300/90">
                Worst Recommendation
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {view.worstRecommendation}
              </p>
            </div>
          </div>
        </>
      ) : (
        <DrawerEmptyState
          title="No historical validation"
          message={
            view.placeholder ??
            "Performance statistics are not available for this recommendation yet."
          }
        />
      )}
    </TrustFrame>
  );
}

export function ConfidenceEvolutionSection({
  view,
  loading,
}: {
  view: InstitutionalTrustView["confidenceEvolution"];
  loading?: boolean;
}) {
  const max = Math.max(100, ...view.points.map((point) => point.value), 1);

  return (
    <TrustFrame
      index={14}
      title="Confidence Evolution"
      description="How published confidence moved versus the prior package."
      loading={loading}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SummaryVerdictPill
          label={`Current ${view.current != null ? `${view.current}%` : "—"}`}
          tone="ai"
        />
        <SummaryVerdictPill
          label={`Previous ${view.previous != null ? `${view.previous}%` : "—"}`}
          tone="info"
        />
        <SummaryVerdictPill
          label={
            view.change != null
              ? `Δ ${view.change > 0 ? "+" : ""}${view.change}`
              : "Δ —"
          }
          tone={
            view.trend === "Rising"
              ? "positive"
              : view.trend === "Falling"
                ? "negative"
                : "neutral"
          }
        />
        <SummaryVerdictPill label={view.trend} tone="neutral" />
      </div>
      {view.points.length > 0 ? (
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {view.points.map((point) => (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-violet-500/70 transition-[height]"
                style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
                title={`${point.label}: ${point.value}%`}
              />
              <span className="text-[9px] text-text-faint">{point.label}</span>
              <span className="font-mono text-[10px] text-text-secondary">
                {point.value}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[11.5px] leading-relaxed text-text-secondary">
        {view.explanation}
      </p>
    </TrustFrame>
  );
}

export function RecommendationTimelineSection({
  view,
  loading,
}: {
  view: InstitutionalTrustView["timeline"];
  loading?: boolean;
}) {
  return (
    <TrustFrame
      index={15}
      title="Recommendation Timeline"
      description="Audit chronology for generation, validation, and review."
      loading={loading}
    >
      <ol className="relative space-y-2 border-l border-surface-border-subtle pl-3">
        {view.events.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-sky-400/80 ring-2 ring-surface-raised" />
            <div className="rounded-lg border border-surface-border-subtle/70 bg-surface/35 px-2.5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-text-primary">
                  {event.label}
                </p>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                    event.status === "Complete" && toneBadge("positive"),
                    event.status === "Active" && toneBadge("ai"),
                    event.status === "Pending" && toneBadge("neutral"),
                    event.status === "Unavailable" && toneBadge("info")
                  )}
                >
                  {event.status}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-text-faint">{event.timestamp}</p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {event.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </TrustFrame>
  );
}

export function AuditTrailSection({
  view,
  loading,
}: {
  view: InstitutionalTrustView["auditTrail"];
  loading?: boolean;
}) {
  return (
    <TrustFrame
      index={16}
      title="Audit Trail"
      description="Publication-gate verification from the existing validation framework."
      loading={loading}
    >
      <div className="grid gap-1.5 sm:grid-cols-2">
        {view.items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface/35 px-2.5 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-text-primary">
                {item.label}
              </p>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                  toneBadge(item.tone)
                )}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-1 text-[10.5px] text-text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </TrustFrame>
  );
}

export function DataQualitySection({
  view,
  loading,
}: {
  view: InstitutionalTrustView["dataQuality"];
  loading?: boolean;
}) {
  return (
    <TrustFrame
      index={17}
      title="Data Quality & Source Confidence"
      description="Freshness and confidence of published research inputs."
      loading={loading}
    >
      <div className="space-y-1.5">
        {view.rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border-subtle/80 bg-surface/35 px-2.5 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-primary">
                {row.label}
              </p>
              <p className="text-[10px] text-text-muted">
                Updated {row.lastUpdated} · Conf {row.confidence}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                  toneBadge(row.tone)
                )}
              >
                {row.status}
              </span>
              <span className="rounded-full border border-surface-border-subtle bg-surface/50 px-1.5 py-0.5 text-[9px] font-medium text-text-secondary">
                {row.validationStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </TrustFrame>
  );
}

export function InvestmentSuitabilitySection({
  view,
}: {
  view: InstitutionalTrustView["suitability"];
}) {
  return (
    <TrustFrame
      index={18}
      title="Disclaimer & Investment Suitability"
      description="Professional framing for the published recommendation package."
    >
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {[
          ["Recommendation Type", view.recommendationType],
          ["Investment Horizon", view.investmentHorizon],
          ["Risk Category", view.riskCategory],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
          >
            <dt className="text-[10px] text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-[11px] font-semibold text-text-primary">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-faint">
          Suitable For
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {view.suitableFor.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[11.5px] leading-relaxed text-amber-100/90">
        {view.disclaimer}
      </p>
    </TrustFrame>
  );
}
