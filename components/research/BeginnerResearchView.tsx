"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type {
  BeginnerResearchModel,
  BeginnerTabId,
  BeginnerVerdict,
  Tone,
} from "@/lib/research/beginner-model";
import {
  BookOpen,
  ChevronDown,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const TABS: Array<{ id: BeginnerTabId; label: string }> = [
  { id: "health", label: "Financial Health" },
  { id: "business", label: "Business Quality" },
  { id: "valuation", label: "Valuation" },
  { id: "technical", label: "Price Trend" },
  { id: "risk", label: "Risks" },
];

function toneClass(tone: Tone): string {
  if (tone === "good") return "border-gain/30 bg-gain/5 text-gain";
  if (tone === "bad") return "border-loss/30 bg-loss/5 text-loss";
  return "border-amber-500/30 bg-amber-500/5 text-amber-400";
}

function verdictClass(v: BeginnerVerdict): string {
  if (v === "BUY") return "bg-gain/15 text-gain border-gain/40";
  if (v === "SELL") return "bg-loss/15 text-loss border-loss/40";
  return "bg-amber-500/15 text-amber-300 border-amber-500/40";
}

function Stars({ count }: { count: number }) {
  return (
    <p className="font-mono text-lg tracking-tight text-text-primary" aria-label={`${count} of 5`}>
      {"★".repeat(count)}
      <span className="text-text-faint">{"☆".repeat(Math.max(0, 5 - count))}</span>
    </p>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function BeginnerResearchView({
  model,
  advanced,
}: {
  model: BeginnerResearchModel;
  advanced?: ReactNode;
}) {
  const [tab, setTab] = useState<BeginnerTabId>("health");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (model.empty) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyStatePanel
          className="py-12"
          title="Research a company"
          message={model.emptyMessage}
          source="Research"
          icon={Search}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/watchlist"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Open Watchlist
              </Link>
              <Link
                href="/opportunities"
                className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-text-secondary"
              >
                Browse Ideas
              </Link>
            </div>
          }
        />
        <p className="mt-6 text-center text-sm text-text-muted">
          Tip: open any stock page, then return here — or add{" "}
          <code className="text-text-secondary">?symbol=RELIANCE</code> to the
          URL.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 1. Header */}
      <header className="rounded-2xl border border-surface-border-subtle bg-surface-elevated/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {model.companyName}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {model.symbol} · {model.sector}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">
              {model.priceLabel}
            </p>
            <p
              className={`mt-0.5 text-sm font-medium ${
                (model.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {model.changeLabel}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-xl border px-3 py-1.5 text-sm font-bold tracking-wide ${verdictClass(model.verdict)}`}
          >
            AI Verdict · {model.verdict}
          </span>
          <span className="text-sm text-text-secondary">
            Confidence {model.confidenceLabel}
          </span>
          <span className="text-xs text-text-faint">
            Updated {model.lastUpdated}
          </span>
        </div>
      </header>

      {/* 3. AI Verdict hero */}
      <Card padding="lg" accent="violet" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        <CardHeader
          title="Should you consider this stock?"
          subtitle="Plain-English summary"
          icon={<Sparkles className="h-4 w-4 text-violet-400" />}
        />
        <p
          className={`inline-flex rounded-xl border px-4 py-2 text-xl font-bold ${verdictClass(model.verdict)}`}
        >
          {model.verdict}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Confidence: {model.confidenceLabel}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gain">
              <TrendingUp className="h-3.5 w-3.5" />
              Biggest reasons
            </p>
            <ul className="space-y-2">
              {model.reasons.map((r) => (
                <li
                  key={r}
                  className="rounded-lg border border-gain/20 bg-gain/5 px-3 py-2 text-sm text-text-primary"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-loss">
              <TrendingDown className="h-3.5 w-3.5" />
              Biggest risks
            </p>
            <ul className="space-y-2">
              {model.risks.map((r) => (
                <li
                  key={r}
                  className="rounded-lg border border-loss/20 bg-loss/5 px-3 py-2 text-sm text-text-primary"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* 4. Tabs */}
      <div>
        <div
          role="tablist"
          aria-label="Research sections"
          className="mb-4 flex flex-wrap gap-2 border-b border-surface-border-subtle pb-2"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "health" ? (
          <section>
            <SectionTitle
              title="Financial Health"
              subtitle="Simple scorecards — higher stars usually mean healthier numbers"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {model.financialCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl border p-4 ${toneClass(card.tone)}`}
                >
                  <p className="text-sm font-semibold text-text-primary">
                    {card.title}
                  </p>
                  <div className="mt-2">
                    <Stars count={card.stars} />
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {card.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "business" ? (
          <section>
            <SectionTitle
              title="Business Quality"
              subtitle="How durable and well-run the company looks"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {model.businessCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl border p-4 ${toneClass(card.tone)}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
                    {card.title}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-text-primary">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "valuation" ? (
          <section>
            <SectionTitle
              title="Valuation"
              subtitle="Is the current price high, fair, or low?"
            />
            <Card padding="lg">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-text-faint">Current Price</p>
                  <p className="mt-1 font-mono text-xl font-bold text-text-primary">
                    {model.priceLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Fair Value (estimate)</p>
                  <p className="mt-1 font-mono text-xl font-bold text-text-primary">
                    {model.valuation.fairValue != null
                      ? `₹${model.valuation.fairValue.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}`
                      : "Not available yet"}
                  </p>
                </div>
              </div>
              <p
                className={`mt-4 inline-flex rounded-lg border px-3 py-1.5 text-sm font-bold ${
                  model.valuation.stance === "Undervalued"
                    ? toneClass("good")
                    : model.valuation.stance === "Expensive"
                      ? toneClass("bad")
                      : toneClass("ok")
                }`}
              >
                {model.valuation.stance}
              </p>
              {model.valuation.marginOfSafety != null ? (
                <p className="mt-2 text-sm text-text-secondary">
                  Safety cushion vs fair value:{" "}
                  {model.valuation.marginOfSafety.toFixed(0)}%
                </p>
              ) : null}
              <p className="mt-3 text-sm text-text-primary">
                {model.valuation.explanation}
              </p>
            </Card>
          </section>
        ) : null}

        {tab === "technical" ? (
          <section>
            <SectionTitle
              title="Price Trend"
              subtitle="A simple read of direction — not a trading system"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Trend", model.technical.trend],
                  ["Support (near floor)", model.technical.support],
                  ["Resistance (near ceiling)", model.technical.resistance],
                  ["Momentum", model.technical.momentum],
                  ["Risk level", model.technical.risk],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4"
                >
                  <p className="text-xs text-text-faint">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-text-primary">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "risk" ? (
          <section>
            <SectionTitle
              title="Main Risks"
              subtitle="Up to five things that could go wrong"
            />
            {model.riskCards.length === 0 ? (
              <p className="text-sm text-text-muted">
                No major risks flagged yet — still review carefully.
              </p>
            ) : (
              <div className="space-y-3">
                {model.riskCards.map((risk) => (
                  <div
                    key={risk.id}
                    className="rounded-xl border border-surface-border-subtle p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      <p className="font-semibold text-text-primary">
                        {risk.title}
                      </p>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          risk.severity === "High"
                            ? toneClass("bad")
                            : risk.severity === "Medium"
                              ? toneClass("ok")
                              : toneClass("good")
                        }`}
                      >
                        {risk.severity} severity
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text-primary">
                      {risk.explanation}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Possible impact: {risk.impact}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      {/* 10. Decision box */}
      <Card padding="lg" accent="emerald" className="border-emerald-500/30">
        <CardHeader
          title="Should I Buy?"
          subtitle="One clear answer for beginners"
          icon={<Target className="h-4 w-4 text-emerald-400" />}
        />
        <p
          className={`inline-flex rounded-xl border px-5 py-2.5 text-2xl font-bold ${
            model.decision.answer === "YES"
              ? verdictClass("BUY")
              : model.decision.answer === "NO"
                ? verdictClass("SELL")
                : verdictClass("HOLD")
          }`}
        >
          {model.decision.answer}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-overlay/50 p-3">
            <p className="text-xs text-text-faint">Best Buy Zone</p>
            <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
              {model.decision.buyZone}
            </p>
          </div>
          <div className="rounded-lg bg-surface-overlay/50 p-3">
            <p className="text-xs text-text-faint">Target</p>
            <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
              {model.decision.target}
            </p>
          </div>
          <div className="rounded-lg bg-surface-overlay/50 p-3">
            <p className="text-xs text-text-faint">Stop Loss</p>
            <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
              {model.decision.stopLoss}
            </p>
          </div>
          <div className="rounded-lg bg-surface-overlay/50 p-3">
            <p className="text-xs text-text-faint">Ideal Holding Period</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {model.decision.holdingPeriod}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-text-faint">Suitable For</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {model.decision.suitableFor.map((s) => (
              <span
                key={s}
                className="rounded-full border border-surface-border px-3 py-1 text-xs font-semibold text-text-secondary"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-4 text-xs text-text-muted">
          This is educational research, not personalised advice. Always
          double-check before investing.
        </p>
        <Link
          href={model.companyHref}
          className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
        >
          Open full company page →
        </Link>
      </Card>

      {/* 11. Timeline */}
      <section>
        <SectionTitle title="Research Progress" />
        <ol className="space-y-2">
          {model.timeline.map((step, i) => (
            <li
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-surface-border-subtle px-3 py-2"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-300">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {step.label}
                </p>
                {step.when ? (
                  <p className="text-xs text-text-faint">{step.when}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 12. Advanced collapsed */}
      {advanced ? (
        <div className="rounded-xl border border-dashed border-surface-border-subtle">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-text-muted hover:text-text-secondary"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Advanced tools (optional)
            </span>
            <ChevronDown
              className={`h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`}
            />
          </button>
          {advancedOpen ? (
            <div className="border-t border-surface-border-subtle px-4 py-4 text-sm text-text-muted">
              {advanced}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
