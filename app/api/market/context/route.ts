import { NextRequest, NextResponse } from "next/server";
import { getMarketContextView } from "@/services/marketIntelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/market/context
 * Production Market Context from Sprint 11B.1 engines (shared cache).
 */
export async function GET(request: NextRequest) {
  const forceRefresh =
    request.nextUrl.searchParams.get("refresh") === "1" ||
    request.nextUrl.searchParams.get("force") === "true";

  try {
    const context = await getMarketContextView({ forceRefresh });
    return NextResponse.json({
      context,
      confidence: context.contextConfidence,
      components: context.components,
      timestamp: context.timestamp,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Market context unavailable";
    return NextResponse.json(
      {
        error: message,
        context: null,
        confidence: 0,
        components: null,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
