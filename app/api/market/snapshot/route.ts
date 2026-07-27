import { NextResponse } from "next/server";
import {
  assertUniformMarketSnapshotTimestamp,
  loadMarketSnapshotUncached,
} from "@/lib/market-orchestrator/marketsSnapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Canonical Markets page snapshot.
 * Clients must refresh via this route only — never per-widget market APIs.
 * Uses the shared process cache (same object Dashboard SSR consumes).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh =
    url.searchParams.get("refresh") === "1" ||
    url.searchParams.get("force") === "true";

  const snapshot = await loadMarketSnapshotUncached({ forceRefresh });
  const uniform = assertUniformMarketSnapshotTimestamp(snapshot);

  return NextResponse.json({
    ok: true,
    snapshot,
    validation: {
      uniformTimestamp: uniform,
      timestamp: snapshot.timestamp,
      contextTimestamp: snapshot.intelligence?.context.timestamp ?? null,
      regimeTimestamp: snapshot.intelligence?.regime.timestamp ?? null,
    },
  });
}
