"use client";

import { cn } from "@/lib/utils";
import type {
  EventIntelligence,
  ScoreFactor,
  SectorImpactTone,
} from "@/types/eventIntelligence";
import {
  RISK_RATING_LABELS,
  SECTOR_IMPACT_TONE_LABELS,
} from "@/types/eventIntelligence";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

function ScoreExplain({
  title,
  score,
  factors,
  formulaNote,
}: {
  title: string;
  score: number;
  factors: ScoreFactor[];
  formulaNote: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-text-secondary">
            {title}
          </p>
          <p className="font-mono text-xl font-semibold tabular-nums text-text-primary">
            {score}
            <span className="ml-1 text-[11px] font-medium text-text-muted">
              / 100
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] font-semibold text-text-secondary transition-colors hover:bg-surface-hover"
        >
          View Calculation
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-surface-border-subtle/70 px-3 py-2.5">
          <p className="text-[10px] leading-relaxed text-text-secondary">
            {formulaNote}
          </p>
          {factors.map((factor) => {
            const width = Math.max(
              4,
              Math.min(100, (Math.abs(factor.points) / Math.max(factor.maxPoints, 1)) * 100)
            );
            return (
              <div key={factor.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-text-secondary">{factor.label}</span>
                  <span className="font-mono text-text-primary">
                    {factor.points > 0 ? "+" : ""}
                    {factor.points}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-overlay">
                  <div
                    className="h-full rounded-full bg-accent/80"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="text-[9px] text-text-secondary">{factor.rationale}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function toneClass(tone: SectorImpactTone): string {
  switch (tone) {
    case "strong_positive":
      return "border-emerald-500/35 bg-emerald-500/15 text-emerald-300";
    case "positive":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "negative":
      return "border-red-500/25 bg-red-500/10 text-red-300";
    case "strong_negative":
      return "border-red-500/35 bg-red-500/15 text-red-300";
    default:
      return "border-zinc-400/40 bg-zinc-500/20 text-zinc-200";
  }
}

interface EventIntelligencePanelProps {
  intelligence: EventIntelligence;
}

export function EventIntelligencePanel({
  intelligence,
}: EventIntelligencePanelProps) {
  const intel = intelligence;
  const bias = intel.marketBias.bias;

  return (
    <div className="space-y-5" data-testid="event-intelligence-panel">
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Executive Summary
        </p>
        <div className="space-y-2 rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-3 py-3">
          <p className="text-xs leading-relaxed text-text-primary">
            {intel.executiveSummary.overview}
          </p>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary">
              Why it matters
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
              {intel.executiveSummary.whyItMatters}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary">
              Key things to watch
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-text-secondary">
              {intel.executiveSummary.keyThingsToWatch.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold text-text-secondary">
                Primary beneficiaries
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-300">
                {intel.executiveSummary.primaryBeneficiaries.join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-text-secondary">
                Primary risks
              </p>
              <p className="mt-0.5 text-[11px] text-red-300">
                {intel.executiveSummary.primaryRisks.join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <ScoreExplain
          title="Impact Score"
          score={intel.impact.score}
          factors={intel.impact.factors}
          formulaNote={intel.impact.formulaNote}
        />
        <ScoreExplain
          title="Confidence"
          score={intel.confidence.score}
          factors={intel.confidence.factors}
          formulaNote={intel.confidence.formulaNote}
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Market Bias
        </p>
        <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
                bias === "bullish"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : bias === "bearish"
                    ? "border-red-500/25 bg-red-500/10 text-red-300"
                    : "border-zinc-400/40 bg-zinc-500/20 text-zinc-200"
              )}
            >
              {bias}
            </span>
            <span className="font-mono text-[11px] text-text-secondary">
              Confidence {intel.marketBias.confidence}/100
            </span>
            <span className="text-[11px] text-text-secondary">
              Vol: {intel.expectedVolatility.level}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
            {intel.marketBias.rationale}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] font-semibold text-text-secondary">
              View Calculation
            </summary>
            <ul className="mt-1 space-y-1">
              {intel.marketBias.factors.map((f) => (
                <li key={f.id} className="text-[10px] text-text-muted">
                  <span className="font-medium text-text-secondary">
                    {f.label} (+{f.points})
                  </span>
                  — {f.rationale}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Risk
        </p>
        <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-3 py-3">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                intel.risk.rating === "very_high" || intel.risk.rating === "high"
                  ? "text-red-300"
                  : intel.risk.rating === "medium"
                    ? "text-amber-300"
                    : "text-emerald-300"
              )}
            >
              {RISK_RATING_LABELS[intel.risk.rating]}
            </span>
            <span className="font-mono text-[11px] text-text-secondary">
              {intel.risk.score}/100
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            {intel.risk.rationale}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] font-semibold text-text-secondary">
              View Calculation
            </summary>
            <ul className="mt-1 space-y-1">
              {intel.risk.factors.map((f) => (
                <li key={f.id} className="text-[10px] text-text-muted">
                  <span className="font-medium text-text-secondary">
                    {f.label} (+{f.points})
                  </span>
                  — {f.rationale}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Sector Matrix
        </p>
        <div className="overflow-x-auto rounded-lg border border-surface-border-subtle">
          <table className="w-full min-w-[360px] text-left text-[11px]">
            <thead className="bg-surface-overlay/70 text-text-secondary">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Sector</th>
                <th className="px-2 py-1.5 font-semibold">Impact</th>
                <th className="px-2 py-1.5 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {intel.sectorMatrix.rows
                .filter((row) => row.tone !== "neutral")
                .map((row) => (
                  <tr
                    key={row.sector}
                    className="border-t border-surface-border-subtle/80 text-text-primary transition-colors hover:bg-surface-hover/40"
                  >
                    <td className="px-2 py-1.5">{row.sector}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold",
                          toneClass(row.tone)
                        )}
                      >
                        {SECTOR_IMPACT_TONE_LABELS[row.tone]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-text-secondary">{row.note}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {intel.sectorMatrix.rows.every((r) => r.tone === "neutral") ? (
          <p className="text-[11px] text-text-secondary">
            No differentiated sector mapping for this event.
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
          Preparation Checklist
        </p>
        <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-3 py-3">
          <p className="text-[11px] font-semibold text-text-secondary">
            {intel.preparationChecklist.title}
          </p>
          <ul className="mt-2 space-y-1.5">
            {intel.preparationChecklist.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 text-[11px] text-text-secondary"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex min-w-[52px] justify-center rounded border px-1 py-px text-[9px] font-semibold uppercase",
                    item.priority === "critical"
                      ? "border-red-500/30 text-red-300"
                      : item.priority === "high"
                        ? "border-amber-500/30 text-amber-300"
                        : "border-zinc-400/40 text-zinc-200"
                  )}
                >
                  {item.priority}
                </span>
                <span>
                  <span className="text-text-secondary">{item.label}</span>
                  <span className="ml-1 text-text-muted">· {item.category}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {intel.historicalInsight ? (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
            Historical Insight
          </p>
          <div className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-3 py-3">
            <p className="text-[11px] font-semibold text-text-secondary">
              {intel.historicalInsight.seriesLabel}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              {intel.historicalInsight.summary}
            </p>
            {intel.historicalInsight.metrics.length > 0 ? (
              <dl className="mt-3 grid grid-cols-2 gap-2">
                {intel.historicalInsight.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-md border border-surface-border-subtle/70 px-2 py-2"
                  >
                    <dt className="text-[9px] text-text-secondary">{metric.label}</dt>
                    <dd className="mt-0.5 font-mono text-xs text-text-primary">
                      {metric.value}
                    </dd>
                    <p className="mt-0.5 text-[9px] text-text-secondary">
                      {metric.interpretation}
                    </p>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
