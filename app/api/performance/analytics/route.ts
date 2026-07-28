import { NextResponse } from "next/server";
import { buildPerformanceAnalytics } from "@/lib/institutional-intelligence";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/analytics
 * Institutional performance statistics from closed paper outcomes.
 */
export async function GET() {
  try {
    const report = buildPerformanceAnalytics();
    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build performance analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
