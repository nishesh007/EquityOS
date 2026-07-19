import type { SharedRecommendation } from "@/lib/recommendations";

function price(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export function SharedRecommendationPanel({
  recommendations,
  title = "Strategy Engine Recommendations",
  emptyMessage = "No validated Strategy Engine recommendations in the latest scan.",
}: {
  recommendations: readonly SharedRecommendation[];
  title?: string;
  emptyMessage?: string;
}) {
  return (
    <section className="rounded-xl border border-surface-border-subtle bg-surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          Single pipeline · validated
        </span>
      </div>
      {recommendations.length === 0 ? (
        <p className="mt-3 text-xs text-text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border-subtle text-[10px] uppercase text-text-faint">
                <th className="pb-2">Stock</th>
                <th className="pb-2">Recommendation</th>
                <th className="pb-2">Strategies</th>
                <th className="pb-2 text-right">Entry / SL / Target</th>
                <th className="pb-2 text-right">Score</th>
                <th className="pb-2 text-right">Confidence</th>
                <th className="pb-2 text-right">Regime</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((recommendation) => (
                <tr
                  key={recommendation.id}
                  className="border-b border-surface-border-subtle/50 last:border-0"
                >
                  <td className="py-2.5">
                    <p className="font-semibold text-text-primary">
                      {recommendation.symbol}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {recommendation.company}
                    </p>
                  </td>
                  <td className="py-2.5">
                    <p className="font-semibold text-accent">
                      {recommendation.action}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {recommendation.primaryStrategy}
                    </p>
                  </td>
                  <td className="py-2.5">
                    <p>{recommendation.strategyCount} matched</p>
                    <p className="text-[10px] text-text-muted">
                      Agree {recommendation.agreementPercent}% · Conflict{" "}
                      {recommendation.conflictPercent}%
                    </p>
                  </td>
                  <td className="py-2.5 text-right font-mono text-[10px]">
                    {price(recommendation.entry)} /{" "}
                    {price(recommendation.stopLoss)} /{" "}
                    {price(recommendation.targets.at(-1) ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {recommendation.opportunityScore}
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {recommendation.confidence}%
                  </td>
                  <td className="py-2.5 text-right">
                    <p>{recommendation.marketRegime}</p>
                    <p className="text-[10px] text-text-muted">
                      {recommendation.marketContext}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function RecommendationValidationPanel({
  recommendations,
}: {
  recommendations: readonly SharedRecommendation[];
}) {
  return (
    <section className="rounded-xl border border-surface-border-subtle bg-surface-card p-4">
      <h2 className="text-sm font-semibold text-text-primary">
        Recommendation Gate Validation
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Entry, stop, target, confidence, score, agreement, context, regime and
        eligibility are validated before publication.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
        {recommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="rounded-lg border border-surface-border-subtle p-3"
          >
            <p className="text-xs font-semibold text-text-primary">
              {recommendation.symbol} ·{" "}
              {recommendation.validation.valid ? "PASS" : "FAIL"}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">
              Validation {recommendation.validation.score}% · Strategy{" "}
              {recommendation.primaryStrategy}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
