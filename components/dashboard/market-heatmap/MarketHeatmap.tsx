"use client";

import { Card, CardHeader, CardFooter } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { StatusBadge } from "@/src/design";
import type {
  HeatmapColorMetric,
  HeatmapSectorTile,
  HeatmapUniverseId,
  MarketHeatmapSnapshot,
} from "@/lib/market-heatmap/types";
import { median } from "@/lib/market-heatmap/metrics";
import {
  ArrowDownRight,
  ArrowUpRight,
  LayoutGrid,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  colorForValue,
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
  /** Consume only `initial` — no /api/market/heatmap fetches. */
  snapshotLocked?: boolean;
  /** Hide footer as-of (page owns timestamp). */
  hideTimestamps?: boolean;
}

const CLIENT_CACHE_PREFIX = "equityos.heatmap.v1:";

function clientCacheKey(universe: HeatmapUniverseId): string {
  return `${CLIENT_CACHE_PREFIX}${universe}`;
}

function readClientHeatmapCache(
  universe: HeatmapUniverseId
): MarketHeatmapSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(clientCacheKey(universe));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketHeatmapSnapshot;
    if (
      !parsed ||
      !Array.isArray(parsed.sectors) ||
      parsed.sectors.length === 0 ||
      !(parsed.quotedStocks > 0)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeClientHeatmapCache(
  universe: HeatmapUniverseId,
  snapshot: MarketHeatmapSnapshot
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      clientCacheKey(universe),
      JSON.stringify(snapshot)
    );
  } catch {
    /* quota / private mode — ignore */
  }
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
  const change = tile.dailyChangePercent;
  const trendUp = change > 0.05;
  const trendDown = change < -0.05;
  const tooltip = [
    tile.name,
    `Change ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
    `Breadth ${tile.breadthPercent.toFixed(0)}%`,
    `Adv ${tile.advances} · Dec ${tile.declines}`,
    `RS #${tile.relativeStrengthRank}`,
    tile.averageVolume != null
      ? `Vol ${
          tile.averageVolume >= 1e5
            ? `${(tile.averageVolume / 1e5).toFixed(1)}L`
            : tile.averageVolume.toLocaleString("en-IN")
        }`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      title={tooltip}
      onClick={() => onSelect(tile.name)}
      className={`group relative flex h-[88px] w-full flex-col overflow-hidden rounded-xl border px-3 py-2 text-left transition-[border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent xl:h-[92px] ${
        selected
          ? "border-accent ring-1 ring-accent/40"
          : "border-white/10"
      }`}
      style={{ backgroundColor: bg }}
      aria-pressed={selected}
      aria-label={`${tile.name}: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%, breadth ${tile.breadthPercent.toFixed(0)}%`}
    >
      <div className="flex min-w-0 items-start justify-between gap-1">
        <p className="truncate text-caption font-semibold leading-[1.3] text-text-primary">
          {tile.name}
        </p>
        {trendUp ? (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-gain" aria-hidden />
        ) : trendDown ? (
          <ArrowDownRight className="h-4 w-4 shrink-0 text-loss" aria-hidden />
        ) : null}
      </div>

      <p className="mt-auto text-metric font-semibold leading-[1.3] tabular-nums text-text-primary">
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}%
      </p>

      <p className="mt-1 text-micro tabular-nums text-text-muted">
        Breadth {tile.breadthPercent.toFixed(0)}%
      </p>
    </button>
  );
}

export function MarketHeatmap({
  initial = null,
  defaultUniverse = "nse",
  snapshotLocked = false,
  hideTimestamps = false,
}: MarketHeatmapProps) {
  const [universe, setUniverse] = useState<HeatmapUniverseId>(
    initial?.universe ?? defaultUniverse
  );
  const [snapshot, setSnapshot] = useState<MarketHeatmapSnapshot | null>(
    initial
  );
  const [colorMetric, setColorMetric] =
    useState<HeatmapColorMetric>("dailyChange");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /** Quiet background refresh — never blocks cached tiles. */
  const [refreshing, setRefreshing] = useState(false);
  /** True when painted tiles came from local/SSR cache ahead of a live response. */
  const [showingCached, setShowingCached] = useState(false);

  const load = useCallback(async (nextUniverse: HeatmapUniverseId) => {
    if (snapshotLocked) return;
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/market/heatmap?universe=${nextUniverse}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Heatmap request failed (${res.status})`);
      const json = (await res.json()) as {
        heatmap?: MarketHeatmapSnapshot;
      };
      if (json.heatmap && json.heatmap.sectors?.length) {
        setSnapshot(json.heatmap);
        writeClientHeatmapCache(nextUniverse, json.heatmap);
        setSelectedSector(null);
        setShowingCached(false);
      } else if (!json.heatmap) {
        throw new Error("Empty heatmap payload");
      }
    } catch (err) {
      // Keep cached tiles visible; only surface the error when nothing is painted.
      setError(err instanceof Error ? err.message : "Failed to load heatmap");
    } finally {
      setRefreshing(false);
    }
  }, [snapshotLocked]);

  useEffect(() => {
    if (snapshotLocked) {
      setShowingCached(false);
      return;
    }
    // Cache-first paint, then silent background refresh. Never block on rebuild.
    if (!initial) {
      const cached = readClientHeatmapCache(universe);
      if (cached) {
        setSnapshot(cached);
        setShowingCached(true);
      }
    } else {
      setShowingCached(false);
    }
    void load(universe);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + universe owned by handlers
  }, [snapshotLocked]);

  useEffect(() => {
    if (initial) {
      setSnapshot(initial);
      setShowingCached(false);
      if (!snapshotLocked) {
        writeClientHeatmapCache(initial.universe, initial);
      }
    }
  }, [initial, snapshotLocked]);

  const onUniverseChange = (id: HeatmapUniverseId) => {
    if (snapshotLocked) return;
    setUniverse(id);
    const cached = readClientHeatmapCache(id);
    if (cached) {
      setSnapshot(cached);
      setShowingCached(true);
    }
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
  const showError = Boolean(error) && visibleSectors.length === 0;

  const headerBadge = (() => {
    if (!snapshot) return null;
    if (showingCached && refreshing) {
      return (
        <StatusBadge tone="info" size="sm">
          Cached · Updating
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="accent" size="sm">
        {snapshot.quoteCoveragePercent.toFixed(0)}% coverage
      </StatusBadge>
    );
  })();

  return (
    <div>
      <Card padding="sm" accent="indigo">
        <CardHeader
          title="Sector & Market Heatmap"
          subtitle={
            snapshot
              ? `${snapshot.universeLabel} · ${snapshot.sectorCount} sectors · ${snapshot.quotedStocks.toLocaleString("en-IN")} quoted`
              : "Entire NSE institutional heatmap"
          }
          icon={<LayoutGrid className="h-4 w-4 text-indigo-400" />}
          badge={headerBadge}
          action={
            <HeatmapControls
              universe={universe}
              colorMetric={colorMetric}
              pending={pending && !snapshot}
              onUniverseChange={onUniverseChange}
              onColorMetricChange={setColorMetric}
              universeDisabled={snapshotLocked}
            />
          }
        />

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <HeatmapLegend />
          {snapshot &&
          (snapshot.moneyInflowSectors.length > 0 ||
            snapshot.moneyOutflowSectors.length > 0) ? (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
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

        {showError ? (
          <EmptyStatePanel
            message={error ?? "Unable to load sector heatmap"}
            source="Market Heatmap"
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
        ) : visibleSectors.length === 0 ? (
          <EmptyStatePanel
            message="Sector heatmap will appear once market quotes are available."
            source="Market Heatmap"
            icon={LayoutGrid}
          />
        ) : (
          <div
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
            role="list"
            aria-label="Sector heatmap"
          >
            {visibleSectors.map((tile) => (
              <div key={tile.name} role="listitem" className="min-w-0">
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

        <CardFooter className="!mt-2 !py-2 !pt-2 text-micro">
          <span>
            {hideTimestamps
              ? `Source · ${snapshot?.dataSource ?? "Market Heatmap"}`
              : `Updated · ${formatTs(snapshot?.lastUpdated)} · ${
                  snapshot?.dataSource ?? "Market Heatmap"
                }`}
          </span>
          <span>Click sector to drill down</span>
        </CardFooter>
      </Card>

      {selectedTile ? (
        <div className="mt-3">
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
