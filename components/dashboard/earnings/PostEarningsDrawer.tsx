"use client";

import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { PostEarningsPreviewStrip } from "@/components/dashboard/earnings/PostEarningsPreviewStrip";
import { TranscriptIntelligenceSection } from "@/components/dashboard/earnings/TranscriptIntelligenceSection";
import {
  postBadgeVariant,
  type PostEarningsDrawerView,
} from "@/src/core/earnings/postAnalysis";
import { X } from "lucide-react";

interface PostEarningsDrawerProps {
  view: PostEarningsDrawerView;
  open: boolean;
  onClose: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <div className="text-xs text-text-secondary">{children}</div>
    </section>
  );
}

function TrendBlock({
  title,
  values,
  labels,
}: {
  title: string;
  values: number[];
  labels: string[];
}) {
  const positive = values.length < 2 || values[0]! >= values[values.length - 1]!;
  return (
    <div className="rounded-lg border border-surface-border-subtle bg-surface/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
          {title}
        </p>
        {values.length >= 2 ? (
          <Sparkline data={[...values].reverse()} positive={positive} />
        ) : null}
      </div>
      {values.length === 0 ? (
        <p className="text-[11px] text-text-muted">Results Not Published</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {labels.map((label, index) => (
            <Badge key={`${title}-${label}`} variant="neutral" size="sm">
              {label}: {Number.isFinite(values[index]) ? values[index] : "—"}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function PostEarningsDrawer({
  view,
  open,
  onClose,
}: PostEarningsDrawerProps) {
  if (!open) return null;

  const report = view.report;
  const comparison = view.analysis.comparison;
  const labels = report.revenueTrend.map((p) => p.label);
  const surpriseSeries = report.surpriseTrend.map((item) =>
    item.result === "Beat" ? 1 : item.result === "Miss" ? -1 : 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      data-testid="post-earnings-drawer"
    >
      <button
        type="button"
        aria-label="Close post earnings analysis"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-surface-border bg-surface-raised shadow-card">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              {view.title}
            </p>
            <p className="text-sm font-semibold text-text-primary">
              {view.event.ticker}
            </p>
            <p className="text-[11px] text-text-muted">{view.subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {view.card.badges.map((badge) => (
                <Badge key={badge} variant={postBadgeVariant(badge)} size="sm">
                  {badge}
                </Badge>
              ))}
            </div>
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
          <PostEarningsPreviewStrip view={view.card} />

          {report.empty ? (
            <p className="text-xs text-text-muted">{report.emptyMessage}</p>
          ) : (
            <>
              <Section title="Executive Summary">{report.executiveSummary}</Section>
              <Section title="What Happened">{report.whatHappened}</Section>
              <Section title="Biggest Positives">
                <ul className="list-disc space-y-1 pl-4">
                  {report.biggestPositives.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Biggest Negatives">
                <ul className="list-disc space-y-1 pl-4">
                  {report.biggestNegatives.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>

              <Section title="Estimate Comparison">
                <div className="space-y-1">
                  {[
                    comparison.revenue,
                    comparison.eps,
                    comparison.ebitda,
                    comparison.pat,
                    comparison.operatingMargin,
                    comparison.margin,
                  ].map((metric) => (
                    <p key={metric.label}>
                      {metric.label}: {metric.actual} vs {metric.estimate} (
                      {metric.beatPercent}) · {metric.outcome}
                    </p>
                  ))}
                </div>
              </Section>

              <div className="rounded-lg border border-surface-border-subtle bg-surface/40 p-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  Estimate vs Actual
                </p>
                <Sparkline
                  data={[
                    Number.parseFloat(comparison.revenue.beatPercent) || 0,
                    Number.parseFloat(comparison.eps.beatPercent) || 0,
                    Number.parseFloat(comparison.pat.beatPercent) || 0,
                  ]}
                  positive={!comparison.overallOutcome.includes("Miss")}
                />
              </div>

              <TrendBlock
                title="Revenue Trend"
                values={report.revenueTrend.map((p) => p.revenue)}
                labels={labels}
              />
              <TrendBlock
                title="EPS Trend"
                values={report.epsTrend.map((p) => p.eps)}
                labels={labels}
              />
              <TrendBlock
                title="Margin Trend"
                values={report.marginTrend.map((p) => p.margin)}
                labels={labels}
              />
              <TrendBlock
                title="Historical Earnings Surprise Trend"
                values={surpriseSeries}
                labels={report.surpriseTrend.map((s) => s.label)}
              />

              <Section title="Guidance Analysis">{report.guidanceAnalysis}</Section>
              <Section title="Margin Analysis">{report.marginAnalysis}</Section>
              <Section title="Cash Flow Highlights">
                {report.cashFlowHighlights}
              </Section>
              <Section title="Management Commentary Summary">
                {report.managementCommentary}
              </Section>

              <TranscriptIntelligenceSection
                ticker={view.event.ticker}
                resultDate={view.event.resultDate}
              />

              <Section title="AI Verdict">{report.aiVerdict}</Section>
              <Section title="Confidence">{report.confidence}</Section>
              <Section title="Expected Medium-Term Impact">
                {report.expectedMediumTermImpact}
              </Section>

              <Section title="Market Reaction">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="neutral" size="sm">
                    {view.analysis.reaction.gapLabel}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {view.analysis.reaction.intradayReaction}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {view.analysis.reaction.volumeSpike}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    Delivery {view.analysis.reaction.deliveryPercent}
                  </Badge>
                  <Badge variant="accent" size="sm">
                    {view.analysis.reaction.institutionalFlow}
                  </Badge>
                </div>
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
