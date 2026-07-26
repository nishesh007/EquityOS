import { NextResponse } from "next/server";
import { syncPaperTradingLab } from "@/services/paperTrading";

export const dynamic = "force-dynamic";

/**
 * POST — run one automated paper-trading cycle:
 * mark-to-market, auto-exits, auto-entries from highest-conviction recommendations.
 */
export async function POST() {
  try {
    const dashboard = await syncPaperTradingLab();
    return NextResponse.json(dashboard);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paper trading sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
