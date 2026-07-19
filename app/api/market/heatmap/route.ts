import { NextRequest, NextResponse } from "next/server";
import {
  HEATMAP_UNIVERSE_OPTIONS,
  type HeatmapUniverseId,
} from "@/lib/market-heatmap";
import { fetchMarketHeatmap } from "@/services/researchDashboardData";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID = new Set(HEATMAP_UNIVERSE_OPTIONS.map((option) => option.id));

export async function GET(request: NextRequest) {
  const universeParam =
    request.nextUrl.searchParams.get("universe") ?? "nse";
  const universe = (
    VALID.has(universeParam as HeatmapUniverseId)
      ? universeParam
      : "nse"
  ) as HeatmapUniverseId;

  const sector = request.nextUrl.searchParams.get("sector");
  const heatmap = await fetchMarketHeatmap(universe);

  if (sector) {
    const tile =
      heatmap.sectors.find(
        (s) => s.name.toLowerCase() === sector.toLowerCase()
      ) ?? null;
    return NextResponse.json({
      ok: true,
      universe,
      options: HEATMAP_UNIVERSE_OPTIONS,
      sector: tile,
      lastUpdated: heatmap.lastUpdated,
    });
  }

  return NextResponse.json({
    ok: true,
    universe,
    options: HEATMAP_UNIVERSE_OPTIONS,
    heatmap,
  });
}
