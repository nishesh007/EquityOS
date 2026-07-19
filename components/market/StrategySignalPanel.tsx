import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export function StrategySignalPanel({
  candidates,
  title = "Strategy Engine Signals",
}: {
  candidates: readonly OpportunityCandidate[];
  title?: string;
}) {
  const active = candidates
    .filter((candidate) => candidate.strategySignal)
    .slice(0, 4);

  return (
    <section className="rounded-xl border border-surface-border-subtle bg-surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Registry → Factory → Engine
        </span>
      </div>
      {active.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted">
          No pipeline-authorized strategy signals in the latest scan.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {active.map((candidate) => {
            const signal = candidate.strategySignal!;
            return (
              <li
                key={`${candidate.id}:${signal.strategyId}`}
                className="rounded-lg border border-surface-border-subtle p-3"
              >
                <p className="text-xs font-semibold text-text-primary">
                  {candidate.symbol} · {signal.signal}
                </p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {signal.strategy} · {signal.confidence}% · RR{" "}
                  {signal.riskReward.toFixed(2)}
                </p>
                <p className="mt-1 text-[10px] text-text-faint">
                  Entry {signal.entry.toFixed(2)} · SL{" "}
                  {signal.stopLoss.toFixed(2)} · Target{" "}
                  {signal.target.toFixed(2)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
