"use client";

/**
 * Sector Breadth panel — used on Markets / dedicated internals surfaces.
 * Intentionally not mounted on the home dashboard (smaller tree + chunk).
 */

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricExplain } from "@/components/dashboard/market-internals/MetricExplain";
import {
  KpiCard,
  SectorHeatBar,
} from "@/components/dashboard/market-internals/visuals";
import type { MarketBreadth as MarketBreadthType } from "@/types";
import { Layers3 } from "lucide-react";

export function SectorBreadthPanel({
  breadth,
}: {
  breadth: MarketBreadthType;
}) {
  const sectors = [...breadth.sectors].sort(
    (a, b) => (b.breadth ?? 0) - (a.breadth ?? 0)
  );
  const strongest = breadth.strongestSector ?? sectors[0]?.name ?? null;
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
