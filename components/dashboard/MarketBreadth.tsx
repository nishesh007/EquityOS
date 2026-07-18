"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { StockLink } from "@/components/ui/StockLink";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { buildInitialQuotesMap } from "@/services/marketData";
import type { MarketBreadth as MarketBreadthType, MarketMover } from "@/types";
import { HeatMeter } from "@/src/design";
import { BarChart3, CircleArrowDown, CircleArrowUp, Layers3 } from "lucide-react";

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
    : items;

  return (
    <Card padding="lg" className="h-full">
      <CardHeader title={title} subtitle={subtitle} />
      <div className="space-y-0.5">
        {displayItems.map((item, index) => {
          const quote =
            quotes.get(item.symbol) ?? item.quote ?? createUnavailableQuote(item.symbol);

          return (
            <StockLink
              key={item.symbol}
              symbol={item.symbol}
              className="group flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover/50"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-4 text-[10px] font-mono text-text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-text-primary transition-colors group-hover:text-accent">
                    {item.symbol}
                  </p>
                  <p className="truncate text-[10px] text-text-muted">{item.name}</p>
                </div>
              </div>
              <div className="ml-3 text-right">
                {valueLabel === "Volume" ? (
                  <>
                    <p className="font-mono text-xs text-text-secondary tabular-nums">
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
      {direction && displayItems.length < MAX_MOVER_ROWS ? (
        <p className="mt-3 border-t border-surface-border-subtle pt-3 text-[11px] text-text-muted">
          Only {displayItems.length} qualifying{" "}
          {direction === "gainers" ? "gainers" : "losers"} today
        </p>
      ) : null}
    </Card>
  );
}

function AdvanceDecline({ breadth }: MarketBreadthProps) {
  const total = breadth.advances + breadth.declines + breadth.unchanged;
  const advanceWidth = (breadth.advances / total) * 100;
  const declineWidth = (breadth.declines / total) * 100;
  const ratio = breadth.advances / breadth.declines;

  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Advance / Decline"
        subtitle={`${total.toLocaleString("en-IN")} NSE stocks`}
        action={<BarChart3 className="h-4 w-4 text-accent" />}
      />
      <div className="flex items-end justify-between">
        <div>
          <p className="data-label">A/D Ratio</p>
          <p className="mt-1 data-value text-3xl font-semibold">{ratio.toFixed(2)}</p>
        </div>
        <p className="text-xs font-medium text-gain">Healthy breadth</p>
      </div>

      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-surface-border">
        <div
          className="h-full bg-gain transition-[width] duration-1000 ease-out"
          style={{ width: `${advanceWidth}%` }}
        />
        <div className="h-full bg-text-faint" style={{ width: `${100 - advanceWidth - declineWidth}%` }} />
        <div
          className="h-full bg-loss transition-[width] duration-1000 ease-out"
          style={{ width: `${declineWidth}%` }}
        />
      </div>

      <HeatMeter
        className="mt-4"
        label="Market Mood"
        value={total > 0 ? (breadth.advances / (breadth.advances + breadth.declines)) * 100 : 50}
        lowLabel="Bearish"
        highLabel="Bullish"
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <div className="flex items-center gap-1 text-gain">
            <CircleArrowUp className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider">Advances</span>
          </div>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {breadth.advances.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-faint">Unchanged</p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-secondary">
            {breadth.unchanged}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-loss">
            <span className="text-[10px] uppercase tracking-wider">Declines</span>
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
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Sector Heatmap"
        subtitle="NSE sector performance and internal breadth"
        action={<Layers3 className="h-4 w-4 text-accent" />}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {breadth.sectors.map((sector) => {
          const positive = sector.changePercent >= 0;
          const intensity = Math.min(Math.abs(sector.changePercent) / 2.5, 1);

          return (
            <div
              key={sector.name}
              className="group relative overflow-hidden rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-surface-border"
            >
              <div
                className="pointer-events-none absolute inset-0 transition-opacity group-hover:opacity-100"
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
                <p className={`mt-2 font-mono text-lg font-semibold ${positive ? "text-gain" : "text-loss"}`}>
                  {positive ? "+" : ""}
                  {sector.changePercent.toFixed(2)}%
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-text-faint">
                  <span>Breadth</span>
                  <span className="font-mono">{sector.breadth}/100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekHighLow({ breadth }: MarketBreadthProps) {
  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="52 Week High / Low"
        subtitle={`${breadth.newHighs} highs · ${breadth.newLows} lows today`}
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gain">
            New highs
          </p>
          <div className="space-y-2">
            {breadth.weekHighs.map((item) => (
              <StockLink key={item.symbol} symbol={item.symbol} className="block">
                <p className="text-xs font-semibold text-text-primary hover:text-accent">{item.symbol}</p>
                <ChangeIndicator value={item.changePercent} size="sm" showIcon={false} />
              </StockLink>
            ))}
          </div>
        </div>
        <div className="border-l border-surface-border-subtle pl-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-loss">
            New lows
          </p>
          <div className="space-y-2">
            {breadth.weekLows.map((item) => (
              <StockLink key={item.symbol} symbol={item.symbol} className="block">
                <p className="text-xs font-semibold text-text-primary hover:text-accent">{item.symbol}</p>
                <ChangeIndicator value={item.changePercent} size="sm" showIcon={false} />
              </StockLink>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function MarketBreadth({ breadth }: MarketBreadthProps) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdvanceDecline breadth={breadth} />
        <div className="xl:col-span-2">
          <SectorHeatmap breadth={breadth} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MoverList
          title="Top Gainers"
          subtitle="NSE large & mid caps"
          items={breadth.gainers}
          direction="gainers"
        />
        <MoverList
          title="Top Losers"
          subtitle="NSE large & mid caps"
          items={breadth.losers}
          direction="losers"
        />
        <WeekHighLow breadth={breadth} />
        <MoverList
          title="Most Active"
          subtitle="Ranked by traded value"
          items={breadth.mostActive}
          valueLabel="Volume"
        />
      </div>
    </div>
  );
}
