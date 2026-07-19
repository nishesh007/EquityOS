"use client";

import { Card, CardHeader, CardFooter } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { StockLink } from "@/components/ui/StockLink";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { StatusBadge, statusToneFromLabel } from "@/src/design";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import {
  BREADTH_UNIVERSE_OPTIONS,
  type BreadthUniverseId,
} from "@/lib/market-breadth/types";
import type { MarketBreadth as MarketBreadthType, MarketMover } from "@/types";
import { HeatMeter } from "@/src/design";
import {
  Activity,
  BarChart3,
  CircleArrowDown,
  CircleArrowUp,
  Layers3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface MarketBreadthProps {
  breadth: MarketBreadthType;
}

interface MoverListProps {
  title: string;
  subtitle: string;
  items: MarketMover[];
  valueLabel?: string;
  direction?: "gainers" | "losers";
}

const MAX_MOVER_ROWS = 5;

function formatTs(iso?: string): string {
  if (!iso) return "—";
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

function MetricTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
      <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm font-semibold tabular-nums ${tone ?? "text-text-primary"}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function MoverList({
  title,
  subtitle,
  items,
  valueLabel = "LTP",
  direction,
}: MoverListProps) {
  const symbols = items.map((item) => item.symbol);
  const { quotes } = useMarketQuotes(symbols, {
    initialQuotes: buildInitialQuotesMap(items),
  });
  const displayItems = direction
    ? items
        .filter((item) => {
          const change =
            quotes.get(item.symbol)?.changePercent ?? item.changePercent;
          return direction === "gainers" ? change > 0 : change < 0;
        })
        .sort((a, b) => {
          const aChange =
            quotes.get(a.symbol)?.changePercent ?? a.changePercent;
          const bChange =
            quotes.get(b.symbol)?.changePercent ?? b.changePercent;
          return direction === "gainers"
            ? bChange - aChange
            : aChange - bChange;
        })
        .slice(0, MAX_MOVER_ROWS)
    : items.slice(0, MAX_MOVER_ROWS);

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader title={title} subtitle={subtitle} />
      {displayItems.length === 0 ? (
        <EmptyStatePanel
          message={`No qualifying ${direction ?? "movers"} in the selected universe right now.`}
          source="Market Breadth Engine · live quotes"
          icon={direction === "losers" ? TrendingDown : TrendingUp}
          action={
            <Link href="/markets" className="text-[11px] font-semibold text-accent">
              Refresh Markets →
            </Link>
          }
        />
      ) : (
        <div className="space-y-0.5">
          {displayItems.map((item) => {
            const quote =
              quotes.get(item.symbol) ??
              quotes.get(item.symbol.toUpperCase()) ??
              item.quote ??
              createUnavailableQuote(item.symbol);
            return (
              <StockLink
                key={item.symbol}
                symbol={item.symbol}
                className="group flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover/50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-text-primary transition-colors group-hover:text-accent">
                      {item.symbol}
                    </p>
                    <p className="truncate text-[10px] text-text-muted">
                      {item.name}
                    </p>
                  </div>
                </div>
                <div className="ml-3 text-right">
                  {valueLabel === "Volume" ? (
                    <>
                      <p className="font-mono text-xs tabular-nums text-text-secondary">
                        {item.volume}
                      </p>
                      <ChangeIndicator
                        value={quote.changePercent ?? item.changePercent}
                        size="sm"
                        showIcon={false}
                      />
                    </>
                  ) : (
                    <QuoteDisplayCompact quote={quote} className="text-right" />
                  )}
                </div>
              </StockLink>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function InstitutionalSummary({
  breadth,
  onUniverseChange,
  pending,
}: {
  breadth: MarketBreadthType;
  onUniverseChange: (id: BreadthUniverseId) => void;
  pending: boolean;
}) {
  const universe = (breadth.universe ?? "nse") as BreadthUniverseId;
  const total =
    breadth.totalStocks ??
    breadth.advances + breadth.declines + breadth.unchanged;
  const ratio =
    breadth.advanceDeclineRatio ??
    (breadth.declines > 0
      ? breadth.advances / breadth.declines
      : breadth.advances);
  const breadthPct =
    breadth.breadthPercent ??
    (total > 0
      ? Math.round(
          (breadth.advances /
            Math.max(1, breadth.advances + breadth.declines + breadth.unchanged)) *
            1000
        ) / 10
      : 0);
  const net = breadth.netAdvances ?? breadth.advances - breadth.declines;
  const mood = breadth.marketMood ?? "Insufficient Data";

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Market Breadth"
        subtitle={breadth.universeLabel ?? "Entire NSE"}
        icon={<Activity className="h-4 w-4 text-emerald-400" />}
        timestamp={`Updated ${formatTs(breadth.lastUpdated)}`}
        badge={
          <StatusBadge tone={statusToneFromLabel(mood)} size="sm">
            {mood}
          </StatusBadge>
        }
        action={
          <select
            aria-label="Breadth universe"
            className="rounded-lg border border-surface-border bg-surface-overlay px-2 py-1 text-[11px] font-semibold text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            value={universe}
            disabled={pending}
            onChange={(event) =>
              onUniverseChange(event.target.value as BreadthUniverseId)
            }
          >
            {BREADTH_UNIVERSE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <MetricTile label="Universe" value={breadth.universeLabel ?? "NSE"} />
        <MetricTile
          label="Total Stocks"
          value={total.toLocaleString("en-IN")}
          hint={
            breadth.quotedStocks != null
              ? `${breadth.quotedStocks.toLocaleString("en-IN")} quoted`
              : undefined
          }
        />
        <MetricTile
          label="Advances"
          value={breadth.advances.toLocaleString("en-IN")}
          tone="text-gain"
        />
        <MetricTile
          label="Declines"
          value={breadth.declines.toLocaleString("en-IN")}
          tone="text-loss"
        />
        <MetricTile
          label="Unchanged"
          value={String(breadth.unchanged)}
        />
        <MetricTile label="A/D Ratio" value={ratio.toFixed(2)} />
        <MetricTile label="Breadth %" value={`${breadthPct.toFixed(1)}%`} />
        <MetricTile
          label="Net Advances"
          value={`${net >= 0 ? "+" : ""}${net}`}
          tone={net >= 0 ? "text-gain" : "text-loss"}
        />
        <MetricTile
          label="Participation"
          value={`${(breadth.participationPercent ?? breadth.quoteCoveragePercent ?? 0).toFixed(1)}%`}
        />
        <MetricTile
          label="Avg Daily Return"
          value={
            breadth.averageDailyReturn != null
              ? `${breadth.averageDailyReturn >= 0 ? "+" : ""}${breadth.averageDailyReturn.toFixed(2)}%`
              : "—"
          }
        />
        <MetricTile
          label="Avg RSI"
          value={
            breadth.averageRsi != null ? breadth.averageRsi.toFixed(1) : "—"
          }
          hint={
            breadth.technicalCoveragePercent != null
              ? `Technicals · ${breadth.technicalCoveragePercent}% coverage`
              : undefined
          }
        />
        <MetricTile
          label="Above EMAs"
          value={
            breadth.aboveEma20 != null
              ? `${breadth.aboveEma20}/${breadth.aboveEma50 ?? "—"}/${breadth.aboveEma200 ?? "—"}`
              : "—"
          }
          hint="20 / 50 / 200"
        />
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface-border">
        <div
          className="h-full bg-gain transition-[width] duration-700"
          style={{
            width: `${total > 0 ? (breadth.advances / Math.max(1, breadth.advances + breadth.declines + breadth.unchanged)) * 100 : 0}%`,
          }}
        />
        <div
          className="h-full bg-loss transition-[width] duration-700"
          style={{
            width: `${total > 0 ? (breadth.declines / Math.max(1, breadth.advances + breadth.declines + breadth.unchanged)) * 100 : 0}%`,
          }}
        />
      </div>

      <HeatMeter
        className="mt-4"
        label="Market Mood"
        value={
          mood === "Insufficient Data"
            ? 50
            : Math.min(100, Math.max(0, breadthPct))
        }
        lowLabel="Bearish"
        highLabel="Bullish"
      />

      {(breadth.breadthTrend5d?.length || breadth.breadthTrend20d?.length) ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-surface-border-subtle px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-faint">
              5-Day Breadth Trend
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-text-secondary">
              {(breadth.breadthTrend5d ?? [])
                .map((p) => `${p.breadthPercent.toFixed(0)}%`)
                .join(" → ") || "—"}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border-subtle px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-faint">
              20-Day Breadth Trend
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-text-secondary">
              {(breadth.breadthTrend20d ?? [])
                .map((p) => `${p.breadthPercent.toFixed(0)}%`)
                .join(" → ") || "Building…"}
            </p>
          </div>
        </div>
      ) : null}

      <CardFooter>
        <span>Source · {breadth.dataSource ?? "Market Breadth Engine"}</span>
        <span>
          52W Highs {breadth.newHighs} · Lows {breadth.newLows}
        </span>
      </CardFooter>
    </Card>
  );
}

function AdvanceDecline({ breadth }: MarketBreadthProps) {
  const total = breadth.advances + breadth.declines + breadth.unchanged;
  if (total <= 0) {
    return (
      <Card padding="lg" accent="emerald" className="h-full">
        <CardHeader
          title="Advance / Decline"
          subtitle={breadth.universeLabel ?? "Selected universe"}
          action={<BarChart3 className="h-4 w-4 text-accent" />}
        />
        <EmptyStatePanel
          message="Advance/decline breadth will appear once live quotes resolve for the selected universe."
          source="Market Breadth Engine · live quotes"
          icon={BarChart3}
        />
      </Card>
    );
  }
  const advanceWidth = (breadth.advances / total) * 100;
  const declineWidth = (breadth.declines / total) * 100;
  const ratio =
    breadth.advanceDeclineRatio ??
    (breadth.declines > 0
      ? breadth.advances / breadth.declines
      : breadth.advances);

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Advance / Decline"
        subtitle={`${(breadth.quotedStocks ?? total).toLocaleString("en-IN")} quoted · ${(breadth.totalStocks ?? total).toLocaleString("en-IN")} universe`}
        action={<BarChart3 className="h-4 w-4 text-accent" />}
      />
      <div className="flex items-end justify-between">
        <div>
          <p className="data-label">A/D Ratio</p>
          <p className="data-value mt-1 text-3xl font-semibold">
            {ratio.toFixed(2)}
          </p>
        </div>
        <StatusBadge
          tone={statusToneFromLabel(breadth.marketMood ?? "Neutral")}
          size="sm"
        >
          {breadth.marketMood ?? "Neutral"}
        </StatusBadge>
      </div>

      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-surface-border">
        <div
          className="h-full bg-gain transition-[width] duration-1000 ease-out"
          style={{ width: `${advanceWidth}%` }}
        />
        <div
          className="h-full bg-text-faint"
          style={{ width: `${100 - advanceWidth - declineWidth}%` }}
        />
        <div
          className="h-full bg-loss transition-[width] duration-1000 ease-out"
          style={{ width: `${declineWidth}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <div className="flex items-center gap-1 text-gain">
            <CircleArrowUp className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider">
              Advances
            </span>
          </div>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {breadth.advances.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-faint">
            Unchanged
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-secondary">
            {breadth.unchanged}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-loss">
            <span className="text-[10px] uppercase tracking-wider">
              Declines
            </span>
            <CircleArrowDown className="h-3 w-3" />
          </div>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {breadth.declines.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function SectorHeatmap({ breadth }: MarketBreadthProps) {
  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Sector Breadth"
        subtitle="Sector performance and internal advance %"
        action={<Layers3 className="h-4 w-4 text-accent" />}
      />
      {breadth.sectors.length === 0 ? (
        <EmptyStatePanel
          message="Sector breadth populates once live quotes resolve for the selected universe."
          source="Company master sectors · Market Breadth Engine"
          icon={Layers3}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {breadth.sectors.map((sector) => {
            const positive = sector.changePercent >= 0;
            const intensity = Math.min(Math.abs(sector.changePercent) / 2.5, 1);
            return (
              <div
                key={sector.name}
                className="group relative overflow-hidden rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-3 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${
                      positive ? "rgba(34,197,94," : "rgba(239,68,68,"
                    }${0.05 + intensity * 0.12}), transparent 75%)`,
                  }}
                />
                <div className="relative">
                  <p className="truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    {sector.name}
                  </p>
                  <p
                    className={`mt-2 font-mono text-lg font-semibold ${positive ? "text-gain" : "text-loss"}`}
                  >
                    {positive ? "+" : ""}
                    {sector.changePercent.toFixed(2)}%
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-text-faint">
                    <span>Breadth</span>
                    <span className="font-mono">{sector.breadth}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function WeekHighLow({ breadth }: MarketBreadthProps) {
  const hasExtremes =
    breadth.weekHighs.length > 0 || breadth.weekLows.length > 0;

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="52-Week Extremes"
        subtitle={`${breadth.newHighs} near 52W high · ${breadth.newLows} near 52W low`}
      />
      {!hasExtremes ? (
        <EmptyStatePanel
          message="52-week extremes appear when quote feeds include weekHigh52 / weekLow52 for the selected universe."
          source="Market Breadth Engine · 52W quote fields"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gain">
              Near 52W high
            </p>
            <div className="space-y-2">
              {breadth.weekHighs.map((item) => (
                <StockLink key={item.symbol} symbol={item.symbol} className="block">
                  <p className="text-xs font-semibold text-text-primary hover:text-accent">
                    {item.symbol}
                  </p>
                  <ChangeIndicator
                    value={item.changePercent}
                    size="sm"
                    showIcon={false}
                  />
                </StockLink>
              ))}
            </div>
          </div>
          <div className="border-l border-surface-border-subtle pl-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-loss">
              Near 52W low
            </p>
            <div className="space-y-2">
              {breadth.weekLows.map((item) => (
                <StockLink key={item.symbol} symbol={item.symbol} className="block">
                  <p className="text-xs font-semibold text-text-primary hover:text-accent">
                    {item.symbol}
                  </p>
                  <ChangeIndicator
                    value={item.changePercent}
                    size="sm"
                    showIcon={false}
                  />
                </StockLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function MarketBreadth({ breadth: initial }: MarketBreadthProps) {
  const router = useRouter();
  const [breadth, setBreadth] = useState(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setBreadth(initial);
  }, [initial]);

  const onUniverseChange = (id: BreadthUniverseId) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/market/breadth?universe=${id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { breadth?: MarketBreadthType };
        if (json.breadth) setBreadth(json.breadth);
        router.refresh();
      } catch {
        /* keep current snapshot */
      }
    });
  };

  return (
    <div className={pending ? "opacity-70 transition-opacity" : undefined}>
      <div className="mb-4">
        <InstitutionalSummary
          breadth={breadth}
          onUniverseChange={onUniverseChange}
          pending={pending}
        />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdvanceDecline breadth={breadth} />
        <div className="xl:col-span-2">
          <SectorHeatmap breadth={breadth} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MoverList
          title="Top Gainers"
          subtitle={breadth.universeLabel ?? "Selected universe"}
          items={breadth.gainers}
          direction="gainers"
        />
        <MoverList
          title="Top Losers"
          subtitle={breadth.universeLabel ?? "Selected universe"}
          items={breadth.losers}
          direction="losers"
        />
        <WeekHighLow breadth={breadth} />
        <MoverList
          title="Most Active"
          subtitle="Ranked by volume"
          items={breadth.mostActive}
          valueLabel="Volume"
        />
      </div>
    </div>
  );
}
