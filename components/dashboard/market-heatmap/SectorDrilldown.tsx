"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { StatusBadge } from "@/src/design";
import type {
  HeatmapColorMetric,
  HeatmapSectorTile,
} from "@/lib/market-heatmap";
import {
  ArrowDownRight,
  ArrowUpRight,
  Crosshair,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { formatMetricDisplay } from "./color";
import { StockTreemap } from "./StockTreemap";

interface SectorDrilldownProps {
  sector: HeatmapSectorTile;
  colorMetric: HeatmapColorMetric;
  onClose: () => void;
}

function formatVol(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  return value.toLocaleString("en-IN");
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-surface-border-subtle px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm font-semibold tabular-nums ${tone ?? "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MoverColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: { symbol: string; changePercent: number }[];
  tone: string;
}) {
  return (
    <div>
      <p className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-text-muted">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.symbol}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="font-semibold text-text-primary">
                {item.symbol}
              </span>
              <span
                className={`font-mono tabular-nums ${item.changePercent >= 0 ? "text-gain" : "text-loss"}`}
              >
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SectorDrilldown({
  sector,
  colorMetric,
  onClose,
}: SectorDrilldownProps) {
  const topGainers = useMemo(
    () =>
      sector.stocks
        .filter((s) => s.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5),
    [sector.stocks]
  );
  const topLosers = useMemo(
    () =>
      sector.stocks
        .filter((s) => s.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5),
    [sector.stocks]
  );
  const strongest = useMemo(
    () =>
      sector.stocks
        .slice()
        .sort((a, b) => b.relativeStrength - a.relativeStrength)
        .slice(0, 5),
    [sector.stocks]
  );
  const weakest = useMemo(
    () =>
      sector.stocks
        .slice()
        .sort((a, b) => a.relativeStrength - b.relativeStrength)
        .slice(0, 5),
    [sector.stocks]
  );

  const avgRsi = useMemo(() => {
    const vals = sector.stocks
      .map((s) => s.rsi)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [sector.stocks]);

  const flowTone =
    sector.moneyFlow === "inflow"
      ? "success"
      : sector.moneyFlow === "outflow"
        ? "danger"
        : "neutral";

  return (
    <Card padding="lg" accent="indigo" className="animate-fade-in">
      <CardHeader
        title={sector.name}
        subtitle="Sector drilldown · stock heatmap"
        icon={<Crosshair className="h-4 w-4 text-indigo-400" />}
        badge={
          <StatusBadge tone={flowTone} size="sm">
            {sector.moneyFlow === "inflow"
              ? "Money Inflow"
              : sector.moneyFlow === "outflow"
                ? "Money Outflow"
                : "Neutral Flow"}
          </StatusBadge>
        }
        action={
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sector drilldown"
            className="rounded-lg border border-surface-border p-1.5 text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <Stat
          label="Sector Breadth"
          value={`${sector.breadthPercent.toFixed(1)}%`}
        />
        <Stat
          label="Sector Momentum"
          value={sector.momentumScore.toFixed(1)}
        />
        <Stat
          label="Sector RSI"
          value={avgRsi != null ? avgRsi.toFixed(1) : "—"}
        />
        <Stat label="Avg Volume" value={formatVol(sector.averageVolume)} />
        <Stat
          label="Avg Delivery %"
          value={
            sector.averageDeliveryPercent != null
              ? `${sector.averageDeliveryPercent.toFixed(1)}%`
              : "—"
          }
        />
        <Stat
          label="Daily Change"
          value={formatMetricDisplay(sector.dailyChangePercent, "dailyChange")}
          tone={
            sector.dailyChangePercent >= 0 ? "text-gain" : "text-loss"
          }
        />
        <Stat
          label="Relative Strength"
          value={`${sector.relativeStrength >= 0 ? "+" : ""}${sector.relativeStrength.toFixed(2)} pp`}
        />
        <Stat
          label="RS Rank"
          value={`#${sector.relativeStrengthRank}`}
          tone="text-gain"
        />
        <Stat
          label="Weakness Rank"
          value={`#${sector.relativeWeaknessRank}`}
          tone="text-loss"
        />
        <Stat
          label="Volume Expansion"
          value={
            sector.volumeExpansion != null
              ? `${sector.volumeExpansion.toFixed(2)}×`
              : "—"
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MoverColumn
          title="Top Gainers"
          items={topGainers}
          tone="text-gain"
        />
        <MoverColumn
          title="Top Losers"
          items={topLosers}
          tone="text-loss"
        />
        <MoverColumn
          title="Strongest Stocks"
          items={strongest}
          tone="text-gain"
        />
        <MoverColumn
          title="Weakest Stocks"
          items={weakest}
          tone="text-loss"
        />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <ArrowUpRight className="h-3.5 w-3.5 text-gain" />
          <ArrowDownRight className="h-3.5 w-3.5 text-loss" />
          <p className="text-[11px] font-medium text-text-secondary">
            Stock heatmap · tile size by market cap (volume fallback)
          </p>
        </div>
        {sector.stocks.length === 0 ? (
          <EmptyStatePanel
            message="Stock tiles appear once quotes resolve for this sector."
            source="Market Heatmap Engine"
          />
        ) : (
          <StockTreemap stocks={sector.stocks} colorMetric={colorMetric} />
        )}
      </div>
    </Card>
  );
}
