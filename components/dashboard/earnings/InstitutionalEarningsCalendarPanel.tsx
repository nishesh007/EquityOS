"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EarningsCard } from "@/components/dashboard/earnings/EarningsCard";
import { EarningsMetricsStrip } from "@/components/dashboard/earnings/EarningsMetricsStrip";
import {
  applyEarningsFilters,
  sortCalendarEvents,
  paginateEvents,
  toEarningsCardView,
  uniqueSectors,
  uniqueIndustries,
  type CalendarSortField,
  type CalendarViewId,
  type EarningsCalendarEvent,
  type EarningsCalendarMetrics,
  type EarningsExchange,
  type MarketCapBucket,
  type SortDirection,
  EMPTY_MESSAGES,
  CALENDAR_VIEW_LABELS,
} from "@/src/core/earnings/calendar";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface InstitutionalEarningsCalendarPanelProps {
  events: EarningsCalendarEvent[];
  metrics: EarningsCalendarMetrics;
  pageSize?: number;
}

const VIEWS: CalendarViewId[] = [
  "today",
  "tomorrow",
  "next_7_days",
  "next_30_days",
  "this_quarter",
  "portfolio",
  "watchlist",
  "high_impact",
];

const SORT_OPTIONS: Array<{ value: CalendarSortField; label: string }> = [
  { value: "result_date", label: "Result Date" },
  { value: "countdown", label: "Countdown" },
  { value: "company", label: "Company" },
  { value: "market_cap", label: "Market Cap" },
  { value: "impact", label: "Impact" },
];

export function InstitutionalEarningsCalendarPanel({
  events,
  metrics,
  pageSize = 8,
}: InstitutionalEarningsCalendarPanelProps) {
  const [view, setView] = useState<CalendarViewId | "all">("next_30_days");
  const [exchange, setExchange] = useState<EarningsExchange | "">("");
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [marketCapBucket, setMarketCapBucket] = useState<MarketCapBucket | "">(
    ""
  );
  const [portfolioOnly, setPortfolioOnly] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [fnoOnly, setFnoOnly] = useState(false);
  const [highConvictionOnly, setHighConvictionOnly] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [sortBy, setSortBy] = useState<CalendarSortField>("result_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const sectors = useMemo(() => uniqueSectors(events), [events]);
  const industries = useMemo(() => uniqueIndustries(events), [events]);

  const filtered = useMemo(() => {
    const now = new Date();
    const list = applyEarningsFilters(
      events,
      {
        view: view === "all" ? null : view,
        exchange: exchange || null,
        sector: sector || null,
        industry: industry || null,
        marketCapBucket: marketCapBucket || null,
        portfolioOnly,
        watchlistOnly,
        fnoOnly,
        highConvictionOnly,
        upcomingOnly,
        search: search || null,
      },
      now
    );
    return sortCalendarEvents(list, sortBy, sortDirection, now);
  }, [
    events,
    view,
    exchange,
    sector,
    industry,
    marketCapBucket,
    portfolioOnly,
    watchlistOnly,
    fnoOnly,
    highConvictionOnly,
    upcomingOnly,
    search,
    sortBy,
    sortDirection,
  ]);

  const paged = useMemo(
    () => paginateEvents(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  const cards = useMemo(
    () => paged.items.map((event) => toEarningsCardView(event)),
    [paged.items]
  );

  const emptyMessage =
    view === "portfolio"
      ? EMPTY_MESSAGES.noPortfolio
      : view === "watchlist"
        ? EMPTY_MESSAGES.noWatchlist
        : view === "high_impact"
          ? EMPTY_MESSAGES.noHighImpact
          : events.length === 0
            ? EMPTY_MESSAGES.awaitingSchedule
            : EMPTY_MESSAGES.noUpcoming;

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <CardHeader
          title="Institutional Earnings Calendar"
          subtitle="Single source of truth for upcoming results"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Calendar className="h-4 w-4 text-accent" />
            </div>
          }
        />

        <EarningsMetricsStrip metrics={metrics} ready={metrics.companiesCovered > 0} />

        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setView("all");
              setPage(1);
            }}
            className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
              view === "all"
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-surface-border text-text-muted"
            }`}
          >
            All
          </button>
          {VIEWS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setView(id);
                setPage(1);
              }}
              className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
                view === id
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-surface-border text-text-muted"
              }`}
            >
              {CALENDAR_VIEW_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
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
            Exchange
            <select
              value={exchange}
              onChange={(e) => {
                setExchange(e.target.value as EarningsExchange | "");
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
            Industry
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            >
              <option value="">All</option>
              {industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-text-faint">
            Market Cap
            <select
              value={marketCapBucket}
              onChange={(e) => {
                setMarketCapBucket(e.target.value as MarketCapBucket | "");
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            >
              <option value="">All</option>
              <option value="large">Large</option>
              <option value="mid">Mid</option>
              <option value="small">Small</option>
              <option value="micro">Micro</option>
            </select>
          </label>
          <label className="text-[10px] text-text-faint">
            Sort By
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as CalendarSortField)
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
          <label className="text-[10px] text-text-faint">
            Direction
            <select
              value={sortDirection}
              onChange={(e) =>
                setSortDirection(e.target.value as SortDirection)
              }
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-text-primary"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <FilterToggle
            label="Portfolio"
            active={portfolioOnly}
            onClick={() => {
              setPortfolioOnly((v) => !v);
              setPage(1);
            }}
          />
          <FilterToggle
            label="Watchlist"
            active={watchlistOnly}
            onClick={() => {
              setWatchlistOnly((v) => !v);
              setPage(1);
            }}
          />
          <FilterToggle
            label="F&O"
            active={fnoOnly}
            onClick={() => {
              setFnoOnly((v) => !v);
              setPage(1);
            }}
          />
          <FilterToggle
            label="High Conviction"
            active={highConvictionOnly}
            onClick={() => {
              setHighConvictionOnly((v) => !v);
              setPage(1);
            }}
          />
          <FilterToggle
            label="Upcoming Only"
            active={upcomingOnly}
            onClick={() => {
              setUpcomingOnly((v) => !v);
              setPage(1);
            }}
          />
          <Badge variant="neutral" size="sm">
            {filtered.length} events
          </Badge>
        </div>
      </Card>

      <Card padding="lg">
        {cards.length === 0 ? (
          <p className="text-xs text-text-muted">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <EarningsCard key={card.id} card={card} />
            ))}
          </div>
        )}

        {paged.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-xs text-text-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <p className="text-[10px] text-text-faint">
              Page {paged.page} of {paged.totalPages}
            </p>
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() =>
                setPage((p) => Math.min(paged.totalPages, p + 1))
              }
              className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-xs text-text-muted disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-surface-border text-text-muted"
      }`}
    >
      {label}
    </button>
  );
}
