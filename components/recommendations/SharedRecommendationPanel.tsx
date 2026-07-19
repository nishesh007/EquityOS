"use client";

import type { SharedRecommendation } from "@/lib/recommendations";
import { CATEGORY_LABELS } from "@/lib/opportunity-engine/types";
import { Badge } from "@/components/ui/Badge";
import { CardFooter } from "@/components/ui/Card";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import {
  StatusBadge,
  statusToneFromLabel,
  createInstitutionalTable,
  ResearchDataGrid,
} from "@/src/design";
import {
  Crosshair,
  Eye,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function price(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Presentation labels — maps engine actions to premium UI labels. */
type DisplayAction = "BUY" | "ACCUMULATE" | "WATCH" | "SELL";

/**
 * Map Strategy Engine actions to display labels.
 * BUY → BUY · WATCHLIST → WATCH · SELL → SELL.
 * ACCUMULATE styles are reserved for future engine actions — not invented here.
 */
function toDisplayAction(rec: SharedRecommendation): DisplayAction {
  if (rec.action === "SELL") return "SELL";
  if (rec.action === "WATCHLIST") return "WATCH";
  return "BUY";
}

const ACTION_STYLES: Record<
  DisplayAction,
  {
    border: string;
    hover: string;
    badge: string;
    icon: React.ReactNode;
  }
> = {
  BUY: {
    border: "border-l-emerald-500",
    hover: "hover:bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  ACCUMULATE: {
    border: "border-l-sky-500",
    hover: "hover:bg-sky-500/5",
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/40",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  WATCH: {
    border: "border-l-amber-500",
    hover: "hover:bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    icon: <Eye className="h-3 w-3" />,
  },
  SELL: {
    border: "border-l-rose-500",
    hover: "hover:bg-rose-500/5",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/40",
    icon: <TrendingDown className="h-3 w-3" />,
  },
};

function ActionBadge({ action }: { action: DisplayAction }) {
  const style = ACTION_STYLES[action];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight transition-colors duration-200 ${style.badge}`}
    >
      {style.icon}
      {action}
    </span>
  );
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface OpportunityGridRow {
  id: string;
  symbol: string;
  company: string;
  action: string;
  category: string;
  strategy: string;
  strategyCount: number;
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  confidence: number;
  conviction: number;
  regime: string;
  timestamp: string;
  source: SharedRecommendation;
}

const OPPORTUNITIES_TABLE = createInstitutionalTable<OpportunityGridRow>({
  id: "ai-opportunities",
  pageSize: 25,
  density: "compact",
  defaultSort: { columnId: "confidence", direction: "desc" },
  columns: [
    { id: "symbol", label: "Symbol", kind: "text", sticky: true, width: 110 },
    { id: "company", label: "Company", kind: "text", hidden: true },
    { id: "action", label: "Action", kind: "badge", width: 90 },
    { id: "category", label: "Category", kind: "text", hidden: true },
    { id: "strategy", label: "Strategy", kind: "text", width: 160 },
    { id: "strategyCount", label: "Matched", kind: "number" },
    { id: "entry", label: "Entry", kind: "price" },
    { id: "stopLoss", label: "Stop", kind: "price" },
    { id: "target", label: "Target", kind: "price" },
    { id: "riskReward", label: "R:R", kind: "number" },
    { id: "confidence", label: "Confidence", kind: "percent" },
    { id: "conviction", label: "Conviction", kind: "number" },
    { id: "regime", label: "Regime", kind: "status" },
    { id: "timestamp", label: "Updated", kind: "date", hidden: true },
  ],
});

/** Mobile card row — collapses table gracefully. */
function OpportunityCard({
  recommendation,
}: {
  recommendation: SharedRecommendation;
}) {
  const display = toDisplayAction(recommendation);
  const style = ACTION_STYLES[display];
  const target = recommendation.targets.at(-1) ?? 0;

  return (
    <article
      className={`rounded-lg border border-surface-border-subtle border-l-4 bg-surface-overlay/40 p-4 transition-colors duration-200 ${style.border} ${style.hover}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {recommendation.symbol}
          </p>
          <p className="text-[11px] text-text-muted">{recommendation.company}</p>
        </div>
        <ActionBadge action={display} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="text-text-faint">Entry</p>
          <p className="font-mono tabular-nums text-text-primary">
            {price(recommendation.entry)}
          </p>
        </div>
        <div>
          <p className="text-text-faint">Stop</p>
          <p className="font-mono tabular-nums text-text-primary">
            {price(recommendation.stopLoss)}
          </p>
        </div>
        <div>
          <p className="text-text-faint">Target</p>
          <p className="font-mono tabular-nums text-text-primary">
            {price(target)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ConfidenceBar value={recommendation.confidence} size="sm" />
        <Badge size="sm" variant="neutral">
          Conviction {recommendation.conviction}
        </Badge>
        <StatusBadge
          size="sm"
          tone={statusToneFromLabel(recommendation.marketRegime)}
        >
          {recommendation.marketRegime}
        </StatusBadge>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
        <Target className="h-3 w-3 shrink-0" />
        {recommendation.primaryStrategy}
      </p>
      <p className="mt-1 text-[10px] text-text-faint">
        {formatTs(recommendation.timestamp)}
      </p>
    </article>
  );
}

function OpportunityExpanded({
  recommendation,
}: {
  recommendation: SharedRecommendation;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          AI Summary
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {recommendation.reasons.length > 0
            ? recommendation.reasons.join(" · ")
            : recommendation.marketContext || "No summary available."}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          Strategy Details
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {recommendation.primaryStrategy}
          {recommendation.matchedStrategies.length > 0
            ? ` · ${recommendation.matchedStrategies.join(", ")}`
            : ""}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          Bull Case
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {recommendation.supportingStrategies.length > 0
            ? recommendation.supportingStrategies.join(", ")
            : recommendation.evidence.slice(0, 3).join(" · ") || "—"}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          Bear Case
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {recommendation.opposingStrategies.length > 0
            ? recommendation.opposingStrategies.join(", ")
            : "—"}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          Risks
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          Risk {recommendation.risk.toFixed(2)} · Mode {recommendation.riskMode}
          {recommendation.validation.reasons.length > 0
            ? ` · ${recommendation.validation.reasons.slice(0, 2).join(" · ")}`
            : ""}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          Catalysts / Notes
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {recommendation.holdingPeriod} · {recommendation.marketContext}
          {recommendation.evidence.length > 0
            ? ` · ${recommendation.evidence.slice(0, 2).join(" · ")}`
            : ""}
        </p>
      </div>
    </div>
  );
}

export function SharedRecommendationPanel({
  recommendations,
  title = "Strategy Engine Recommendations",
  emptyMessage = "No active recommendations — Strategy Engine and Opportunity Engine fallback both returned none for this surface.",
}: {
  recommendations: readonly SharedRecommendation[];
  title?: string;
  emptyMessage?: string;
}) {
  const rows = useMemo<OpportunityGridRow[]>(
    () =>
      recommendations.map((rec) => ({
        id: rec.id,
        symbol: rec.symbol,
        company: rec.company,
        action: toDisplayAction(rec),
        category: CATEGORY_LABELS[rec.category],
        strategy: rec.primaryStrategy,
        strategyCount: rec.strategyCount,
        entry: rec.entry,
        stopLoss: rec.stopLoss,
        target: rec.targets.at(-1) ?? 0,
        riskReward: rec.riskReward,
        confidence: rec.confidence,
        conviction: rec.conviction,
        regime: rec.marketRegime,
        timestamp: formatTs(rec.timestamp),
        source: rec,
      })),
    [recommendations]
  );

  return (
    <section className="relative overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-card p-5 shadow-[var(--eos-shadow-card)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--eos-shadow-floating)] sm:p-6">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-sky-500/70"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary sm:text-lg">
            <Crosshair className="h-4 w-4 text-sky-400" aria-hidden />
            {title}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {recommendations.length} active · Strategy Engine pipeline
          </p>
        </div>
        <StatusBadge tone="success" size="sm">
          AI Verified
        </StatusBadge>
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-4">
          <EmptyStatePanel
            title="No active opportunities"
            message={emptyMessage}
            source="Strategy Engine · Opportunity Engine fallback"
            icon={Crosshair}
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/opportunities"
                  className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
                >
                  Open AI Opportunities →
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 rounded-full border border-surface-border px-3 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface-hover"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh dashboard
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3 lg:hidden">
            {recommendations.map((recommendation) => (
              <OpportunityCard
                key={recommendation.id}
                recommendation={recommendation}
              />
            ))}
          </div>

          <div className="mt-4 hidden lg:block">
            <ResearchDataGrid
              table={OPPORTUNITIES_TABLE}
              rows={rows}
              getRowId={(row) => row.id}
              maxHeight={520}
              emptyTitle="No opportunities"
              renderExpandedRow={(row) => (
                <OpportunityExpanded recommendation={row.source} />
              )}
            />
          </div>
        </>
      )}

      <CardFooter>
        <span>Source · Strategy Engine · Opportunity Engine fallback</span>
        <Link
          href="/opportunities"
          className="font-semibold text-accent transition-colors hover:text-accent/80"
        >
          View all →
        </Link>
      </CardFooter>
    </section>
  );
}

export function RecommendationValidationPanel({
  recommendations,
}: {
  recommendations: readonly SharedRecommendation[];
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-card p-5 shadow-[var(--eos-shadow-card)] transition-[box-shadow,transform] duration-300 hover:shadow-[var(--eos-shadow-floating)] sm:p-6">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-indigo-500/70"
      />
      <h2 className="text-base font-semibold tracking-tight text-text-primary">
        Recommendation Gate Validation
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Entry, stop, target, confidence, score, agreement, context, regime and
        eligibility are validated before publication.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        {recommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="rounded-lg border border-surface-border-subtle p-3 transition-colors duration-200 hover:bg-surface-hover/40"
          >
            <p className="text-xs font-semibold text-text-primary">
              {recommendation.symbol} ·{" "}
              {recommendation.validation.valid ? "PASS" : "FAIL"}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">
              Validation {recommendation.validation.score}% · Strategy{" "}
              {recommendation.primaryStrategy}
            </p>
            <div className="mt-2">
              <ConfidenceBar
                value={recommendation.validation.score}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
