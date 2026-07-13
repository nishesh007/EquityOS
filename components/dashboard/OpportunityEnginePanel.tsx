"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StockLink } from "@/components/ui/StockLink";
import {
  CATEGORY_LABELS,
  OPPORTUNITY_CATEGORIES,
  type OpportunityCandidate,
  type OpportunityCategory,
  type OpportunityEngineState,
  type PostMarketReport,
} from "@/lib/opportunity-engine/types";
import {
  Clock3,
  Loader2,
  PauseCircle,
  Radar,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface OpportunityEnginePanelProps {
  initialState: OpportunityEngineState;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
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

function ScoreBar({ score, tone = "accent" }: { score: number; tone?: "accent" | "gain" }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-border">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            tone === "gain" ? "bg-gain" : "bg-accent"
          }`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="w-5 font-mono text-xs text-text-secondary tabular-nums">{score}</span>
    </div>
  );
}

const headerClass =
  "whitespace-nowrap pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint";
const cellClass = "whitespace-nowrap py-3 align-top";

function OpportunityTable({ candidates }: { candidates: OpportunityCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        No opportunities in this category yet. The next scan may surface candidates.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="border-b border-surface-border-subtle text-left">
            <th className={headerClass}>#</th>
            <th className={headerClass}>Stock</th>
            <th className={headerClass}>Bias</th>
            <th className={`${headerClass} text-right`}>Entry Zone</th>
            <th className={`${headerClass} text-right`}>Stop Loss</th>
            <th className={`${headerClass} text-right`}>Target 1</th>
            <th className={`${headerClass} text-right`}>Target 2</th>
            <th className={`${headerClass} text-right`}>R/R</th>
            <th className={`${headerClass} text-right`}>AI Conviction</th>
            <th className={`${headerClass} text-right`}>Confidence</th>
            <th className={headerClass}>Reason</th>
            <th className={`${headerClass} text-right`}>First Detected</th>
            <th className={`${headerClass} text-right`}>Last Detected</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr
              key={candidate.id}
              className="group border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/30"
            >
              <td className={cellClass}>
                <span className="font-mono text-[10px] text-text-faint">
                  {String(candidate.rank).padStart(2, "0")}
                </span>
              </td>
              <td className={cellClass}>
                <StockLink symbol={candidate.symbol}>
                  <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                    {candidate.symbol}
                  </p>
                  <p className="max-w-[140px] truncate text-[10px] text-text-muted">
                    {candidate.company}
                  </p>
                </StockLink>
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
                <ScoreBar score={candidate.aiConvictionScore} tone="gain" />
              </td>
              <td className={`${cellClass} text-right`}>
                <ScoreBar score={candidate.confidencePercent} />
              </td>
              <td className={cellClass}>
                <p className="max-w-[220px] text-[11px] leading-relaxed text-text-muted">
                  {candidate.reason}
                </p>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostMarketSection({
  title,
  subtitle,
  candidates,
}: {
  title: string;
  subtitle: string;
  candidates: OpportunityCandidate[];
}) {
  return (
    <Card padding="md" className="border-surface-border-subtle/80">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      <OpportunityTable candidates={candidates} />
    </Card>
  );
}

function PostMarketReports({ report }: { report: PostMarketReport }) {
  return (
    <div className="mt-6 space-y-4 border-t border-surface-border-subtle pt-6">
      <div className="flex items-center gap-2">
        <PauseCircle className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Post-Market Reports</h3>
        <span className="text-xs text-text-muted">
          Generated {formatTimestamp(report.generatedAt)}
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-1">
        <PostMarketSection
          title="Tomorrow Watchlist"
          subtitle="High-conviction setups to monitor at open"
          candidates={report.tomorrowWatchlist}
        />
        <PostMarketSection
          title="Missed Opportunities"
          subtitle="Strong signals that appeared earlier in the session"
          candidates={report.missedOpportunities}
        />
        <PostMarketSection
          title="Best Calls of the Day"
          subtitle="Top AI-ranked opportunities from today's final scan"
          candidates={report.bestCallsOfDay}
        />
      </div>
    </div>
  );
}

export function OpportunityEnginePanel({ initialState }: OpportunityEnginePanelProps) {
  const [state, setState] = useState(initialState);
  const [activeCategory, setActiveCategory] = useState<OpportunityCategory>("intraday");
  const [scanning, setScanning] = useState(false);

  const activeCandidates = useMemo(
    () => state.categories[activeCategory] ?? [],
    [state.categories, activeCategory]
  );

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
          Last scanned: <strong className="text-text-secondary">{formatTimestamp(state.lastScannedAt)}</strong>
        </span>
        {state.nextScanAt && !state.isFrozen && (
          <span>
            Next scan: <strong className="text-text-secondary">{formatTimestamp(state.nextScanAt)}</strong>
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
          const count = state.categories[category]?.length ?? 0;
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
              {CATEGORY_LABELS[category]}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-sm font-medium text-text-primary">{CATEGORY_LABELS[activeCategory]}</h3>
      </div>

      <OpportunityTable candidates={activeCandidates} />

      {state.postMarket && <PostMarketReports report={state.postMarket} />}
    </Card>
  );
}
