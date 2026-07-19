import { NextRequest, NextResponse } from "next/server";
import {
  BREADTH_UNIVERSE_OPTIONS,
  type BreadthUniverseId,
} from "@/lib/market-breadth";
import { fetchMarketBreadth } from "@/services/researchDashboardData";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID = new Set(
  BREADTH_UNIVERSE_OPTIONS.map((option) => option.id)
);

export async function GET(request: NextRequest) {
  const universeParam =
    request.nextUrl.searchParams.get("universe") ?? "nse";
  const universe = (
    VALID.has(universeParam as BreadthUniverseId)
      ? universeParam
      : "nse"
  ) as BreadthUniverseId;

  const breadth = await fetchMarketBreadth(universe);
  return NextResponse.json({
    ok: true,
    universe,
    options: BREADTH_UNIVERSE_OPTIONS,
    breadth,
  });
}
