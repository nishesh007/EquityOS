"use client";

import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { EarningsAIPreviewStrip } from "@/components/dashboard/earnings/EarningsAIPreviewStrip";
import {
  badgeVariant,
  type EarningsDrawerView,
} from "@/src/core/earnings/intelligence";
import { X } from "lucide-react";

interface EarningsIntelligenceDrawerProps {
  view: EarningsDrawerView;
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
        <p className="text-[11px] text-text-muted">Insufficient Historical Data</p>
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

export function EarningsIntelligenceDrawer({
  view,
  open,
  onClose,
}: EarningsIntelligenceDrawerProps) {
  if (!open) return null;

  const research = view.research;
  const revenueValues = research.revenueTrend.map((p) => p.revenue);
  const epsValues = research.epsTrend.map((p) => p.eps);
  const marginValues = research.marginTrend.map((p) => p.margin);
  const labels = research.revenueTrend.map((p) => p.label);
  const surpriseSeries = research.beatMissHistory.map((item) =>
    item.result === "Beat" ? 1 : item.result === "Miss" ? -1 : 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      data-testid="earnings-intelligence-drawer"
    >
      <button
        type="button"
        aria-label="Close institutional earnings research"
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
              {view.preview.badges.map((badge) => (
                <Badge key={badge} variant={badgeVariant(badge)} size="sm">
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
          <EarningsAIPreviewStrip preview={view.preview} />

          {research.empty ? (
            <p className="text-xs text-text-muted">{research.emptyMessage}</p>
          ) : (
            <>
              <Section title="Executive Summary">{research.executiveSummary}</Section>
              <Section title="Street Expectations">{research.streetExpectations}</Section>
              <Section title="AI Expectations">{research.aiExpectations}</Section>
              <Section title="Historical Earnings">{research.historicalEarnings}</Section>

              <TrendBlock
                title="Revenue Trend"
                values={revenueValues}
                labels={labels}
              />
              <TrendBlock title="EPS Trend" values={epsValues} labels={labels} />
              <TrendBlock
                title="Margin Trend"
                values={marginValues}
                labels={labels}
              />
              <TrendBlock
                title="Historical Surprise Trend"
                values={surpriseSeries}
                labels={research.beatMissHistory.map((b) => b.label)}
              />

              <Section title="Quarter Timeline">
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <Badge key={`q-${label}`} variant="default" size="sm">
                      {label}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section title="Operating Leverage">{research.operatingLeverage}</Section>
              <Section title="Historical Beat / Miss History">
                <ul className="space-y-1">
                  {research.beatMissHistory.map((item) => (
                    <li key={item.label}>
                      {item.label}: {item.result}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="Institutional Positioning">
                {research.institutionalPositioning}
              </Section>
              <Section title="Risk Analysis">{research.riskAnalysis}</Section>
              <Section title="Bull Case">
                <ul className="list-disc space-y-1 pl-4">
                  {research.bullCase.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Bear Case">
                <ul className="list-disc space-y-1 pl-4">
                  {research.bearCase.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Catalysts">
                <ul className="list-disc space-y-1 pl-4">
                  {research.catalysts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Questions To Watch">
                <ul className="list-disc space-y-1 pl-4">
                  {research.questionsToWatch.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Expected Market Reaction">
                {research.expectedMarketReaction}
              </Section>
              <Section title="Final AI Opinion">{research.finalAIOpinion}</Section>
              <Section title="Confidence Breakdown">
                <ul className="space-y-1">
                  {research.confidenceBreakdown.map((row) => (
                    <li key={row.factor}>
                      {row.factor}: {row.contribution}
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
