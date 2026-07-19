import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export function StrategyConsensusPanel({
  candidates,
  title = "Swing & Position Strategy Consensus",
}: {
  candidates: readonly OpportunityCandidate[];
  title?: string;
}) {
  const rows = candidates
    .filter((candidate) => candidate.strategyConsensus)
    .slice(0, 4);

  return (
    <section className="rounded-xl border border-surface-border-subtle bg-surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Agreement · Conflict · Frameworks
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted">
          No Swing/Position consensus available from the latest Strategy Engine
          scan.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((candidate) => {
            const consensus = candidate.strategyConsensus!;
            return (
              <li
                key={candidate.id}
                className="rounded-lg border border-surface-border-subtle p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    {candidate.symbol} · {consensus.primaryStrategy}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Agree {consensus.agreementPercent}% · Conflict{" "}
                    {consensus.conflictPercent}% · Combined{" "}
                    {consensus.combinedScore}
                  </p>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {consensus.combinedVerdict}
                </p>
                <div className="mt-2 grid gap-1 text-[10px] text-text-faint md:grid-cols-2">
                  <p>
                    Supporting:{" "}
                    {consensus.supportingStrategies.join(", ") || "—"}
                  </p>
                  <p>
                    Opposing: {consensus.opposingStrategies.join(", ") || "—"}
                  </p>
                  <p>
                    Technical:{" "}
                    {consensus.technicalFramework.join(", ") || "—"}
                  </p>
                  <p>
                    Fundamental:{" "}
                    {consensus.fundamentalFramework.join(", ") || "—"}
                  </p>
                  <p>
                    Valuation:{" "}
                    {consensus.valuationFramework.join(", ") || "—"}
                  </p>
                  <p>
                    Growth: {consensus.growthFramework.join(", ") || "—"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
