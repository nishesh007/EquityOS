"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EarningsIntelligenceHost } from "@/components/dashboard/earnings/EarningsIntelligenceHost";
import { InstitutionalDashboardMetrics } from "@/components/dashboard/earnings/InstitutionalDashboardMetrics";
import { InstitutionalScorecard } from "@/components/dashboard/earnings/InstitutionalScorecard";
import { toEarningsCardView } from "@/src/core/earnings/calendar";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import {
  DASHBOARD_EMPTY,
  filterEarnings,
  getEarningsDashboardEngine,
  sortEarnings,
  type DashboardSortKey,
  type EarningsDashboardMetrics,
  type RankedEarningsItem,
  type SmartFilterId,
} from "@/src/core/earnings/dashboard";
import { LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";

interface InstitutionalEarningsDashboardPanelProps {
  events: EarningsCalendarEvent[];
  initialMetrics?: EarningsDashboardMetrics | null;
  pageSize?: number;
}

const SMART_FILTERS: Array<{ id: SmartFilterId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "next_month", label: "Next Month" },
  { id: "portfolio", label: "Portfolio" },
  { id: "watchlist", label: "Watchlist" },
  { id: "high_conviction", label: "High Conviction" },
  { id: "high_impact", label: "High Impact" },
  { id: "large_cap", label: "Large Cap" },
  { id: "mid_cap", label: "Mid Cap" },
  { id: "small_cap", label: "Small Cap" },
  { id: "bullish", label: "Bullish" },
  { id: "bearish", label: "Bearish" },
  { id: "high_risk", label: "High Risk" },
  { id: "low_risk", label: "Low Risk" },
  { id: "high_beat_probability", label: "High Beat Prob" },
  { id: "transcript_available", label: "Transcript Available" },
  { id: "results_released", label: "Results Released" },
];

const SORT_OPTIONS: Array<{ value: DashboardSortKey; label: string }> = [
  { value: "institutional_rank", label: "Institutional Rank" },
  { value: "ai_score", label: "AI Score" },
  { value: "beat_probability", label: "Beat Probability" },
  { value: "confidence", label: "Confidence" },
  { value: "date", label: "Date" },
  { value: "expected_volatility", label: "Expected Volatility" },
  { value: "historical_beat_rate", label: "Historical Beat Rate" },
  { value: "market_cap", label: "Market Cap" },
  { value: "alphabetical", label: "Alphabetical" },
];

export function InstitutionalEarningsDashboardPanel({
  events,
  initialMetrics = null,
  pageSize = 8,
}: InstitutionalEarningsDashboardPanelProps) {
  const [smartFilters, setSmartFilters] = useState<SmartFilterId[]>([]);
  const [sortBy, setSortBy] = useState<DashboardSortKey>("institutional_rank");
  const [sector, setSector] = useState("");
  const [exchange, setExchange] = useState<"" | "NSE" | "BSE">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const scoredAll = useMemo(() => {
    const engine = getEarningsDashboardEngine();
    return engine.scoreAll(events);
  }, [events]);

  const metrics =
    initialMetrics ?? getEarningsDashboardEngine().getDashboard().metrics;

  const sectors = useMemo(
    () => [...new Set(events.map((e) => e.sector).filter(Boolean))].sort(),
    [events]
  );

  const filteredSorted = useMemo(() => {
    const filtered = filterEarnings(scoredAll, {
      smartFilters,
      sector: sector || null,
      exchange: exchange || null,
      search: search || null,
    });
    return sortEarnings(filtered, sortBy);
  }, [scoredAll, smartFilters, sector, exchange, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const cards = pageItems.map((item) => toEarningsCardView(item.event));

  const emptyMessage =
    events.length === 0
      ? DASHBOARD_EMPTY.noUpcoming
      : smartFilters.includes("portfolio")
        ? DASHBOARD_EMPTY.noPortfolio
        : smartFilters.includes("watchlist")
          ? DASHBOARD_EMPTY.noWatchlist
          : DASHBOARD_EMPTY.noMatchingFilters;

  function toggleFilter(id: SmartFilterId) {
    startTransition(() => {
      setPage(1);
      setSmartFilters((prev) =>
        prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      );
    });
  }

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <CardHeader
          title="Institutional Earnings Dashboard"
          subtitle="Rank, filter and prioritize upcoming results"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <LayoutDashboard className="h-4 w-4 text-accent" />
            </div>
          }
        />
        <InstitutionalDashboardMetrics metrics={metrics} />
      </Card>

      <Card padding="lg">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SMART_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => toggleFilter(filter.id)}
              className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
                smartFilters.includes(filter.id)
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-surface-border text-text-muted"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-[10px] text-text-faint">
            Search
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Company or ticker"
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            />
          </label>
          <label className="text-[10px] text-text-faint">
            Sector
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            >
              <option value="">All</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-text-faint">
            Exchange
            <select
              value={exchange}
              onChange={(e) => {
                setExchange(e.target.value as "" | "NSE" | "BSE");
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            >
              <option value="">All</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </label>
          <label className="text-[10px] text-text-faint">
            Sort
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as DashboardSortKey)
              }
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            {filteredSorted.length} ranked
          </Badge>
          {isPending ? (
            <span className="text-[10px] text-text-faint">Updating…</span>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card padding="lg">
          <CardHeader title="Ranked Earnings" subtitle="Institutional scorecards" />
          {pageItems.length === 0 ? (
            <p className="text-xs text-text-muted">{emptyMessage}</p>
          ) : (
            <div className="space-y-3">
              {pageItems.map((item) => (
                <div key={`${item.event.id}-score`} className="space-y-2">
                  <InstitutionalScorecard item={item} />
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-xs text-text-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <p className="text-[10px] text-text-faint">
                Page {safePage} of {totalPages}
              </p>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-xs text-text-muted disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Earnings Research"
            subtitle="AI preview / post analysis"
          />
          <EarningsIntelligenceHost
            cards={cards}
            compact={false}
            emptyMessage={emptyMessage}
          />
        </Card>
      </div>

      <PriorityRails items={filteredSorted} />
    </div>
  );
}

function PriorityRails({ items }: { items: RankedEarningsItem[] }) {
  const highConviction = items
    .filter(
      (i) =>
        i.event.highConviction ||
        (i.scorecard.aiConfidence >= 70 && i.scorecard.outlook === "Bullish")
    )
    .slice(0, 4);
  const portfolio = items.filter((i) => i.event.inPortfolio).slice(0, 4);
  const watchlist = items.filter((i) => i.event.inWatchlist).slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Rail title="High Conviction" items={highConviction} empty={DASHBOARD_EMPTY.awaitingAi} />
      <Rail title="Portfolio Earnings" items={portfolio} empty={DASHBOARD_EMPTY.noPortfolio} />
      <Rail title="Watchlist Earnings" items={watchlist} empty={DASHBOARD_EMPTY.noWatchlist} />
    </div>
  );
}

function Rail({
  title,
  items,
  empty,
}: {
  title: string;
  items: RankedEarningsItem[];
  empty: string;
}) {
  return (
    <Card padding="md">
      <CardHeader title={title} subtitle="Priority rail" />
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <InstitutionalScorecard key={`${title}-${item.event.id}`} item={item} compact />
          ))}
        </div>
      )}
    </Card>
  );
}
