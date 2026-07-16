"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StockLink } from "@/components/ui/StockLink";
import { SchedulerHealthCard } from "@/components/dashboard/SchedulerHealthCard";
import { InstitutionalExplainabilityPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalExplainabilityPanel";
import { InstitutionalPlatformHealthPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalPlatformHealthPanel";
import { InstitutionalRecommendationPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalRecommendationPanel";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";
import { InstitutionalTrustPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustPanel";
import { InstitutionalValidationPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalValidationPanel";
import { OpportunityExplainabilityDrawer } from "@/components/dashboard/opportunity-intelligence/OpportunityExplainabilityDrawer";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";
import { ExecutiveInstitutionalDashboard } from "@/components/dashboard/institutional/ExecutiveInstitutionalDashboard";
import { PostMarketCertificationStrip } from "@/components/dashboard/opportunity-intelligence/PostMarketCertificationStrip";
import { TomorrowWatchlistMetaHeader } from "@/components/dashboard/opportunity-intelligence/TomorrowWatchlistMetaHeader";
import { bestCallStarRating, buildBestCallScoreBreakdown } from "@/lib/opportunity-engine/best-call";
import {
  RECOMMENDATION_METRIC_LABELS,
  RECOMMENDATION_SECTION_LABELS,
  formatInstitutionalConviction,
  presentCandidateRecommendationMeta,
} from "@/src/core/recommendations";
import {
  buildInstitutionalCandidateView,
  buildTomorrowWatchlistMeta,
  type InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import {
  CONVICTION_POSITIVE_DRIVER_LABELS,
  resolveConvictionDisplayBreakdown,
  resolveConvictionRiskAdjustments,
} from "@/lib/opportunity-engine/conviction-display";
import type { ConfidenceReasonContribution } from "@/lib/opportunity-engine/reasons";
import {
  CATEGORY_EMPTY_HEADLINE,
  deriveCategoryCandidates,
  deriveCategoryCount,
  derivePostMarketNearestCandidates,
  getCategoryLabel,
  getCategorySubtitle,
  POST_MARKET_SUBTITLES,
  type NearestCandidate,
} from "@/lib/opportunity-engine/presentation";
import {
  resolveConfidenceContributions,
} from "@/lib/opportunity-engine/reasons";
import {
  OPPORTUNITY_CATEGORIES,
  type ExpiredSetupOutcome,
  type GapProbabilityLevel,
  type OpportunityCandidate,
  type OpportunityCategory,
  type OpportunityEngineState,
  type PostMarketReport,
} from "@/lib/opportunity-engine/types";
import type { AISelfReview } from "@/lib/opportunity-engine/ai-review";
import type { TradeOutcome } from "@/lib/opportunity-engine/trade-outcome";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  Clock3,
  Copy,
  Loader2,
  PauseCircle,
  Pin,
  PinOff,
  Radar,
  RefreshCw,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface OpportunityEnginePanelProps {
  initialState: OpportunityEngineState;
}

const TABLE_MAX_VISIBLE_ROWS = 5;
const TABLE_ROW_HEIGHT_PX = 52;
const TABLE_HEADER_HEIGHT_PX = 36;
const TABLE_BODY_MAX_HEIGHT =
  TABLE_MAX_VISIBLE_ROWS * TABLE_ROW_HEIGHT_PX + TABLE_HEADER_HEIGHT_PX;

const PIN_STORAGE_KEY = "equityos-opportunity-pinned";
const WATCHLIST_STORAGE_KEY = "equityos-opportunity-watchlist";

type SortDirection = "asc" | "desc";
type SortKey =
  | "rank"
  | "symbol"
  | "side"
  | "entry"
  | "stopLoss"
  | "target1"
  | "riskReward"
  | "aiConvictionScore"
  | "confidencePercent"
  | "bestCallScore"
  | "gapProbability"
  | "highestConviction"
  | "maximumGainAfterSignal"
  | "setupDurationHours";

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatTimeOnly(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    timeStyle: "short",
  }).format(new Date(iso));
}

function Price({ value }: { value: number }) {
  if (value <= 0) return <span className="text-xs text-text-muted">—</span>;
  return (
    <span className="font-mono text-xs text-text-secondary tabular-nums">
      ₹{value.toLocaleString("en-IN")}
    </span>
  );
}

function DirectionBadge({ side }: { side: "Long" | "Short" }) {
  return <Badge variant={side === "Long" ? "gain" : "loss"}>{side}</Badge>;
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="inline-flex min-w-[2rem] items-center justify-center rounded-md bg-surface-hover/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-text-secondary">
      #{rank}
    </span>
  );
}

function readStoredSymbols(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.map((symbol) => symbol.toUpperCase()));
  } catch {
    return new Set();
  }
}

function writeStoredSymbols(key: string, symbols: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...symbols]));
}

function splitDriverContributions(contributions: ConfidenceReasonContribution[]): {
  positives: ConfidenceReasonContribution[];
  riskAdjustments: ConfidenceReasonContribution[];
} {
  return {
    positives: contributions.filter((item) => item.contribution > 0),
    riskAdjustments: contributions.filter((item) => item.contribution < 0),
  };
}

function DriverBreakdownSections({
  positives,
  riskAdjustments,
  finalLabel,
  finalValue,
  compact = false,
}: {
  positives: Array<{ label: string; contribution: number }>;
  riskAdjustments: Array<{ label: string; contribution: number }>;
  finalLabel: string;
  finalValue: number;
  compact?: boolean;
}) {
  const textSize = compact ? "text-[10px]" : "text-[11px]";
  const sectionLabelClass = "mb-1 text-[9px] font-medium uppercase tracking-wider text-text-faint";

  return (
    <div className="space-y-2">
      {positives.length > 0 && (
        <div>
          <p className={sectionLabelClass}>Positive Drivers</p>
          <div className="space-y-0.5">
            {positives.map((item) => (
              <div key={item.label} className={`flex items-center justify-between ${textSize}`}>
                <span className="flex items-center gap-1 text-text-muted">
                  <span className="text-gain">✓</span>
                  <span>{item.label}</span>
                </span>
                <span className="font-mono text-gain tabular-nums">+{item.contribution}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {riskAdjustments.length > 0 && (
        <div>
          <p className={sectionLabelClass}>Risk Adjustments</p>
          <div className="space-y-0.5">
            {riskAdjustments.map((item) => (
              <div key={item.label} className={`flex items-center justify-between ${textSize}`}>
                <span className="flex items-center gap-1 text-text-muted">
                  <span className="text-loss">⚠</span>
                  <span>{item.label}</span>
                </span>
                <span className="font-mono text-loss tabular-nums">{item.contribution}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`flex items-center justify-between border-t border-surface-border-subtle/60 pt-1.5 ${textSize} font-semibold`}
      >
        <span className="text-text-secondary">{finalLabel}</span>
        <span className="font-mono text-gain tabular-nums">{finalValue}</span>
      </div>
    </div>
  );
}

function ConvictionPopup({
  candidate,
  onInspect,
}: {
  candidate: OpportunityCandidate;
  onInspect?: (candidate: OpportunityCandidate) => void;
}) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const breakdown = resolveConvictionDisplayBreakdown(candidate);
  const riskAdjustments = resolveConvictionRiskAdjustments(candidate);
  const positiveDrivers = (
    Object.keys(CONVICTION_POSITIVE_DRIVER_LABELS) as (keyof typeof CONVICTION_POSITIVE_DRIVER_LABELS)[]
  )
    .map((key) => ({
      label: CONVICTION_POSITIVE_DRIVER_LABELS[key],
      contribution: breakdown[key],
    }))
    .filter((item) => item.contribution > 0);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block text-right" ref={popupRef}>
      <button
        type="button"
        onClick={() => {
          if (onInspect) {
            onInspect(candidate);
            return;
          }
          setOpen((value) => !value);
        }}
        title="Open institutional AI conviction analysis"
        className="group/conviction rounded px-1 py-0.5 transition hover:bg-surface-hover/60"
      >
        <span className="font-mono text-xs font-medium text-gain tabular-nums">
          {candidate.aiConvictionScore}
        </span>
        <span className="block text-[9px] text-text-faint group-hover/conviction:text-text-muted">
          Tap for Analysis
        </span>
      </button>
      {open && !onInspect && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-surface-border bg-surface-raised p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            AI Conviction Breakdown
          </p>
          <DriverBreakdownSections
            positives={positiveDrivers}
            riskAdjustments={riskAdjustments}
            finalLabel="Final Conviction"
            finalValue={breakdown.total}
          />
        </div>
      )}
    </div>
  );
}

function ConfidenceBreakdown({ candidate }: { candidate: OpportunityCandidate }) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { positives, riskAdjustments } = splitDriverContributions(
    resolveConfidenceContributions(candidate)
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block text-right" ref={popupRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="View confidence factor breakdown"
        className="rounded px-1 py-0.5 font-mono text-xs text-text-secondary tabular-nums transition hover:bg-surface-hover/60"
      >
        {candidate.confidencePercent}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-surface-border bg-surface-raised p-3 shadow-lg">
          <DriverBreakdownSections
            positives={positives}
            riskAdjustments={riskAdjustments}
            finalLabel="Final Conviction"
            finalValue={candidate.aiConvictionScore}
          />
        </div>
      )}
    </div>
  );
}

function ReasonCell({ candidate }: { candidate: OpportunityCandidate }) {
  const { positives, riskAdjustments } = splitDriverContributions(
    resolveConfidenceContributions(candidate)
  );

  if (positives.length === 0 && riskAdjustments.length === 0) {
    return <span className="text-[11px] text-text-muted">—</span>;
  }

  return (
    <div className="max-w-[260px]">
      <DriverBreakdownSections
        positives={positives.slice(0, 5)}
        riskAdjustments={riskAdjustments}
        finalLabel="Final Conviction"
        finalValue={candidate.aiConvictionScore}
        compact
      />
    </div>
  );
}

function InstitutionalConvictionCell({ candidate }: { candidate: OpportunityCandidate }) {
  const [hovered, setHovered] = useState(false);
  const score = candidate.bestCallScore ?? candidate.aiConvictionScore;
  const breakdown = buildBestCallScoreBreakdown(candidate);
  const positives = breakdown.filter((item) => item.contribution >= 0);
  const riskAdjustments = breakdown
    .filter((item) => item.contribution < 0)
    .map((item) => ({ label: item.label, contribution: item.contribution }));
  const meta = presentCandidateRecommendationMeta(candidate);

  return (
    <div
      className="relative inline-block text-right"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p
        className="text-sm tracking-wider text-gain"
        title={`${RECOMMENDATION_METRIC_LABELS.institutionalConviction} ${formatInstitutionalConviction(score)}`}
      >
        {bestCallStarRating(score)}
      </p>
      <p className="font-mono text-[10px] text-text-muted tabular-nums">
        {RECOMMENDATION_METRIC_LABELS.institutionalConviction}{" "}
        {formatInstitutionalConviction(score)}
      </p>
      <p className="font-mono text-[9px] text-text-faint tabular-nums">
        {RECOMMENDATION_METRIC_LABELS.conviction} {candidate.aiConvictionScore} ·{" "}
        {RECOMMENDATION_METRIC_LABELS.trust} {candidate.confidencePercent}
      </p>
      {hovered && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-surface-border bg-surface-raised p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            {RECOMMENDATION_METRIC_LABELS.institutionalConviction} Breakdown
          </p>
          <p className="mb-2 text-[10px] text-text-muted">
            {meta.strategy} · {meta.expectedHoldingPeriod} · {meta.statusLabel}
          </p>
          <DriverBreakdownSections
            positives={positives.map((item) => ({
              label: item.label,
              contribution: item.contribution,
            }))}
            riskAdjustments={riskAdjustments}
            finalLabel={RECOMMENDATION_METRIC_LABELS.institutionalConviction}
            finalValue={score}
          />
        </div>
      )}
    </div>
  );
}

function gapLevelVariant(level: GapProbabilityLevel | undefined): "gain" | "default" | "loss" {
  if (level === "High") return "gain";
  if (level === "Medium") return "default";
  return "loss";
}

function expiredOutcomeVariant(outcome: ExpiredSetupOutcome): "gain" | "loss" | "default" {
  if (outcome === "Target Hit" || outcome === "Target1 Hit") return "gain";
  if (
    outcome === "Stopped Out" ||
    outcome === "Failed Breakout" ||
    outcome === "Trend Reversed" ||
    outcome === "Rejected at Resistance"
  ) {
    return "loss";
  }
  return "default";
}

function ConvictionDriversCell({ candidate }: { candidate: OpportunityCandidate }) {
  const reasons = candidate.bestCallReasons ?? [];
  const meta = presentCandidateRecommendationMeta(candidate);

  if (reasons.length === 0) {
    return <ReasonCell candidate={candidate} />;
  }

  return (
    <div className="max-w-[280px]">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {meta.strategy} · {meta.expectedHoldingPeriod}
      </p>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {RECOMMENDATION_METRIC_LABELS.convictionDrivers}
      </p>
      <ul className="space-y-0.5 text-[11px] leading-relaxed text-text-muted">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1">
            <span className="mt-px text-gain">✓</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-text-faint">{meta.statusLabel}</p>
    </div>
  );
}

const headerClass =
  "sticky top-0 z-10 whitespace-nowrap bg-surface-raised/95 pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint backdrop-blur-sm";
const cellClass = "whitespace-nowrap py-3 align-top";

function SortButton({
  label,
  active,
  direction,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 transition hover:text-text-secondary ${
        align === "right" ? "ml-auto" : ""
      } ${active ? "text-text-secondary" : ""}`}
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

function ScrollTableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-x-auto overflow-y-auto rounded-lg border border-surface-border-subtle/80"
      style={{ maxHeight: TABLE_BODY_MAX_HEIGHT }}
    >
      {children}
    </div>
  );
}

function StockActions({
  symbol,
  pinned,
  watchlisted,
  onPin,
  onWatchlist,
  onCopy,
}: {
  symbol: string;
  pinned: boolean;
  watchlisted: boolean;
  onPin: (symbol: string) => void;
  onWatchlist: (symbol: string) => void;
  onCopy?: (symbol: string) => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
      <button
        type="button"
        title="Copy symbol"
        onClick={() => onCopy?.(symbol)}
        className="rounded p-0.5 text-text-faint transition hover:bg-surface-hover hover:text-accent"
      >
        <Copy className="h-3 w-3" />
      </button>
      <button
        type="button"
        title={pinned ? "Unpin" : "Pin stock"}
        onClick={() => onPin(symbol)}
        className="rounded p-0.5 text-text-faint transition hover:bg-surface-hover hover:text-accent"
      >
        {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
      </button>
      <button
        type="button"
        title={watchlisted ? "On watchlist" : "Add to watchlist"}
        onClick={() => onWatchlist(symbol)}
        className={`rounded p-0.5 transition hover:bg-surface-hover ${
          watchlisted ? "text-accent" : "text-text-faint hover:text-accent"
        }`}
      >
        <Star className={`h-3 w-3 ${watchlisted ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}

function sortCandidates(
  candidates: OpportunityCandidate[],
  sortKey: SortKey,
  direction: SortDirection,
  pinned: Set<string>
): OpportunityCandidate[] {
  const factor = direction === "asc" ? 1 : -1;

  const sorted = [...candidates].sort((a, b) => {
    const aPinned = pinned.has(a.symbol.toUpperCase()) ? 1 : 0;
    const bPinned = pinned.has(b.symbol.toUpperCase()) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    let cmp = 0;
    switch (sortKey) {
      case "rank":
        cmp = a.rank - b.rank;
        break;
      case "symbol":
        cmp = a.symbol.localeCompare(b.symbol);
        break;
      case "side":
        cmp = a.side.localeCompare(b.side);
        break;
      case "entry":
        cmp = a.entryZone.low - b.entryZone.low;
        break;
      case "stopLoss":
        cmp = a.stopLoss - b.stopLoss;
        break;
      case "target1":
        cmp = a.target1 - b.target1;
        break;
      case "riskReward":
        cmp = a.riskReward - b.riskReward;
        break;
      case "aiConvictionScore":
        cmp = a.aiConvictionScore - b.aiConvictionScore;
        break;
      case "confidencePercent":
        cmp = a.confidencePercent - b.confidencePercent;
        break;
      case "bestCallScore":
        cmp = (a.bestCallScore ?? 0) - (b.bestCallScore ?? 0);
        break;
      case "gapProbability":
        cmp = (a.gapProbability ?? 0) - (b.gapProbability ?? 0);
        break;
      case "highestConviction":
        cmp =
          (a.highestConviction ?? a.aiConvictionScore) -
          (b.highestConviction ?? b.aiConvictionScore);
        break;
      case "maximumGainAfterSignal":
        cmp = (a.maximumGainAfterSignal ?? 0) - (b.maximumGainAfterSignal ?? 0);
        break;
      case "setupDurationHours":
        cmp = (a.setupDurationHours ?? 0) - (b.setupDurationHours ?? 0);
        break;
      default:
        cmp = a.rank - b.rank;
    }
    return cmp * factor;
  });

  return sorted.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function useTableSort(defaultKey: SortKey = "rank") {
  const [sortKey, setSortKey] = useState<SortKey>(defaultKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection(key === "rank" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  return { sortKey, sortDirection, toggleSort };
}

function NearestCandidatesPanel({ candidates }: { candidates: NearestCandidate[] }) {
  if (candidates.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-faint">
        Nearest Candidates
      </p>
      <p className="mb-3 text-[11px] text-text-muted">
        Top almost-qualified stocks that narrowly missed today&apos;s filters.
      </p>
      <div className="space-y-2">
        {candidates.map((candidate) => (
          <div
            key={candidate.symbol}
            className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-surface-border-subtle/60 px-3 py-2"
          >
            <div>
              <StockLink symbol={candidate.symbol}>
                <span className="text-xs font-semibold text-text-primary hover:text-accent">
                  {candidate.symbol}
                </span>
              </StockLink>
              <p className="text-[10px] text-text-muted">{candidate.company}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-gain tabular-nums">
                Conviction {candidate.conviction}
              </p>
              <ul className="mt-1 max-w-[220px] text-[10px] text-text-muted">
                {candidate.filterFailures.map((failure) => (
                  <li key={failure}>· {failure}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptySection({
  headline,
  message,
  nearestCandidates,
}: {
  headline?: string;
  message: string;
  nearestCandidates?: NearestCandidate[];
}) {
  return (
    <div>
      <div className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-6 text-center">
        <p className="mb-2 text-sm font-medium text-text-secondary">
          {headline ?? "No candidates matched today's institutional criteria."}
        </p>
        <p className="mx-auto max-w-xl text-sm text-text-muted">{message}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled
            title="Backend support coming soon"
            className="rounded-lg border border-surface-border px-3 py-1.5 text-[11px] font-medium text-text-faint disabled:cursor-not-allowed"
          >
            View rejected candidates
          </button>
          <button
            type="button"
            disabled
            title="Backend support coming soon"
            className="rounded-lg border border-surface-border px-3 py-1.5 text-[11px] font-medium text-text-faint disabled:cursor-not-allowed"
          >
            Explain filters
          </button>
        </div>
      </div>
      {nearestCandidates && nearestCandidates.length > 0 && (
        <NearestCandidatesPanel candidates={nearestCandidates} />
      )}
    </div>
  );
}

function OpportunityTable({
  candidates,
  variant = "default",
  pinned,
  watchlisted,
  onPin,
  onWatchlist,
  onCopy,
  platformSnapshot = null,
  onInspect,
}: {
  candidates: OpportunityCandidate[];
  variant?: "default" | "bestCall" | "watchlist";
  pinned: Set<string>;
  watchlisted: Set<string>;
  onPin: (symbol: string) => void;
  onWatchlist: (symbol: string) => void;
  onCopy?: (symbol: string) => void;
  platformSnapshot?: InstitutionalPlatformSnapshot | null;
  onInspect?: (candidate: OpportunityCandidate) => void;
}) {
  const defaultSort: SortKey =
    variant === "bestCall" ? "bestCallScore" : variant === "watchlist" ? "gapProbability" : "rank";
  const { sortKey, sortDirection, toggleSort } = useTableSort(defaultSort);

  const sorted = useMemo(
    () => sortCandidates(candidates, sortKey, sortDirection, pinned),
    [candidates, sortKey, sortDirection, pinned]
  );

  if (variant === "watchlist") {
    return (
      <ScrollTableWrapper>
        <table className="w-full min-w-[1280px]">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className={headerClass}>
                <SortButton
                  label="#"
                  active={sortKey === "rank"}
                  direction={sortDirection}
                  onClick={() => toggleSort("rank")}
                />
              </th>
              <th className={headerClass}>
                <SortButton
                  label="Stock"
                  active={sortKey === "symbol"}
                  direction={sortDirection}
                  onClick={() => toggleSort("symbol")}
                />
              </th>
              <th className={`${headerClass} text-right`}>Generated</th>
              <th className={`${headerClass} text-right`}>Valid Until</th>
              <th className={headerClass}>Holding</th>
              <th className={`${headerClass} text-right`}>
                <SortButton
                  label="AI Confidence"
                  active={sortKey === "confidencePercent"}
                  direction={sortDirection}
                  onClick={() => toggleSort("confidencePercent")}
                  align="right"
                />
              </th>
              <th className={`${headerClass} text-right`}>Trust</th>
              <th className={`${headerClass} text-right`}>Validation</th>
              <th className={headerClass}>Risk</th>
              <th className={`${headerClass} text-right`}>
                <SortButton
                  label="Probability"
                  active={sortKey === "gapProbability"}
                  direction={sortDirection}
                  onClick={() => toggleSort("gapProbability")}
                  align="right"
                />
              </th>
              <th className={headerClass}>Catalyst</th>
              <th className={headerClass}>Reason Summary</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((candidate) => {
              const view = buildInstitutionalCandidateView(
                candidate,
                platformSnapshot,
                null
              );
              return (
                <tr
                  key={candidate.id}
                  onClick={() => onInspect?.(candidate)}
                  className="group cursor-pointer border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/40"
                >
                  <td className={cellClass}>
                    <RankBadge rank={candidate.rank} />
                  </td>
                  <td className={cellClass} onClick={(e) => e.stopPropagation()}>
                    <StockLink symbol={candidate.symbol}>
                      <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                        {candidate.symbol}
                      </p>
                      <p className="max-w-[140px] truncate text-[10px] text-text-muted">
                        {candidate.company}
                      </p>
                    </StockLink>
                    <InstitutionalTrustBadges badges={view.badges.slice(0, 3)} compact />
                    <StockActions
                      symbol={candidate.symbol}
                      pinned={pinned.has(candidate.symbol.toUpperCase())}
                      watchlisted={watchlisted.has(candidate.symbol.toUpperCase())}
                      onPin={onPin}
                      onWatchlist={onWatchlist}
                      onCopy={onCopy}
                    />
                  </td>
                  <td className={`${cellClass} text-right font-mono text-[10px] text-text-muted`}>
                    {formatTimeOnly(candidate.firstDetectedAt)}
                  </td>
                  <td className={`${cellClass} text-right font-mono text-[10px] text-text-muted`}>
                    {candidate.timeHorizon ?? "Session"}
                  </td>
                  <td className={`${cellClass} text-[11px] text-text-muted`}>
                    {candidate.timeHorizon ?? "Intraday"}
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => onInspect?.(candidate)}
                      className="font-mono text-xs text-text-secondary tabular-nums hover:text-accent"
                    >
                      {candidate.confidencePercent}%
                    </button>
                  </td>
                  <td className={`${cellClass} text-right font-mono text-xs text-text-secondary`}>
                    {view.trustScore ?? "—"}
                  </td>
                  <td className={`${cellClass} text-right font-mono text-xs text-text-secondary`}>
                    {view.validationScore ?? "—"}
                  </td>
                  <td className={`${cellClass} text-[11px] text-text-muted`}>
                    {view.riskRating ?? "—"}
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant={gapLevelVariant(candidate.gapProbabilityLevel)}>
                        {candidate.gapProbabilityLevel ?? "—"}
                      </Badge>
                      <span className="font-mono text-[10px] text-text-muted tabular-nums">
                        {candidate.gapProbability != null
                          ? `${candidate.gapProbability}%`
                          : "—"}
                      </span>
                    </div>
                  </td>
                  <td className={`${cellClass} text-[11px] text-text-muted`}>
                    {candidate.expectedCatalyst ?? "—"}
                  </td>
                  <td className={`${cellClass} max-w-[220px] text-[11px] text-text-muted`}>
                    {view.primaryReasons[0] ?? candidate.reason.split("\n")[0] ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollTableWrapper>
    );
  }

  if (variant === "bestCall") {
    return (
      <ScrollTableWrapper>
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className={headerClass}>
                <SortButton
                  label="#"
                  active={sortKey === "rank"}
                  direction={sortDirection}
                  onClick={() => toggleSort("rank")}
                />
              </th>
              <th className={headerClass}>
                <SortButton
                  label="Stock"
                  active={sortKey === "symbol"}
                  direction={sortDirection}
                  onClick={() => toggleSort("symbol")}
                />
              </th>
              <th className={headerClass}>Bias</th>
              <th className={`${headerClass} text-right`}>Entry Zone</th>
              <th className={`${headerClass} text-right`}>Stop Loss</th>
              <th className={`${headerClass} text-right`}>Target 1</th>
              <th className={`${headerClass} text-right`}>Target 2</th>
              <th className={`${headerClass} text-right`}>R/R</th>
              <th className={`${headerClass} text-right`}>
                <SortButton
                  label={RECOMMENDATION_METRIC_LABELS.institutionalConviction}
                  active={sortKey === "bestCallScore"}
                  direction={sortDirection}
                  onClick={() => toggleSort("bestCallScore")}
                  align="right"
                />
              </th>
              <th className={headerClass}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((candidate) => (
                <tr
                  key={candidate.id}
                  onClick={() => onInspect?.(candidate)}
                  className="group cursor-pointer border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/40"
                >
                  <td className={cellClass}>
                    <RankBadge rank={candidate.rank} />
                  </td>
                  <td className={cellClass} onClick={(e) => e.stopPropagation()}>
                    <StockLink symbol={candidate.symbol}>
                      <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                        {candidate.symbol}
                      </p>
                      <p className="max-w-[140px] truncate text-[10px] text-text-muted">
                        {candidate.company}
                      </p>
                    </StockLink>
                    <StockActions
                      symbol={candidate.symbol}
                      pinned={pinned.has(candidate.symbol.toUpperCase())}
                      watchlisted={watchlisted.has(candidate.symbol.toUpperCase())}
                      onPin={onPin}
                      onWatchlist={onWatchlist}
                      onCopy={onCopy}
                    />
                  </td>
                  <td className={cellClass}>
                    <DirectionBadge side={candidate.side} />
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <span className="font-mono text-xs text-text-secondary tabular-nums">
                      ₹{candidate.entryZone.low.toLocaleString("en-IN")}–
                      {candidate.entryZone.high.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <Price value={candidate.stopLoss} />
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <Price value={candidate.target1} />
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <Price value={candidate.target2} />
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <span className="font-mono text-xs font-medium text-gain">
                      1:{candidate.riskReward.toFixed(1)}
                    </span>
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <InstitutionalConvictionCell candidate={candidate} />
                  </td>
                  <td className={cellClass}>
                    <ConvictionDriversCell candidate={candidate} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </ScrollTableWrapper>
    );
  }

  return (
    <ScrollTableWrapper>
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="border-b border-surface-border-subtle text-left">
            <th className={headerClass}>
              <SortButton
                label="#"
                active={sortKey === "rank"}
                direction={sortDirection}
                onClick={() => toggleSort("rank")}
              />
            </th>
            <th className={headerClass}>
              <SortButton
                label="Stock"
                active={sortKey === "symbol"}
                direction={sortDirection}
                onClick={() => toggleSort("symbol")}
              />
            </th>
            <th className={headerClass}>
              <SortButton
                label="Bias"
                active={sortKey === "side"}
                direction={sortDirection}
                onClick={() => toggleSort("side")}
              />
            </th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Entry Zone"
                active={sortKey === "entry"}
                direction={sortDirection}
                onClick={() => toggleSort("entry")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Stop Loss"
                active={sortKey === "stopLoss"}
                direction={sortDirection}
                onClick={() => toggleSort("stopLoss")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Target 1"
                active={sortKey === "target1"}
                direction={sortDirection}
                onClick={() => toggleSort("target1")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>Target 2</th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="R/R"
                active={sortKey === "riskReward"}
                direction={sortDirection}
                onClick={() => toggleSort("riskReward")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="AI Conviction"
                active={sortKey === "aiConvictionScore"}
                direction={sortDirection}
                onClick={() => toggleSort("aiConvictionScore")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Confidence"
                active={sortKey === "confidencePercent"}
                direction={sortDirection}
                onClick={() => toggleSort("confidencePercent")}
                align="right"
              />
            </th>
            <th className={headerClass}>Reason</th>
            <th className={`${headerClass} text-right`}>First Detected</th>
            <th className={`${headerClass} text-right`}>Last Detected</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((candidate) => {
            const badges = buildInstitutionalCandidateView(
              candidate,
              platformSnapshot
            ).badges;
            return (
            <tr
              key={candidate.id}
              onClick={() => onInspect?.(candidate)}
              className="group cursor-pointer border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/40"
            >
              <td className={cellClass}>
                <RankBadge rank={candidate.rank} />
              </td>
              <td className={cellClass} onClick={(e) => e.stopPropagation()}>
                <StockLink symbol={candidate.symbol}>
                  <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                    {candidate.symbol}
                  </p>
                  <p className="max-w-[140px] truncate text-[10px] text-text-muted">
                    {candidate.company}
                  </p>
                </StockLink>
                <InstitutionalTrustBadges badges={badges.slice(0, 4)} compact />
                <StockActions
                  symbol={candidate.symbol}
                  pinned={pinned.has(candidate.symbol.toUpperCase())}
                  watchlisted={watchlisted.has(candidate.symbol.toUpperCase())}
                  onPin={onPin}
                  onWatchlist={onWatchlist}
                  onCopy={onCopy}
                />
              </td>
              <td className={cellClass}>
                <DirectionBadge side={candidate.side} />
              </td>
              <td className={`${cellClass} text-right`}>
                <span className="font-mono text-xs text-text-secondary tabular-nums">
                  ₹{candidate.entryZone.low.toLocaleString("en-IN")}–
                  {candidate.entryZone.high.toLocaleString("en-IN")}
                </span>
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={candidate.stopLoss} />
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={candidate.target1} />
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={candidate.target2} />
              </td>
              <td className={`${cellClass} text-right`}>
                <span className="font-mono text-xs font-medium text-gain">
                  1:{candidate.riskReward.toFixed(1)}
                </span>
              </td>
              <td className={`${cellClass} text-right`}>
                <ConvictionPopup candidate={candidate} onInspect={onInspect} />
              </td>
              <td className={`${cellClass} text-right`}>
                <ConfidenceBreakdown candidate={candidate} />
              </td>
              <td className={cellClass}>
                <ReasonCell candidate={candidate} />
              </td>
              <td className={`${cellClass} text-right`}>
                <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock3 className="h-3 w-3" />
                  {formatTimestamp(candidate.firstDetectedAt)}
                </span>
              </td>
              <td className={`${cellClass} text-right`}>
                <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock3 className="h-3 w-3" />
                  {formatTimestamp(candidate.lastDetectedAt)}
                </span>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollTableWrapper>
  );
}

function ExpiredSetupsTable({
  candidates,
  pinned,
  watchlisted,
  onPin,
  onWatchlist,
  onCopy,
}: {
  candidates: OpportunityCandidate[];
  pinned: Set<string>;
  watchlisted: Set<string>;
  onPin: (symbol: string) => void;
  onWatchlist: (symbol: string) => void;
  onCopy?: (symbol: string) => void;
}) {
  const { sortKey, sortDirection, toggleSort } = useTableSort("rank");
  const sorted = useMemo(
    () => sortCandidates(candidates, sortKey, sortDirection, pinned),
    [candidates, sortKey, sortDirection, pinned]
  );

  return (
    <ScrollTableWrapper>
      <table className="w-full min-w-[1080px]">
        <thead>
          <tr className="border-b border-surface-border-subtle text-left">
            <th className={headerClass}>
              <SortButton
                label="#"
                active={sortKey === "rank"}
                direction={sortDirection}
                onClick={() => toggleSort("rank")}
              />
            </th>
            <th className={headerClass}>
              <SortButton
                label="Stock"
                active={sortKey === "symbol"}
                direction={sortDirection}
                onClick={() => toggleSort("symbol")}
              />
            </th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Highest Conviction"
                active={sortKey === "highestConviction"}
                direction={sortDirection}
                onClick={() => toggleSort("highestConviction")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>Peak Time</th>
            <th className={headerClass}>Outcome</th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Max Gain"
                active={sortKey === "maximumGainAfterSignal"}
                direction={sortDirection}
                onClick={() => toggleSort("maximumGainAfterSignal")}
                align="right"
              />
            </th>
            <th className={`${headerClass} text-right`}>Max Drawdown</th>
            <th className={`${headerClass} text-right`}>
              <SortButton
                label="Duration"
                active={sortKey === "setupDurationHours"}
                direction={sortDirection}
                onClick={() => toggleSort("setupDurationHours")}
                align="right"
              />
            </th>
            <th className={headerClass}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((candidate) => {
            const outcome = (candidate.expiredOutcome ?? "Momentum Faded") as ExpiredSetupOutcome;
            return (
              <tr
                key={candidate.id}
                className="group border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/40"
              >
                <td className={cellClass}>
                  <RankBadge rank={candidate.rank} />
                </td>
                <td className={cellClass}>
                  <StockLink symbol={candidate.symbol}>
                    <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                      {candidate.symbol}
                    </p>
                    <p className="text-[10px] text-text-muted">{candidate.company}</p>
                  </StockLink>
                  <StockActions
                    symbol={candidate.symbol}
                    pinned={pinned.has(candidate.symbol.toUpperCase())}
                    watchlisted={watchlisted.has(candidate.symbol.toUpperCase())}
                    onPin={onPin}
                    onWatchlist={onWatchlist}
                    onCopy={onCopy}
                  />
                </td>
                <td className={`${cellClass} text-right font-mono text-xs text-gain tabular-nums`}>
                  {candidate.highestConviction ?? candidate.aiConvictionScore}
                </td>
                <td className={`${cellClass} text-right text-[10px] text-text-muted`}>
                  {formatTimeOnly(candidate.peakTime ?? candidate.lastDetectedAt)}
                </td>
                <td className={cellClass}>
                  <Badge variant={expiredOutcomeVariant(outcome)}>{outcome}</Badge>
                </td>
                <td className={`${cellClass} text-right font-mono text-xs text-gain tabular-nums`}>
                  +{(candidate.maximumGainAfterSignal ?? 0).toFixed(2)}%
                </td>
                <td className={`${cellClass} text-right font-mono text-xs text-loss tabular-nums`}>
                  {(candidate.maximumDrawdownAfterSignal ?? 0).toFixed(2)}%
                </td>
                <td className={`${cellClass} text-right font-mono text-xs text-text-muted tabular-nums`}>
                  {(candidate.setupDurationHours ?? 0).toFixed(1)}h
                </td>
                <td className={`${cellClass} text-[11px] text-text-muted`}>
                  {candidate.expiredReason ?? candidate.reasonMissed ?? candidate.reason}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollTableWrapper>
  );
}

function TradeOutcomesTable({ outcomes }: { outcomes: TradeOutcome[] }) {
  if (outcomes.length === 0) return null;

  const statusLabel: Record<TradeOutcome["currentStatus"], string> = {
    target2_hit: "Target 2 Hit",
    target1_hit: "Target 1 Hit",
    stopped: "Stopped Out",
    open: "Open",
    breakeven: "Breakeven",
  };

  const visible = outcomes.slice(0, TABLE_MAX_VISIBLE_ROWS);

  return (
    <ScrollTableWrapper>
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="border-b border-surface-border-subtle text-left">
            <th className={headerClass}>#</th>
            <th className={headerClass}>Stock</th>
            <th className={`${headerClass} text-right`}>Entry</th>
            <th className={`${headerClass} text-right`}>SL</th>
            <th className={`${headerClass} text-right`}>T1</th>
            <th className={`${headerClass} text-right`}>T2</th>
            <th className={`${headerClass} text-right`}>Highest Gain</th>
            <th className={`${headerClass} text-right`}>Max Drawdown</th>
            <th className={headerClass}>Status</th>
            <th className={`${headerClass} text-right`}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((outcome, index) => (
            <tr
              key={outcome.candidateId}
              className="group border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/40"
            >
              <td className={cellClass}>
                <RankBadge rank={index + 1} />
              </td>
              <td className={cellClass}>
                <StockLink symbol={outcome.symbol}>
                  <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                    {outcome.symbol}
                  </p>
                </StockLink>
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={outcome.entry} />
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={outcome.stopLoss} />
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={outcome.target1} />
              </td>
              <td className={`${cellClass} text-right`}>
                <Price value={outcome.target2} />
              </td>
              <td className={`${cellClass} text-right font-mono text-xs text-gain tabular-nums`}>
                +{outcome.highestGainPercent.toFixed(2)}%
              </td>
              <td className={`${cellClass} text-right font-mono text-xs text-loss tabular-nums`}>
                {outcome.lowestDrawdownPercent.toFixed(2)}%
              </td>
              <td className={`${cellClass} text-[11px] text-text-muted`}>
                {statusLabel[outcome.currentStatus]}
              </td>
              <td className={`${cellClass} text-right`}>
                <Badge
                  variant={
                    outcome.tradeGrade === "A" || outcome.tradeGrade === "B" ? "gain" : "default"
                  }
                >
                  {outcome.tradeGrade}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTableWrapper>
  );
}

function AIReviewSection({ reviews }: { reviews: AISelfReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <Card padding="md" className="border-surface-border-subtle/80">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary">AI Self Review</h3>
        <p className="text-xs text-text-muted">
          Retrospective analysis of completed trades from today&apos;s session
        </p>
      </div>
      <div className="space-y-3">
        {reviews.slice(0, TABLE_MAX_VISIBLE_ROWS).map((review) => (
          <div
            key={review.candidateId}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 p-3"
          >
            <p className="text-xs font-semibold text-text-primary">{review.symbol}</p>
            <dl className="mt-2 space-y-1.5 text-[11px] text-text-muted">
              <div>
                <dt className="font-medium text-text-secondary">Why generated</dt>
                <dd>{review.whyGenerated}</dd>
              </div>
              <div>
                <dt className="font-medium text-text-secondary">What happened</dt>
                <dd>{review.whatHappened}</dd>
              </div>
              <div>
                <dt className="font-medium text-text-secondary">Entry improvement</dt>
                <dd>{review.entryImprovement}</dd>
              </div>
              <div>
                <dt className="font-medium text-text-secondary">Exit improvement</dt>
                <dd>{review.exitImprovement}</dd>
              </div>
              <div>
                <dt className="font-medium text-text-secondary">Lessons</dt>
                <dd>{review.lessons}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PostMarketSection({
  title,
  subtitle,
  candidates,
  emptyNote,
  variant = "default",
  nearestCandidates,
  pinned,
  watchlisted,
  onPin,
  onWatchlist,
  onCopy,
  platformSnapshot = null,
  onInspect,
  headerSlot,
}: {
  title: string;
  subtitle: string;
  candidates: OpportunityCandidate[];
  emptyNote?: string;
  variant?: "default" | "expired" | "bestCall" | "watchlist";
  nearestCandidates?: NearestCandidate[];
  pinned: Set<string>;
  watchlisted: Set<string>;
  onPin: (symbol: string) => void;
  onWatchlist: (symbol: string) => void;
  onCopy?: (symbol: string) => void;
  platformSnapshot?: InstitutionalPlatformSnapshot | null;
  onInspect?: (candidate: OpportunityCandidate) => void;
  headerSlot?: ReactNode;
}) {
  return (
    <Card padding="md" className="border-surface-border-subtle/80">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
        {candidates.length > 0 && (
          <span className="font-mono text-[10px] text-text-faint">({candidates.length})</span>
        )}
      </div>
      {headerSlot}
      {candidates.length > 0 ? (
        variant === "expired" ? (
          <ExpiredSetupsTable
            candidates={candidates}
            pinned={pinned}
            watchlisted={watchlisted}
            onPin={onPin}
            onWatchlist={onWatchlist}
            onCopy={onCopy}
          />
        ) : (
          <OpportunityTable
            candidates={candidates}
            variant={variant === "default" ? "default" : variant}
            pinned={pinned}
            watchlisted={watchlisted}
            onPin={onPin}
            onWatchlist={onWatchlist}
            onCopy={onCopy}
            platformSnapshot={platformSnapshot}
            onInspect={onInspect}
          />
        )
      ) : (
        <EmptySection
          headline={CATEGORY_EMPTY_HEADLINE}
          message={emptyNote ?? CATEGORY_EMPTY_HEADLINE}
          nearestCandidates={nearestCandidates}
        />
      )}
    </Card>
  );
}

function MarketSummaryHighlights({ report }: { report: PostMarketReport }) {
  const summary = report.marketSummary;
  if (!summary) return null;

  return (
    <Card padding="md" className="border-surface-border-subtle/80">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Market Summary</h3>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{summary.narrative}</p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-surface-border-subtle/80 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-faint">Strongest Sector</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gain">
            <TrendingUp className="h-3.5 w-3.5" />
            {summary.strongestSector.name} (+{summary.strongestSector.changePercent.toFixed(2)}%)
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle/80 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-faint">Weakest Sector</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-loss">
            <TrendingDown className="h-3.5 w-3.5" />
            {summary.weakestSector.name} ({summary.weakestSector.changePercent.toFixed(2)}%)
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle/80 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-faint">Breadth</p>
          <p className="mt-1 text-xs font-medium text-text-secondary">
            {summary.breadth.advances}↑ / {summary.breadth.declines}↓ / {summary.breadth.unchanged}→
            <span className="ml-1 text-text-muted">({summary.breadth.advanceRatio}% adv)</span>
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle/80 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-faint">FII / DII</p>
          <p className="mt-1 text-xs font-medium text-text-secondary">
            FII ₹{summary.institutionalFlow.fii.toLocaleString("en-IN")} Cr · DII ₹
            {summary.institutionalFlow.dii.toLocaleString("en-IN")} Cr
            <span className="ml-1 text-text-muted">({summary.institutionalFlow.asOf})</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Top Breakouts
          </h4>
          {summary.topBreakouts.length > 0 ? (
            <ul className="space-y-1 text-xs text-text-secondary">
              {summary.topBreakouts.map((c) => (
                <li key={c.id}>
                  <StockLink symbol={c.symbol} className="hover:text-accent">
                    {c.symbol}
                  </StockLink>
                  <span className="text-text-muted"> · conviction {c.aiConvictionScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">No breakout candidates in final scan.</p>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Top Breakdowns
          </h4>
          {summary.topBreakdowns.length > 0 ? (
            <ul className="space-y-1 text-xs text-text-secondary">
              {summary.topBreakdowns.map((c) => (
                <li key={c.id}>
                  <StockLink symbol={c.symbol} className="hover:text-accent">
                    {c.symbol}
                  </StockLink>
                  <span className="text-text-muted"> · conviction {c.aiConvictionScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">No breakdown candidates in final scan.</p>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Top Volume Shock
          </h4>
          {summary.topVolumeShock.length > 0 ? (
            <ul className="space-y-1 text-xs text-text-secondary">
              {summary.topVolumeShock.map((c) => (
                <li key={c.id}>
                  <StockLink symbol={c.symbol} className="hover:text-accent">
                    {c.symbol}
                  </StockLink>
                  <span className="text-text-muted"> · conviction {c.aiConvictionScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">No volume shock candidates in final scan.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function PostMarketReports({
  report,
  engineState,
  pinned,
  watchlisted,
  onPin,
  onWatchlist,
  onCopy,
  platformSnapshot = null,
  onInspect,
}: {
  report: PostMarketReport;
  engineState: OpportunityEngineState;
  pinned: Set<string>;
  watchlisted: Set<string>;
  onPin: (symbol: string) => void;
  onWatchlist: (symbol: string) => void;
  onCopy?: (symbol: string) => void;
  platformSnapshot?: InstitutionalPlatformSnapshot | null;
  onInspect?: (candidate: OpportunityCandidate) => void;
}) {
  const tomorrowNearest = useMemo(
    () =>
      report.tomorrowWatchlist.length === 0
        ? derivePostMarketNearestCandidates(engineState, "tomorrowWatchlist")
        : [],
    [engineState, report.tomorrowWatchlist.length]
  );
  const expiredNearest = useMemo(
    () =>
      report.missedOpportunities.length === 0
        ? derivePostMarketNearestCandidates(engineState, "missedOpportunities")
        : [],
    [engineState, report.missedOpportunities.length]
  );
  const bestCallNearest = useMemo(
    () =>
      report.bestCallsOfDay.length === 0
        ? derivePostMarketNearestCandidates(engineState, "bestCallsOfDay")
        : [],
    [engineState, report.bestCallsOfDay.length]
  );
  const tomorrowMeta = useMemo(
    () => buildTomorrowWatchlistMeta(report, report.tomorrowWatchlist),
    [report]
  );

  return (
    <div className="mt-6 space-y-4 border-t border-surface-border-subtle pt-6">
      <div className="flex items-center gap-2">
        <PauseCircle className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Post-Market Reports</h3>
        <span className="text-xs text-text-muted">
          Generated {formatTimestamp(report.generatedAt)}
        </span>
      </div>

      <PostMarketCertificationStrip report={report} snapshot={platformSnapshot} />

      {report.marketSummary && <MarketSummaryHighlights report={report} />}

      <div className="grid gap-4 xl:grid-cols-1">
        <PostMarketSection
          title="Tomorrow Watchlist"
          subtitle={POST_MARKET_SUBTITLES.tomorrowWatchlist}
          candidates={report.tomorrowWatchlist}
          emptyNote={report.sectionNotes?.tomorrowWatchlist}
          nearestCandidates={tomorrowNearest}
          variant="watchlist"
          pinned={pinned}
          watchlisted={watchlisted}
          onPin={onPin}
          onWatchlist={onWatchlist}
          onCopy={onCopy}
          platformSnapshot={platformSnapshot}
          onInspect={onInspect}
          headerSlot={<TomorrowWatchlistMetaHeader meta={tomorrowMeta} />}
        />
        <PostMarketSection
          title="Expired Setups"
          subtitle={POST_MARKET_SUBTITLES.missedOpportunities}
          candidates={report.missedOpportunities}
          emptyNote={report.sectionNotes?.missedOpportunities}
          nearestCandidates={expiredNearest}
          variant="expired"
          pinned={pinned}
          watchlisted={watchlisted}
          onPin={onPin}
          onWatchlist={onWatchlist}
          onCopy={onCopy}
        />
        <PostMarketSection
          title={RECOMMENDATION_SECTION_LABELS.highestConviction}
          subtitle={POST_MARKET_SUBTITLES.bestCallsOfDay}
          candidates={report.bestCallsOfDay}
          emptyNote={report.sectionNotes?.bestCallsOfDay}
          nearestCandidates={bestCallNearest}
          variant="bestCall"
          pinned={pinned}
          watchlisted={watchlisted}
          onPin={onPin}
          onWatchlist={onWatchlist}
          onCopy={onCopy}
          platformSnapshot={platformSnapshot}
          onInspect={onInspect}
        />
        {(report.tradeOutcomes?.length ?? 0) > 0 && (
          <Card padding="md" className="border-surface-border-subtle/80">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Trade Outcomes</h3>
              <p className="text-xs text-text-muted">
                Session performance vs entry, stop, and target levels
              </p>
            </div>
            <TradeOutcomesTable outcomes={report.tradeOutcomes ?? []} />
          </Card>
        )}
        <AIReviewSection reviews={report.aiReviews ?? []} />
      </div>
    </div>
  );
}

export function OpportunityEnginePanel({ initialState }: OpportunityEnginePanelProps) {
  const [state, setState] = useState(initialState);
  const [activeCategory, setActiveCategory] = useState<OpportunityCategory>("intraday");
  const [scanning, setScanning] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(() => readStoredSymbols(PIN_STORAGE_KEY));
  const [watchlisted, setWatchlisted] = useState<Set<string>>(() =>
    readStoredSymbols(WATCHLIST_STORAGE_KEY)
  );
  const [toast, setToast] = useState<string | null>(null);
  const [platformSnapshot, setPlatformSnapshot] =
    useState<InstitutionalPlatformSnapshot | null>(null);
  const [inspectedCandidate, setInspectedCandidate] =
    useState<OpportunityCandidate | null>(null);

  const { candidates: activeCandidates, emptyNote, nearestCandidates } = useMemo(
    () => deriveCategoryCandidates(state, activeCategory),
    [state, activeCategory]
  );

  const inspectedView = useMemo(() => {
    if (!inspectedCandidate) return null;
    return buildInstitutionalCandidateView(
      inspectedCandidate,
      platformSnapshot,
      state.postMarket?.generatedAt ?? null
    );
  }, [inspectedCandidate, platformSnapshot, state.postMarket?.generatedAt]);

  /** Featured candidate for platform explainability / recommendation exposure. */
  const featuredCandidateView = useMemo(() => {
    if (inspectedView) return inspectedView;
    const top = activeCandidates[0];
    if (!top) return null;
    return buildInstitutionalCandidateView(
      top,
      platformSnapshot,
      state.postMarket?.generatedAt ?? null
    );
  }, [
    inspectedView,
    activeCandidates,
    platformSnapshot,
    state.postMarket?.generatedAt,
  ]);

  const refreshInstitutionalHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/validation/institutional-health");
      if (!response.ok) return;
      const payload = (await response.json()) as InstitutionalPlatformSnapshot;
      setPlatformSnapshot(payload);
    } catch {
      // Hide platform metrics gracefully when unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshInstitutionalHealth();
    const interval = setInterval(() => {
      void refreshInstitutionalHealth();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshInstitutionalHealth]);

  const togglePin = useCallback((symbol: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      const key = symbol.toUpperCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeStoredSymbols(PIN_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlisted((prev) => {
      const next = new Set(prev);
      const key = symbol.toUpperCase();
      if (next.has(key)) {
        next.delete(key);
        setToast(`${key} removed from watchlist`);
      } else {
        next.add(key);
        setToast(`${key} added to watchlist`);
      }
      writeStoredSymbols(WATCHLIST_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const copySymbol = useCallback(async (symbol: string) => {
    const key = symbol.toUpperCase();
    try {
      await navigator.clipboard.writeText(key);
      setToast(`${key} copied to clipboard`);
    } catch {
      setToast(`Could not copy ${key}`);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshState = useCallback(async () => {
    const response = await fetch("/api/opportunities");
    if (!response.ok) return;
    const nextState = (await response.json()) as OpportunityEngineState;
    setState(nextState);
  }, []);

  const handleScanNow = useCallback(async () => {
    setScanning(true);
    try {
      const response = await fetch("/api/opportunities/scan", { method: "POST" });
      if (response.ok) {
        const payload = (await response.json()) as {
          state: OpportunityEngineState;
          durationMs: number;
          symbolsScanned: number;
          added: number;
          removed: number;
          updated: number;
        };
        setState(payload.state);
      }
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (state.isFrozen) return;

    const interval = setInterval(() => {
      void refreshState();
    }, 60_000);

    return () => clearInterval(interval);
  }, [state.isFrozen, refreshState]);

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-gain/5 blur-2xl" />

      {toast && (
        <div className="absolute right-4 top-4 z-40 flex items-center gap-2 rounded-lg border border-accent/20 bg-surface-raised px-3 py-2 text-xs text-text-secondary shadow-lg">
          <Bookmark className="h-3.5 w-3.5 text-accent" />
          {toast}
          <button type="button" onClick={() => setToast(null)} className="text-text-faint hover:text-text-secondary">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <SchedulerHealthCard />
      <div className="mb-4">
        <ExecutiveInstitutionalDashboard
          snapshot={platformSnapshot}
          opportunityState={state}
          fetchSnapshot={false}
          compact
        />
      </div>
      <InstitutionalValidationPanel snapshot={platformSnapshot} />
      <div className="mb-4">
        <InstitutionalReportViewer
          snapshot={platformSnapshot}
          candidate={featuredCandidateView}
          compact
          title="Results · Institutional Report"
        />
      </div>
      <InstitutionalPlatformHealthPanel snapshot={platformSnapshot} />
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <InstitutionalTrustPanel snapshot={platformSnapshot} />
        <InstitutionalExplainabilityPanel
          snapshot={platformSnapshot}
          candidate={featuredCandidateView}
        />
        <InstitutionalRecommendationPanel
          snapshot={platformSnapshot}
          candidate={featuredCandidateView}
        />
      </div>

      <CardHeader
        title="Continuous Opportunity Engine"
        subtitle={`Scanning ${state.universeSize.toLocaleString("en-IN")} NSE/BSE symbols · refreshes every 15 min during market hours`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {state.isFrozen && (
              <div className="flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1.5">
                <PauseCircle className="h-3.5 w-3.5 text-text-muted" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Frozen
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg border border-accent/10 bg-accent/5 px-2.5 py-1.5">
              <Radar className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-accent">
                {state.scanCount} scans
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleScanNow()}
              disabled={scanning || state.isScanning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning || state.isScanning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Scan Now
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          Last scanned:{" "}
          <strong className="text-text-secondary">{formatTimestamp(state.lastScannedAt)}</strong>
        </span>
        {state.nextScanAt && !state.isFrozen && (
          <span>
            Next scan:{" "}
            <strong className="text-text-secondary">{formatTimestamp(state.nextScanAt)}</strong>
          </span>
        )}
        {state.lastScanMetrics && (
          <span>
            Scan stats:{" "}
            <strong className="text-text-secondary">
              {state.lastScanMetrics.symbolsScanned.toLocaleString("en-IN")} symbols ·{" "}
              {(state.lastScanMetrics.durationMs / 1000).toFixed(1)}s · +{state.lastScanMetrics.added} / −
              {state.lastScanMetrics.removed} / ~{state.lastScanMetrics.updated}
            </strong>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Market:{" "}
          <strong className={state.marketOpen ? "text-gain" : "text-text-secondary"}>
            {state.marketOpen ? "Open" : state.isFrozen ? "Closed · Final scan" : "Closed"}
          </strong>
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {OPPORTUNITY_CATEGORIES.map((category) => {
          const count = deriveCategoryCount(state, category);
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "bg-surface-hover/50 text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              }`}
            >
              {getCategoryLabel(category)}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            {getCategoryLabel(activeCategory)}
          </h3>
          <p className="text-xs text-text-muted">{getCategorySubtitle(activeCategory)}</p>
        </div>
      </div>

      {activeCandidates.length > 0 ? (
        <OpportunityTable
          candidates={activeCandidates}
          pinned={pinned}
          watchlisted={watchlisted}
          onPin={togglePin}
          onWatchlist={toggleWatchlist}
          onCopy={copySymbol}
          platformSnapshot={platformSnapshot}
          onInspect={setInspectedCandidate}
        />
      ) : (
        <EmptySection
          headline={CATEGORY_EMPTY_HEADLINE}
          message={
            emptyNote ??
            "No opportunities in this category yet. The next scan may surface candidates."
          }
          nearestCandidates={nearestCandidates}
        />
      )}

      {state.postMarket && (
        <PostMarketReports
          report={state.postMarket}
          engineState={state}
          pinned={pinned}
          watchlisted={watchlisted}
          onPin={togglePin}
          onWatchlist={toggleWatchlist}
          onCopy={copySymbol}
          platformSnapshot={platformSnapshot}
          onInspect={setInspectedCandidate}
        />
      )}

      {inspectedCandidate && inspectedView ? (
        <OpportunityExplainabilityDrawer
          symbol={inspectedCandidate.symbol}
          company={inspectedCandidate.company}
          view={inspectedView}
          candidate={inspectedCandidate}
          snapshot={platformSnapshot}
          open
          onClose={() => setInspectedCandidate(null)}
        />
      ) : null}
    </Card>
  );
}
