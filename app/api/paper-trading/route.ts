import { NextResponse } from "next/server";
import { fetchPaperTradingDashboard } from "@/services/paperTrading";

export const dynamic = "force-dynamic";

/** GET current Paper Trading Lab dashboard (no sync). */
export async function GET() {
  try {
    const dashboard = fetchPaperTradingDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load paper trading state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
