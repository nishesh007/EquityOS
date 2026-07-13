"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StockLink } from "@/components/ui/StockLink";
import {
  deriveCategoryCandidates,
  getCategoryLabel,
  getCategorySubtitle,
  POST_MARKET_SUBTITLES,
} from "@/lib/opportunity-engine/presentation";
import {
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
  TrendingDown,
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

function ReasonCell({ candidate }: { candidate: OpportunityCandidate }) {
  const reasons =
    candidate.confidenceReasons && candidate.confidenceReasons.length > 0
      ? candidate.confidenceReasons
      : candidate.reason
          .split("\n")
          .map((line) => line.replace(/^✓\s*/, "").trim())
          .filter(Boolean);

  if (reasons.length === 0) {
    return <span className="text-[11px] text-text-muted">—</span>;
  }

  return (
    <ul className="max-w-[240px] space-y-0.5 text-[11px] leading-relaxed text-text-muted">
      {reasons.map((reason) => (
        <li key={reason} className="flex items-start gap-1">
          <span className="mt-px text-gain">✓</span>
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}

const headerClass =
  "whitespace-nowrap pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint";
const cellClass = "whitespace-nowrap py-3 align-top";

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-6 text-center">
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

function OpportunityTable({ candidates }: { candidates: OpportunityCandidate[] }) {
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
  emptyNote,
}: {
  title: string;
  subtitle: string;
  candidates: OpportunityCandidate[];
  emptyNote?: string;
}) {
  return (
    <Card padding="md" className="border-surface-border-subtle/80">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      {candidates.length > 0 ? (
        <OpportunityTable candidates={candidates} />
      ) : (
        <EmptySection
          message={
            emptyNote ??
            "No stocks satisfied today's strict institutional filters."
          }
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

      {report.marketSummary && <MarketSummaryHighlights report={report} />}

      <div className="grid gap-4 xl:grid-cols-1">
        <PostMarketSection
          title="Tomorrow Watchlist"
          subtitle={POST_MARKET_SUBTITLES.tomorrowWatchlist}
          candidates={report.tomorrowWatchlist}
          emptyNote={report.sectionNotes?.tomorrowWatchlist}
        />
        <PostMarketSection
          title="Missed Opportunities"
          subtitle={POST_MARKET_SUBTITLES.missedOpportunities}
          candidates={report.missedOpportunities}
          emptyNote={report.sectionNotes?.missedOpportunities}
        />
        <PostMarketSection
          title="Best Calls of the Day"
          subtitle={POST_MARKET_SUBTITLES.bestCallsOfDay}
          candidates={report.bestCallsOfDay}
          emptyNote={report.sectionNotes?.bestCallsOfDay}
        />
      </div>
    </div>
  );
}

export function OpportunityEnginePanel({ initialState }: OpportunityEnginePanelProps) {
  const [state, setState] = useState(initialState);
  const [activeCategory, setActiveCategory] = useState<OpportunityCategory>("intraday");
  const [scanning, setScanning] = useState(false);

  const { candidates: activeCandidates, emptyNote } = useMemo(
    () => deriveCategoryCandidates(state, activeCategory),
    [state, activeCategory]
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
          const count =
            category === "intraday"
              ? deriveCategoryCandidates(state, "intraday").candidates.length
              : (state.categories[category]?.length ?? 0);
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
        <OpportunityTable candidates={activeCandidates} />
      ) : (
        <EmptySection
          message={
            emptyNote ??
            "No opportunities in this category yet. The next scan may surface candidates."
          }
        />
      )}

      {state.postMarket && <PostMarketReports report={state.postMarket} />}
    </Card>
  );
}
