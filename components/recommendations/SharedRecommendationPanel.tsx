import type { SharedRecommendation } from "@/lib/recommendations";
import { CATEGORY_LABELS } from "@/lib/opportunity-engine/types";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { Crosshair } from "lucide-react";
import Link from "next/link";

function price(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SharedRecommendationPanel({
  recommendations,
  title = "Strategy Engine Recommendations",
  emptyMessage = "No active recommendations — Strategy Engine and Opportunity Engine fallback both returned none for this surface.",
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
        <div className="mt-3">
          <EmptyStatePanel
            message={emptyMessage}
            source="Strategy Engine · Opportunity Engine fallback"
            icon={Crosshair}
            action={
              <Link
                href="/opportunities"
                className="text-[11px] font-semibold text-accent"
              >
                Open AI Opportunities →
              </Link>
            }
          />
        </div>
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
                <th className="pb-2 text-right">Risk / Reward</th>
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
                    <p className="text-[10px] text-text-faint">
                      {CATEGORY_LABELS[recommendation.category]} ·{" "}
                      {recommendation.action} signal
                    </p>
                  </td>
                  <td className="py-2.5">
                    <p>{recommendation.strategyCount} matched</p>
                    {recommendation.supportingStrategies.length > 0 ? (
                      <p className="text-[10px] text-text-muted">
                        +{recommendation.supportingStrategies.length}{" "}
                        supporting
                      </p>
                    ) : null}
                    {recommendation.strategyCount > 1 ? (
                      <p className="text-[10px] text-text-muted">
                        Agree {recommendation.agreementPercent.toFixed(1)}% ·
                        Conflict {recommendation.conflictPercent.toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-[10px] text-text-faint">
                        {recommendation.source === "OpportunityEngine"
                          ? "Screen-ranked fallback"
                          : "Single-strategy signal"}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[10px]">
                    {price(recommendation.entry)} /{" "}
                    {price(recommendation.stopLoss)} /{" "}
                    {price(recommendation.targets.at(-1) ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {recommendation.opportunityScore}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[10px]">
                    {recommendation.risk.toFixed(2)} /{" "}
                    {recommendation.reward.toFixed(2)}
                    <p className="text-text-muted">
                      R:R {recommendation.riskReward.toFixed(2)}
                    </p>
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {recommendation.confidence.toFixed(2)}%
                  </td>
                  <td className="py-2.5 text-right">
                    <p>{recommendation.marketRegime}</p>
                    <p className="text-[10px] text-text-muted">
                      {recommendation.marketContext}
                    </p>
                    <p className="text-[10px] text-text-faint">
                      {new Date(recommendation.timestamp).toLocaleString("en-IN")}
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
