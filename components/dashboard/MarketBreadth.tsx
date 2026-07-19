"use client";

import { Card, CardHeader, CardFooter } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { StockLink } from "@/components/ui/StockLink";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { StatusBadge, statusToneFromLabel, HeatMeter } from "@/src/design";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import {
  BREADTH_UNIVERSE_OPTIONS,
  type BreadthUniverseId,
  type TrendDirection,
} from "@/lib/market-breadth/types";
import type { MarketBreadth as MarketBreadthType, MarketMover } from "@/types";
import { MetricExplain } from "@/components/dashboard/market-internals/MetricExplain";
import {
  BreadthDonut,
  KpiCard,
  ParticipationBar,
  SectorHeatBar,
} from "@/components/dashboard/market-internals/visuals";
import {
  Activity,
  BarChart3,
  Layers3,
  TrendingDown,
  TrendingUp,
  Gauge,
  Shield,
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

function asTrend(value?: TrendDirection): TrendDirection {
  return value ?? "unknown";
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
          source="Market Internals · live quotes"
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

function InternalsSummary({
  breadth,
  onUniverseChange,
  pending,
}: {
  breadth: MarketBreadthType;
  onUniverseChange: (id: BreadthUniverseId) => void;
  pending: boolean;
}) {
  const universe = (breadth.universe ?? "nse") as BreadthUniverseId;
  const total = breadth.totalStocks ?? 0;
  const mood = breadth.marketMood ?? "Insufficient Data";

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Market Internals"
        subtitle="Institutional breadth · Entire NSE analytics"
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Universe"
          value={breadth.universeLabel ?? "Entire NSE"}
          metricKey="universe"
        />
        <KpiCard
          label="Total Stocks"
          value={total.toLocaleString("en-IN")}
          hint={
            breadth.quotedStocks != null
              ? `${breadth.quotedStocks.toLocaleString("en-IN")} quoted · ${(breadth.quoteCoveragePercent ?? 0).toFixed(1)}% coverage`
              : undefined
          }
          metricKey="totalStocks"
        />
        <KpiCard
          label="Last Updated"
          value={formatTs(breadth.lastUpdated)}
          metricKey="lastUpdated"
        />
        <KpiCard
          label="Market Status"
          value={breadth.marketStatusLabel ?? "—"}
          metricKey="marketStatus"
        />
        <KpiCard
          label="Data Source"
          value="Live quotes"
          hint={breadth.dataSource}
          metricKey="dataSource"
        />
      </div>
    </Card>
  );
}

function BreadthPanel({ breadth }: MarketBreadthProps) {
  const quoted =
    breadth.quotedStocks ??
    breadth.advances + breadth.declines + breadth.unchanged;
  const ratio =
    breadth.advanceDeclineRatio ??
    (breadth.declines > 0
      ? breadth.advances / breadth.declines
      : breadth.advances);
  const breadthPct =
    breadth.breadthPercent ??
    (quoted > 0
      ? Math.round((breadth.advances / quoted) * 1000) / 10
      : 0);
  const net = breadth.netAdvances ?? breadth.advances - breadth.declines;

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Breadth"
        subtitle="Advance / decline participation"
        icon={<BarChart3 className="h-4 w-4 text-emerald-400" />}
      />
      {quoted <= 0 ? (
        <EmptyStatePanel
          message="Breadth appears once live quotes resolve for the selected universe."
          source="Market Internals Engine"
          icon={BarChart3}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <BreadthDonut
            advances={breadth.advances}
            declines={breadth.declines}
            unchanged={breadth.unchanged}
          />
          <div className="grid grid-cols-2 gap-2 content-start">
            <KpiCard
              label="Advances"
              value={breadth.advances.toLocaleString("en-IN")}
              tone="text-gain"
              metricKey="advances"
            />
            <KpiCard
              label="Declines"
              value={breadth.declines.toLocaleString("en-IN")}
              tone="text-loss"
              metricKey="declines"
            />
            <KpiCard
              label="Unchanged"
              value={String(breadth.unchanged)}
              metricKey="unchanged"
            />
            <KpiCard
              label="A/D Ratio"
              value={ratio.toFixed(2)}
              metricKey="adRatio"
            />
            <KpiCard
              label="Breadth %"
              value={`${breadthPct.toFixed(1)}%`}
              metricKey="breadthPct"
            />
            <KpiCard
              label="Net Advances"
              value={`${net >= 0 ? "+" : ""}${net}`}
              tone={net >= 0 ? "text-gain" : "text-loss"}
              metricKey="netAdvances"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function ParticipationPanel({ breadth }: MarketBreadthProps) {
  const sample = breadth.technicalSampleSize ?? 0;
  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Participation"
        subtitle={
          sample > 0
            ? `EMA trend sample · ${sample.toLocaleString("en-IN")} stocks · ${(breadth.technicalCoveragePercent ?? 0).toFixed(1)}% universe coverage`
            : "EMA trend participation"
        }
        icon={<Shield className="h-4 w-4 text-emerald-400" />}
      />
      {breadth.aboveEma20 == null ? (
        <EmptyStatePanel
          message="EMA participation populates after OHLC technicals resolve for the volume-ranked sample."
          source="Market Internals · EMA 20 / 50 / 200"
          icon={Shield}
        />
      ) : (
        <div className="space-y-4">
          <ParticipationBar
            label="Above 20 EMA"
            count={breadth.aboveEma20 ?? null}
            pct={breadth.aboveEma20Pct ?? null}
            trend={asTrend(breadth.aboveEma20Trend)}
            metricKey="aboveEma20"
          />
          <ParticipationBar
            label="Above 50 EMA"
            count={breadth.aboveEma50 ?? null}
            pct={breadth.aboveEma50Pct ?? null}
            trend={asTrend(breadth.aboveEma50Trend)}
            metricKey="aboveEma50"
          />
          <ParticipationBar
            label="Above 200 EMA"
            count={breadth.aboveEma200 ?? null}
            pct={breadth.aboveEma200Pct ?? null}
            trend={asTrend(breadth.aboveEma200Trend)}
            metricKey="aboveEma200"
          />
        </div>
      )}
    </Card>
  );
}

function StrengthPanel({ breadth }: MarketBreadthProps) {
  const hl =
    breadth.highLowRatio ??
    (breadth.newLows > 0
      ? breadth.newHighs / breadth.newLows
      : breadth.newHighs);

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Strength"
        subtitle="52-week extremes · RSI · daily change"
        icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <KpiCard
          label="52W Highs"
          value={breadth.newHighs.toLocaleString("en-IN")}
          tone="text-gain"
          metricKey="newHighs"
        />
        <KpiCard
          label="52W Lows"
          value={breadth.newLows.toLocaleString("en-IN")}
          tone="text-loss"
          metricKey="newLows"
        />
        <KpiCard
          label="High/Low Ratio"
          value={hl.toFixed(2)}
          metricKey="highLowRatio"
        />
        <KpiCard
          label="Average RSI"
          value={
            breadth.averageRsi != null ? breadth.averageRsi.toFixed(1) : "—"
          }
          metricKey="averageRsi"
        />
        <KpiCard
          label="Avg Daily Change"
          value={
            breadth.averageDailyReturn != null
              ? `${breadth.averageDailyReturn >= 0 ? "+" : ""}${breadth.averageDailyReturn.toFixed(2)}%`
              : "—"
          }
          tone={
            breadth.averageDailyReturn != null &&
            breadth.averageDailyReturn >= 0
              ? "text-gain"
              : breadth.averageDailyReturn != null
                ? "text-loss"
                : undefined
          }
          metricKey="avgDailyChange"
        />
      </div>
    </Card>
  );
}

function SectorBreadthPanel({ breadth }: MarketBreadthProps) {
  const sectors = [...breadth.sectors].sort(
    (a, b) => (b.breadth ?? 0) - (a.breadth ?? 0)
  );
  const strongest =
    breadth.strongestSector ?? sectors[0]?.name ?? null;
  const weakest =
    breadth.weakestSector ??
    (sectors.length > 0 ? sectors[sectors.length - 1]?.name : null);

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Sector Breadth"
        subtitle="All NSE sectors · sorted by breadth %"
        icon={<Layers3 className="h-4 w-4 text-emerald-400" />}
        action={<MetricExplain metricKey="sectorBreadth" />}
      />
      {sectors.length === 0 ? (
        <EmptyStatePanel
          message="Sector breadth populates once live quotes resolve for the selected universe."
          source="Company master sectors · Market Internals"
          icon={Layers3}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <KpiCard
              label="Strongest Sector"
              value={strongest ?? "—"}
              tone="text-gain"
              metricKey="strongestSector"
            />
            <KpiCard
              label="Weakest Sector"
              value={weakest ?? "—"}
              tone="text-loss"
              metricKey="weakestSector"
            />
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {sectors.map((sector) => (
              <SectorHeatBar
                key={sector.name}
                name={sector.name}
                advances={sector.advances ?? 0}
                declines={sector.declines ?? 0}
                breadth={sector.breadth}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function MarketMoodPanel({ breadth }: MarketBreadthProps) {
  const mood = breadth.marketMood ?? "Insufficient Data";
  const gauge = breadth.moodGauge ?? 50;
  const factors = breadth.moodFactors ?? [];

  return (
    <Card padding="lg" accent="emerald" className="h-full">
      <CardHeader
        title="Market Mood"
        subtitle="Multi-factor internals regime"
        icon={<Gauge className="h-4 w-4 text-emerald-400" />}
        badge={
          <StatusBadge tone={statusToneFromLabel(mood)} size="sm">
            {mood}
          </StatusBadge>
        }
        action={<MetricExplain metricKey="marketMood" />}
      />
      <HeatMeter
        label="Composite Mood"
        value={gauge}
        lowLabel="Bearish"
        highLabel="Bullish"
      />
      {factors.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {factors.map((factor) => {
            const tone =
              factor.score >= 1
                ? "text-gain"
                : factor.score <= -1
                  ? "text-loss"
                  : "text-text-secondary";
            return (
              <div
                key={factor.id}
                className="flex items-center justify-between rounded-lg border border-surface-border-subtle px-3 py-2"
              >
                <span className="text-[11px] text-text-muted">{factor.label}</span>
                <span className={`font-mono text-xs font-semibold tabular-nums ${tone}`}>
                  {factor.score > 0 ? "+" : ""}
                  {factor.score.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-text-muted">
          Mood requires ≥35% quote coverage and multiple internals factors — never A/D alone.
        </p>
      )}

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
        <span>Source · {breadth.dataSource ?? "Market Internals Engine"}</span>
        <span>
          Factors · Breadth · EMA · H/L · Sectors · RSI
        </span>
      </CardFooter>
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
          source="Market Internals · 52W quote fields"
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
        <InternalsSummary
          breadth={breadth}
          onUniverseChange={onUniverseChange}
          pending={pending}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BreadthPanel breadth={breadth} />
        <ParticipationPanel breadth={breadth} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <StrengthPanel breadth={breadth} />
        <MarketMoodPanel breadth={breadth} />
      </div>

      <div className="mb-4">
        <SectorBreadthPanel breadth={breadth} />
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
