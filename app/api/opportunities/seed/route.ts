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

/** Safe auth diagnostics for 401 responses — never includes secret values. */
function authFailureDiagnostics(request: NextRequest) {
  const equityosSeedSecretExists = Boolean(
    process.env.EQUITYOS_SEED_SECRET?.trim()
  );
  const cronSecretExists = Boolean(process.env.CRON_SECRET?.trim());
  const header = request.headers.get("authorization") ?? "";
  const authorizationHeaderExists = header.length > 0;
  const bearerPrefixDetected = /^Bearer\s+/i.test(header);
  const bearer = bearerPrefixDetected
    ? header.replace(/^Bearer\s+/i, "").trim()
    : "";
  const querySecret = request.nextUrl.searchParams.get("secret") ?? "";
  const querySecretProvided = querySecret.length > 0;
  const configuredSecret =
    process.env.EQUITYOS_SEED_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  const comparisonVariable = equityosSeedSecretExists
    ? "EQUITYOS_SEED_SECRET"
    : cronSecretExists
      ? "CRON_SECRET"
      : "none";
  const comparison =
    configuredSecret.length > 0
      ? `incoming bearer/query === process.env.${comparisonVariable}`
      : 'no secret configured → authorize returns (NODE_ENV !== "production")';

  let reason: string;
  if (!configuredSecret) {
    reason =
      process.env.NODE_ENV === "production"
        ? "EQUITYOS_SEED_SECRET and CRON_SECRET are both missing/empty in this Vercel Function; production denies unauthenticated seed"
        : "secret missing but NODE_ENV is not production (would allow)";
  } else if (!authorizationHeaderExists && !querySecretProvided) {
    reason = "no Authorization header and no ?secret= query param";
  } else if (
    authorizationHeaderExists &&
    !bearerPrefixDetected &&
    !querySecretProvided
  ) {
    reason = "Authorization header present but Bearer prefix not detected";
  } else if (
    (bearerPrefixDetected && bearer !== configuredSecret) ||
    (querySecretProvided && querySecret !== configuredSecret)
  ) {
    reason = `Bearer/query token does not equal process.env.${comparisonVariable}`;
  } else {
    reason = "authorize returned false for an unclassified reason";
  }

  return {
    EQUITYOS_SEED_SECRET_exists: equityosSeedSecretExists,
    CRON_SECRET_exists: cronSecretExists,
    authorizationHeaderExists,
    bearerPrefixDetected,
    querySecretProvided,
    comparison,
    comparisonVariable,
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    reason,
  };
}

/**
 * POST /api/opportunities/seed
 * One-time forced OE scan → PostgreSQL (allowed on weekends).
 * Protect with EQUITYOS_SEED_SECRET or CRON_SECRET Bearer token.
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        authDiagnostics: authFailureDiagnostics(request),
      },
      { status: 401 }
    );
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
