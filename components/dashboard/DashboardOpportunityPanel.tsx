"use client";

import { SchedulerHealthCard } from "@/components/dashboard/SchedulerHealthCard";
import { EligibilityBadge, OpportunityPipelineMeta } from "@/components/market";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StockLink } from "@/components/ui/StockLink";
import {
  buildInstitutionalCandidateView,
  type InstitutionalCandidateView,
} from "@/lib/opportunity-engine/institutional-presentation";
import {
  deriveCategoryCandidates,
  getCategoryLabel,
  getCategorySubtitle,
} from "@/lib/opportunity-engine/presentation";
import {
  CONVICTION_GATE_EMPTY_MESSAGE,
  partitionByConvictionGate,
  resolveConvictionTier,
  resolveFinalTarget,
  resolveTargetTimeEstimates,
  type ConvictionTier,
} from "@/lib/opportunity-engine/recommendation-display";
import {
  OPPORTUNITY_CATEGORIES,
  type OpportunityCandidate,
  type OpportunityCategory,
  type OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { presentCandidateRecommendationMeta } from "@/src/core/recommendations";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

interface DashboardOpportunityPanelProps {
  initialState: OpportunityEngineState;
}

// ---------------------------------------------------------------------------
// Institutional color system (Part 8)
// ---------------------------------------------------------------------------

const TIER_STYLES: Record<
  ConvictionTier["id"],
  { badge: string; text: string; bar: string }
> = {
  high_conviction: {
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    text: "text-amber-300",
    bar: "bg-amber-400",
  },
  trade_setup: {
    badge: "border-accent/30 bg-accent/10 text-accent",
    text: "text-accent",
    bar: "bg-accent",
  },
  watchlist: {
    badge: "border-surface-border bg-surface-overlay text-text-muted",
    text: "text-text-muted",
    bar: "bg-text-faint",
  },
  ignore: {
    badge: "border-surface-border bg-surface-overlay text-text-faint",
    text: "text-text-faint",
    bar: "bg-text-faint",
  },
};

const TARGET_TEXT = "text-accent";
const STOP_TEXT = "text-loss";
const HOLDING_TEXT = "text-purple-400";

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function metricNumber(
  candidate: OpportunityCandidate,
  key: string
): number | null {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------
// Cells and badges
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: ConvictionTier }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TIER_STYLES[tier.id].badge}`}
    >
      {tier.label}
    </span>
  );
}

/** Part 7 — numeric score + progress bar + institutional label. */
function ConvictionCell({ score }: { score: number }) {
  const tier = resolveConvictionTier(score);
  const style = TIER_STYLES[tier.id];
  const bounded = Math.max(0, Math.min(100, score));

  return (
    <div
      className="min-w-[150px]"
      aria-label={`Conviction ${score}, ${tier.label}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-base font-semibold text-text-primary tabular-nums">
          {score}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}
        >
          {tier.label}
        </span>
      </div>
      {tier.executable ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-border">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${style.bar}`}
            style={{ width: `${bounded}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function confidenceLabel(score: number): { label: string; tone: string } {
  if (score >= 85) return { label: "Very High", tone: "text-gain" };
  if (score >= 70) return { label: "High", tone: "text-gain" };
  if (score >= 50) return { label: "Medium", tone: "text-amber-400" };
  return { label: "Low", tone: "text-loss" };
}

function ConfidenceBadge({ score }: { score: number }) {
  const level = confidenceLabel(score);
  return (
    <span
      className={`text-xs font-semibold ${level.tone}`}
      title={`${score}% confidence`}
    >
      {level.label}
    </span>
  );
}

function HoldingBadge({ holding }: { holding: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-purple-400/25 bg-purple-400/10 px-1.5 py-0.5 text-[10px] font-medium ${HOLDING_TEXT}`}
    >
      {holding}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Expanded institutional research panel (Part 6)
// ---------------------------------------------------------------------------

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="data-label">{label}</p>
      <div className="mt-1 text-xs leading-relaxed text-text-secondary">
        {children}
      </div>
    </div>
  );
}

function DriverList({
  items,
  positive,
}: {
  items: Array<{ label: string; contribution: number }>;
  positive: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-text-muted">—</span>;
  }
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            <span className={positive ? "text-gain" : "text-loss"}>
              {positive ? "✓" : "⚠"}
            </span>
            {item.label}
          </span>
          <span
            className={`font-mono tabular-nums ${positive ? "text-gain" : "text-loss"}`}
          >
            {item.contribution > 0 ? "+" : ""}
            {item.contribution}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Part 4 — relative achievement windows per target. Never calendar dates. */
function TargetTimeline({ candidate }: { candidate: OpportunityCandidate }) {
  const windows = resolveTargetTimeEstimates(candidate);
  const finalTarget = resolveFinalTarget(candidate);
  const rows = [
    { label: "T1", price: candidate.target1, window: windows.target1 },
    { label: "T2", price: candidate.target2, window: windows.target2 },
    ...(finalTarget !== null
      ? [{ label: "Final", price: finalTarget, window: windows.finalTarget }]
      : []),
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="min-w-[120px] rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            {row.label}
          </p>
          <p className={`mt-0.5 font-mono text-sm font-semibold ${TARGET_TEXT}`}>
            {inr(row.price)}
          </p>
          <p className="text-[10px] text-text-muted">
            Expected <span className={HOLDING_TEXT}>{row.window}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function ExpandedDetails({
  candidate,
  view,
}: {
  candidate: OpportunityCandidate;
  view: InstitutionalCandidateView;
}) {
  const meta = presentCandidateRecommendationMeta(candidate);
  const volumeRatio = metricNumber(candidate, "volume_ratio");
  const adx = metricNumber(candidate, "adx");
  const momentum = metricNumber(candidate, "momentum");
  const delivery = metricNumber(candidate, "delivery_percent");
  const isLong = candidate.side === "Long";
  const thesisLines = candidate.reason
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 rounded-lg border border-surface-border-subtle bg-surface-hover/20 p-4">
      <div>
        <p className="data-label">Target Roadmap</p>
        <div className="mt-2">
          <TargetTimeline candidate={candidate} />
        </div>
        <EligibilityBadge candidate={candidate} />
        <OpportunityPipelineMeta candidate={candidate} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Trade Thesis">
          <ul className="space-y-0.5">
            {thesisLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DetailField>
        <DetailField label="Positive Drivers">
          <DriverList items={view.topPositiveDrivers} positive />
        </DetailField>
        <DetailField label="Negative Drivers">
          <DriverList items={view.topNegativeDrivers} positive={false} />
        </DetailField>
        <DetailField label="Why AI Selected This">
          {view.primaryReasons.length > 0 ? (
            <ul className="space-y-0.5">
              {view.primaryReasons.map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </DetailField>
        <DetailField label="Sector Strength">
          {view.sectorStrength != null ? (
            <span className="font-mono">{Math.round(view.sectorStrength)}</span>
          ) : (
            "—"
          )}
        </DetailField>
        <DetailField label="Volume Analysis">
          {volumeRatio != null
            ? `${volumeRatio.toFixed(1)}× average volume`
            : "—"}
          {view.volumeContribution != null && view.volumeContribution > 0
            ? ` · +${view.volumeContribution} conviction`
            : ""}
        </DetailField>
        <DetailField label="Trend Analysis">
          {adx != null
            ? `ADX ${Math.round(adx)} · ${adx >= 25 ? "trending" : "range-bound"}`
            : "—"}
        </DetailField>
        <DetailField label="Momentum">
          {momentum != null ? (
            <span className="font-mono">
              {momentum > 0 ? "+" : ""}
              {momentum.toFixed(1)}
            </span>
          ) : view.momentumContribution != null ? (
            <span className="font-mono">+{view.momentumContribution} pts</span>
          ) : (
            "—"
          )}
        </DetailField>
        <DetailField label="Support">
          <span className={`font-mono ${STOP_TEXT}`}>
            {inr(isLong ? candidate.stopLoss : candidate.target1)}
          </span>
        </DetailField>
        <DetailField label="Resistance">
          <span className={`font-mono ${TARGET_TEXT}`}>
            {inr(isLong ? candidate.target1 : candidate.stopLoss)}
          </span>
        </DetailField>
        <DetailField label="Liquidity">
          {delivery != null ? `Delivery ${Math.round(delivery)}%` : "—"}
        </DetailField>
        <DetailField label="Historical Success Rate">
          {view.historicalValidationAccuracy != null
            ? `${view.historicalValidationAccuracy}%`
            : "—"}
        </DetailField>
        <DetailField label="Strategy Type">{meta.strategy}</DetailField>
        <DetailField label="Risk Factors">
          <DriverList items={view.riskFactors} positive={false} />
        </DetailField>
        <DetailField label="Expected Catalyst">
          {view.expectedCatalyst ?? "—"}
        </DetailField>
        <DetailField label="Last Updated">
          {formatTimestamp(candidate.lastUpdatedAt)}
        </DetailField>
      </div>

      <DetailField label="AI Explanation">
        <ul className="space-y-0.5 font-mono text-[11px]">
          {view.decisionTrace.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </DetailField>
    </div>
  );
}

function CandidateExpansion({ candidate }: { candidate: OpportunityCandidate }) {
  const view = useMemo(
    () => buildInstitutionalCandidateView(candidate),
    [candidate]
  );
  return <ExpandedDetails candidate={candidate} view={view} />;
}

// ---------------------------------------------------------------------------
// Mobile cards (Part 10)
// ---------------------------------------------------------------------------

function MobileCandidateCard({
  candidate,
  expanded,
  onToggle,
}: {
  candidate: OpportunityCandidate;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = presentCandidateRecommendationMeta(candidate);
  const tier = resolveConvictionTier(candidate.aiConvictionScore);

  return (
    <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <StockLink symbol={candidate.symbol}>
          <p className="text-sm font-semibold text-text-primary hover:text-accent">
            {candidate.symbol}
          </p>
          <p className="max-w-[180px] truncate text-[10px] text-text-muted">
            {candidate.company}
          </p>
        </StockLink>
        <div className="flex flex-col items-end gap-1">
          <TierBadge tier={tier} />
          <Badge variant={candidate.side === "Long" ? "gain" : "loss"} size="sm">
            {candidate.side}
          </Badge>
        </div>
      </div>

      <div className="mt-3">
        <ConvictionCell score={candidate.aiConvictionScore} />
        <EligibilityBadge candidate={candidate} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="data-label">Entry Zone</dt>
          <dd className="font-mono text-text-secondary">
            {inr(candidate.entryZone.low)}–{inr(candidate.entryZone.high)}
          </dd>
        </div>
        <div>
          <dt className="data-label">Stop Loss</dt>
          <dd className={`font-mono ${STOP_TEXT}`}>{inr(candidate.stopLoss)}</dd>
        </div>
        <div>
          <dt className="data-label">Target 1</dt>
          <dd className={`font-mono ${TARGET_TEXT}`}>{inr(candidate.target1)}</dd>
        </div>
        <div>
          <dt className="data-label">Target 2</dt>
          <dd className={`font-mono ${TARGET_TEXT}`}>{inr(candidate.target2)}</dd>
        </div>
        <div>
          <dt className="data-label">Expected Holding</dt>
          <dd>
            <HoldingBadge holding={meta.expectedHoldingPeriod} />
          </dd>
        </div>
        <div>
          <dt className="data-label">Risk / Reward</dt>
          <dd className="font-mono text-gain">
            1 : {candidate.riskReward.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="data-label">Confidence</dt>
          <dd>
            <ConfidenceBadge score={candidate.confidencePercent} />
          </dd>
        </div>
        <div>
          <dt className="data-label">Status</dt>
          <dd className="text-text-secondary">{meta.statusLabel}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-surface-border-subtle py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-primary"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" /> Hide research summary
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" /> Research summary
          </>
        )}
      </button>

      {expanded ? (
        <div className="mt-3">
          <CandidateExpansion candidate={candidate} />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Watchlist candidates (60–74 conviction — never executable)
// ---------------------------------------------------------------------------

function WatchlistCandidates({
  candidates,
}: {
  candidates: OpportunityCandidate[];
}) {
  if (candidates.length === 0) return null;

  return (
    <div className="mt-6 border-t border-surface-border-subtle pt-5">
      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-text-muted" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Watchlist Candidates
          </h3>
          <p className="text-xs text-text-muted">
            Conviction 60–74 · monitoring only — not executable trade ideas
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate) => {
          const meta = presentCandidateRecommendationMeta(candidate);
          return (
            <div
              key={candidate.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2.5"
            >
              <div className="min-w-0">
                <StockLink symbol={candidate.symbol}>
                  <p className="text-xs font-semibold text-text-primary hover:text-accent">
                    {candidate.symbol}
                  </p>
                  <p className="max-w-[160px] truncate text-[10px] text-text-muted">
                    {candidate.company}
                  </p>
                </StockLink>
                <p className="mt-1 max-w-[220px] truncate text-[10px] text-text-muted">
                  {candidate.reason.split("\n")[0]}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <TierBadge tier={resolveConvictionTier(candidate.aiConvictionScore)} />
                <span className="font-mono text-xs font-semibold text-text-muted tabular-nums">
                  {candidate.opportunityScore ?? candidate.aiConvictionScore}
                </span>
                <EligibilityBadge candidate={candidate} compact />
                <HoldingBadge holding={meta.expectedHoldingPeriod} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function DashboardOpportunityPanel({
  initialState,
}: DashboardOpportunityPanelProps) {
  const [state, setState] = useState(initialState);
  const [activeCategory, setActiveCategory] =
    useState<OpportunityCategory>("intraday");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manualScanning, setManualScanning] = useState(false);
  const developerMode = process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true";

  // Part 1 — conviction gate over each category (presentation filter only).
  const gatedByCategory = useMemo(() => {
    const result = new Map<
      OpportunityCategory,
      ReturnType<typeof partitionByConvictionGate>
    >();
    for (const category of OPPORTUNITY_CATEGORIES) {
      result.set(
        category,
        partitionByConvictionGate(
          deriveCategoryCandidates(state, category).candidates
        )
      );
    }
    return result;
  }, [state]);

  const activeGate = gatedByCategory.get(activeCategory) ?? {
    executable: [],
    watchlist: [],
  };

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch("/api/opportunities");
      if (!response.ok) return;
      setState((await response.json()) as OpportunityEngineState);
    } catch {
      // Retain the last successful snapshot during transient network failures.
    }
  }, []);

  useEffect(() => {
    if (state.isFrozen) return;
    const interval = window.setInterval(() => void refreshState(), 60_000);
    return () => window.clearInterval(interval);
  }, [refreshState, state.isFrozen]);

  const runDeveloperScan = useCallback(async () => {
    setManualScanning(true);
    try {
      const response = await fetch("/api/opportunities/scan", { method: "POST" });
      if (!response.ok) return;
      const payload = (await response.json()) as { state: OpportunityEngineState };
      setState(payload.state);
    } finally {
      setManualScanning(false);
    }
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <SchedulerHealthCard />
      <CardHeader
        title="AI Opportunities"
        subtitle={`Pipeline-ranked · institutional conviction gate ≥75 · automatic 15-minute market-hours scan · ${state.universeSize.toLocaleString("en-IN")} NSE/BSE symbols${
          state.pipeline
            ? ` · regime ${state.pipeline.regime} · ${state.pipeline.eligibleStrategyCount} eligible strategies`
            : ""
        }`}
        action={
          state.isScanning ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </span>
          ) : developerMode ? (
            <button
              type="button"
              onClick={() => void runDeveloperScan()}
              disabled={manualScanning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 px-3 py-1.5 text-xs font-medium text-accent disabled:opacity-50"
            >
              {manualScanning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Developer Scan
            </button>
          ) : (
            <span className="rounded-full border border-gain/20 bg-gain/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gain">
              Automatic
            </span>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {OPPORTUNITY_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === category
                ? "bg-accent/15 text-accent"
                : "bg-surface-hover/50 text-text-muted hover:text-text-secondary"
            }`}
          >
            {getCategoryLabel(category)}
            <span className="ml-1.5 font-mono text-[10px] opacity-70">
              {gatedByCategory.get(category)?.executable.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs text-text-muted">
          {getCategorySubtitle(activeCategory)}
        </p>
      </div>

      {activeGate.executable.length === 0 ? (
        <div className="rounded-lg border border-surface-border-subtle px-4 py-10 text-center">
          <p className="mx-auto max-w-md text-sm text-text-muted">
            {CONVICTION_GATE_EMPTY_MESSAGE}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table (Part 5) */}
          <div className="hidden max-h-[480px] overflow-auto rounded-lg border border-surface-border-subtle md:block">
            <table className="w-full min-w-[1240px]">
              <thead className="sticky top-0 z-10 bg-surface-raised/95 backdrop-blur">
                <tr className="border-b border-surface-border-subtle text-left text-[10px] uppercase tracking-wider text-text-faint">
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Bias</th>
                  <th className="px-3 py-3 text-right">Entry Zone</th>
                  <th className="px-3 py-3 text-right">Stop Loss</th>
                  <th className="px-3 py-3 text-right">Target 1</th>
                  <th className="px-3 py-3 text-right">Target 2</th>
                  <th className="px-3 py-3">Expected Holding</th>
                  <th className="px-3 py-3 text-right">Risk Reward</th>
                  <th className="px-3 py-3">Institutional Conviction</th>
                  <th className="px-3 py-3">Confidence</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="w-12 px-3 py-3">
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeGate.executable.map((candidate) => {
                  const expanded = expandedId === candidate.id;
                  const meta = presentCandidateRecommendationMeta(candidate);
                  return (
                    <Fragment key={candidate.id}>
                      <tr className="border-b border-surface-border-subtle/60 transition-colors hover:bg-surface-hover/30">
                        <td className="px-3 py-3">
                          <StockLink symbol={candidate.symbol}>
                            <p className="text-xs font-semibold text-text-primary hover:text-accent">
                              {candidate.symbol}
                            </p>
                            <p className="max-w-[150px] truncate text-[10px] text-text-muted">
                              {candidate.company}
                            </p>
                          </StockLink>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={candidate.side === "Long" ? "gain" : "loss"}
                          >
                            {candidate.side}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-text-secondary">
                          {inr(candidate.entryZone.low)}–
                          {inr(candidate.entryZone.high)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-right font-mono text-xs ${STOP_TEXT}`}
                        >
                          {inr(candidate.stopLoss)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-right font-mono text-xs ${TARGET_TEXT}`}
                        >
                          {inr(candidate.target1)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-right font-mono text-xs ${TARGET_TEXT}`}
                        >
                          {inr(candidate.target2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <HoldingBadge holding={meta.expectedHoldingPeriod} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-gain">
                          1 : {candidate.riskReward.toFixed(1)}
                        </td>
                        <td className="px-3 py-3">
                          <ConvictionCell
                            score={
                              candidate.opportunityScore ?? candidate.aiConvictionScore
                            }
                          />
                          <EligibilityBadge candidate={candidate} compact />
                        </td>
                        <td className="px-3 py-3">
                          <ConfidenceBadge score={candidate.confidencePercent} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-text-secondary">
                          {meta.statusLabel}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(candidate.id)}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Collapse" : "Expand"} ${candidate.symbol}`}
                            className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={12} className="bg-surface/30 px-3 py-3">
                            <CandidateExpansion candidate={candidate} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (Part 10) */}
          <div className="space-y-3 md:hidden">
            {activeGate.executable.map((candidate) => (
              <MobileCandidateCard
                key={candidate.id}
                candidate={candidate}
                expanded={expandedId === candidate.id}
                onToggle={() => toggleExpanded(candidate.id)}
              />
            ))}
          </div>
        </>
      )}

      <WatchlistCandidates candidates={activeGate.watchlist} />
    </Card>
  );
}
