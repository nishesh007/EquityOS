"use client";

import { useEffect, useState } from "react";
import type { MarketSessionEnvelope } from "@/lib/market/market-state-types";
import { MARKET_REBUILD_MAX_MS } from "@/lib/market/market-state-types";

/**
 * Banner shown while market modules rebuild for today's session.
 * Auto-clears after MARKET_REBUILD_MAX_MS so UI never sticks on "Updating…".
 */
export function MarketSessionBanner({
  session,
}: {
  session: MarketSessionEnvelope;
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    if (session.phase !== "updating") return;
    console.info("[MarketState] Refresh started");
    const id = window.setTimeout(() => {
      setTimedOut(true);
      console.info("[MarketState] Refresh timed out");
      console.info("[MarketState] Loading state cleared");
    }, MARKET_REBUILD_MAX_MS);
    return () => window.clearTimeout(id);
  }, [session.phase, session.sessionId, session.freshness?.generatedAt]);

  useEffect(() => {
    if (session.phase === "ready") {
      console.info("[MarketState] Refresh completed");
      console.info("[MarketState] Loading state cleared");
    }
  }, [session.phase]);

  const showUpdating = session.phase === "updating" && !timedOut;

  if (showUpdating) {
    return (
      <p
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
        role="status"
      >
        Updating today&apos;s market…
      </p>
    );
  }

  return (
    <p
      className="text-xs text-text-muted"
      role="status"
      data-session-id={session.sessionId}
    >
      Current session · {session.sessionId} (NSE)
    </p>
  );
}
