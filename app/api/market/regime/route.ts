import { NextRequest, NextResponse } from "next/server";
import { getMarketRegimeView } from "@/services/marketIntelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/market/regime
 * Production Market Regime from Sprint 11B.2 engines (shared cache).
 */
export async function GET(request: NextRequest) {
  const forceRefresh =
    request.nextUrl.searchParams.get("refresh") === "1" ||
    request.nextUrl.searchParams.get("force") === "true";

  try {
    const regime = await getMarketRegimeView({ forceRefresh });
    return NextResponse.json({
      regime,
      confidence: regime.confidence,
      components: regime.components,
      timestamp: regime.timestamp,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market regime unavailable";
    return NextResponse.json(
      {
        error: message,
        regime: null,
        confidence: 0,
        components: null,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
