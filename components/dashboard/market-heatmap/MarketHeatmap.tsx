"use client";

import { Card, CardHeader, CardFooter } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { StatusBadge } from "@/src/design";
import type {
  HeatmapColorMetric,
  HeatmapSectorTile,
  HeatmapUniverseId,
  MarketHeatmapSnapshot,
} from "@/lib/market-heatmap";
import { median } from "@/lib/market-heatmap";
import {
  ArrowDownRight,
  ArrowUpRight,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  colorForValue,
  formatMetricDisplay,
  metricValueForSector,
} from "./color";
import { HeatmapControls } from "./HeatmapControls";
import { HeatmapLegend } from "./HeatmapLegend";
import { SectorDrilldown } from "./SectorDrilldown";

interface MarketHeatmapProps {
  /** Optional SSR snapshot; when omitted, client fetches on mount (lazy). */
  initial?: MarketHeatmapSnapshot | null;
  /** Default universe when lazy-loading. */
  defaultUniverse?: HeatmapUniverseId;
}

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

function SectorTileButton({
  tile,
  colorMetric,
  levelMedian,
  selected,
  onSelect,
}: {
  tile: HeatmapSectorTile;
  colorMetric: HeatmapColorMetric;
  levelMedian: number | null;
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  const value = metricValueForSector(tile, colorMetric);
  const bg = colorForValue(value, colorMetric, levelMedian);

  return (
    <button
      type="button"
      onClick={() => onSelect(tile.name)}
      className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        selected
          ? "border-accent ring-1 ring-accent/40"
          : "border-surface-border-subtle"
      }`}
      style={{ backgroundColor: bg }}
      aria-pressed={selected}
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[11px] font-semibold text-text-primary">
            {tile.name}
          </p>
          {tile.moneyFlow === "inflow" ? (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gain" />
          ) : tile.moneyFlow === "outflow" ? (
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-loss" />
          ) : null}
        </div>
        <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-text-primary">
          {formatMetricDisplay(value, colorMetric)}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-text-primary/80">
          <span>
            Chg{" "}
            <span className="font-mono">
              {tile.dailyChangePercent >= 0 ? "+" : ""}
              {tile.dailyChangePercent.toFixed(2)}%
            </span>
          </span>
          <span className="text-right">
            Brd{" "}
            <span className="font-mono">{tile.breadthPercent.toFixed(0)}%</span>
          </span>
          <span>
            Adv <span className="font-mono">{tile.advances}</span>
          </span>
          <span className="text-right">
            Dec <span className="font-mono">{tile.declines}</span>
          </span>
          <span className="col-span-2 truncate">
            RS #{tile.relativeStrengthRank}
            {tile.averageVolume != null
              ? ` · Vol ${tile.averageVolume >= 1e5 ? `${(tile.averageVolume / 1e5).toFixed(1)}L` : tile.averageVolume.toLocaleString("en-IN")}`
              : ""}
          </span>
        </div>
      </div>
    </button>
  );
}

export function MarketHeatmap({
  initial = null,
  defaultUniverse = "nse",
}: MarketHeatmapProps) {
  const [snapshot, setSnapshot] = useState<MarketHeatmapSnapshot | null>(
    initial
  );
  const [universe, setUniverse] = useState<HeatmapUniverseId>(
    initial?.universe ?? defaultUniverse
  );
  const [colorMetric, setColorMetric] =
    useState<HeatmapColorMetric>("dailyChange");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(!initial);

  const load = useCallback(async (nextUniverse: HeatmapUniverseId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/market/heatmap?universe=${nextUniverse}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Heatmap request failed (${res.status})`);
      const json = (await res.json()) as {
        heatmap?: MarketHeatmapSnapshot;
      };
      if (json.heatmap) {
        setSnapshot(json.heatmap);
        setSelectedSector(null);
      } else {
        throw new Error("Empty heatmap payload");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load heatmap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) {
      void load(universe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only lazy load
  }, []);

  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  const onUniverseChange = (id: HeatmapUniverseId) => {
    setUniverse(id);
    startTransition(() => {
      void load(id);
    });
  };

  const levelMedian = useMemo(() => {
    if (!snapshot) return null;
    const values = snapshot.sectors
      .map((s) => metricValueForSector(s, colorMetric))
      .filter((v): v is number => v != null && v > 0);
    return median(values);
  }, [snapshot, colorMetric]);

  const selectedTile = useMemo(() => {
    if (!snapshot || !selectedSector) return null;
    return (
      snapshot.sectors.find((s) => s.name === selectedSector) ?? null
    );
  }, [snapshot, selectedSector]);

  const visibleSectors = snapshot?.sectors ?? [];

  return (
    <div className={pending || loading ? "opacity-80 transition-opacity" : undefined}>
      <Card padding="lg" accent="indigo">
        <CardHeader
          title="Sector & Market Heatmap"
          subtitle={
            snapshot
              ? `${snapshot.universeLabel} · ${snapshot.sectorCount} sectors · ${snapshot.quotedStocks.toLocaleString("en-IN")} quoted`
              : "Entire NSE institutional heatmap"
          }
          icon={<LayoutGrid className="h-4 w-4 text-indigo-400" />}
          timestamp={
            snapshot ? `Updated ${formatTs(snapshot.lastUpdated)}` : undefined
          }
          badge={
            loading ? (
              <StatusBadge tone="info" size="sm">
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Scanning
                </span>
              </StatusBadge>
            ) : snapshot ? (
              <StatusBadge tone="accent" size="sm">
                {snapshot.quoteCoveragePercent.toFixed(0)}% coverage
              </StatusBadge>
            ) : null
          }
          action={
            <HeatmapControls
              universe={universe}
              colorMetric={colorMetric}
              pending={pending || loading}
              onUniverseChange={onUniverseChange}
              onColorMetricChange={setColorMetric}
            />
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <HeatmapLegend />
          {snapshot &&
          (snapshot.moneyInflowSectors.length > 0 ||
            snapshot.moneyOutflowSectors.length > 0) ? (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {snapshot.moneyInflowSectors.slice(0, 3).map((name) => (
                <StatusBadge key={`in-${name}`} tone="success" size="sm">
                  Inflow · {name}
                </StatusBadge>
              ))}
              {snapshot.moneyOutflowSectors.slice(0, 3).map((name) => (
                <StatusBadge key={`out-${name}`} tone="danger" size="sm">
                  Outflow · {name}
                </StatusBadge>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <EmptyStatePanel
            message={error}
            source="Market Heatmap Engine"
            action={
              <button
                type="button"
                className="text-[11px] font-semibold text-accent"
                onClick={() => void load(universe)}
              >
                Retry →
              </button>
            }
          />
        ) : !snapshot && loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-surface-overlay"
              />
            ))}
          </div>
        ) : visibleSectors.length === 0 ? (
          <EmptyStatePanel
            message="Sector heatmap populates once live quotes resolve for the selected universe."
            source="Market Heatmap Engine · company master sectors"
            icon={LayoutGrid}
          />
        ) : (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            role="list"
            aria-label="Sector heatmap"
          >
            {visibleSectors.map((tile) => (
              <div key={tile.name} role="listitem">
                <SectorTileButton
                  tile={tile}
                  colorMetric={colorMetric}
                  levelMedian={levelMedian}
                  selected={selectedSector === tile.name}
                  onSelect={setSelectedSector}
                />
              </div>
            ))}
          </div>
        )}

        <CardFooter>
          <span>Source · {snapshot?.dataSource ?? "Market Heatmap Engine"}</span>
          <span>
            Period sample · {(snapshot?.periodCoveragePercent ?? 0).toFixed(1)}%
            · Click a sector to drill down
          </span>
        </CardFooter>
      </Card>

      {selectedTile ? (
        <div className="mt-4">
          <SectorDrilldown
            sector={selectedTile}
            colorMetric={colorMetric}
            onClose={() => setSelectedSector(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
