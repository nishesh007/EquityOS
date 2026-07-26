import { NextRequest, NextResponse } from "next/server";
import {
  formatSeedSummary,
  seedOpportunityEngineToPostgres,
} from "@/lib/opportunity-engine/seed";
import { isPostgresPersistenceEnabled } from "@/lib/opportunity-engine/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel Pro/Enterprise — full universe scan can exceed default limits. */
export const maxDuration = 300;

function authorize(request: NextRequest): boolean {
  const secret =
    process.env.EQUITYOS_SEED_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  if (!secret) {
    // Allow in non-production when DATABASE_URL is set (local seed via HTTP).
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = request.nextUrl.searchParams.get("secret") ?? "";
  return bearer === secret || query === secret;
}

/**
 * POST /api/opportunities/seed
 * One-time forced OE scan → PostgreSQL (allowed on weekends).
 * Protect with EQUITYOS_SEED_SECRET or CRON_SECRET Bearer token.
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresPersistenceEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const summary = await seedOpportunityEngineToPostgres();
    return NextResponse.json({
      success: true,
      summary,
      printed: formatSeedSummary(summary),
    });
  } catch (error) {
    console.error("[api/opportunities/seed] failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Seed failed",
      },
      { status: 500 }
    );
  }
}
