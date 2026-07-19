"use client";

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export function WatchlistStrategyMatches({
  matches,
}: {
  matches: ReadonlyMap<string, OpportunityCandidate>;
}) {
  if (matches.size === 0) {
    return (
      <p className="text-[10px] text-text-faint">No strategy matches yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {[...matches.entries()].slice(0, 8).map(([symbol, candidate]) => {
        const count = candidate.strategySignals?.length ?? 0;
        return (
          <div
            key={symbol}
            className="flex items-center justify-between gap-2 rounded border border-surface-border-subtle px-2 py-1.5"
          >
            <div>
              <p className="text-xs font-semibold text-text-primary">{symbol}</p>
              <p className="text-[10px] text-text-muted">
                {candidate.strategyName ?? "—"} · {count} matched
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-accent">
                Opp {Math.round(candidate.opportunityScore ?? 0)}
              </p>
              <p className="text-[10px] text-text-faint">
                Conf {Math.round(candidate.confidencePercent)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
