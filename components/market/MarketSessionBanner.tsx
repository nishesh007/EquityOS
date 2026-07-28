import type { MarketSessionEnvelope } from "@/lib/market/market-state-types";

/** Banner shown when market modules are rebuilding for today's session. */
export function MarketSessionBanner({
  session,
}: {
  session: MarketSessionEnvelope;
}) {
  if (session.phase === "updating") {
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
