import type { SharedRecommendation } from "@/lib/recommendations";
import { CATEGORY_LABELS } from "@/lib/opportunity-engine/types";
import { Badge } from "@/components/ui/Badge";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import {
  Crosshair,
  Eye,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

function price(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ACTION_STYLES: Record<
  SharedRecommendation["action"],
  { dot: string; text: string; icon: React.ReactNode }
> = {
  BUY: {
    dot: "bg-gain",
    text: "text-gain",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  SELL: {
    dot: "bg-loss",
    text: "text-loss",
    icon: <TrendingDown className="h-3 w-3" />,
  },
  WATCHLIST: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    icon: <Eye className="h-3 w-3" />,
  },
};

function regimeVariant(
  regime: string
): "gain" | "loss" | "neutral" | "accent" {
  if (regime.includes("Bull")) return "gain";
  if (regime.includes("Bear")) return "loss";
  if (regime === "Unknown") return "neutral";
  return "accent";
}

function ConfidenceMeter({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-border"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div
          className={`h-full rounded-full ${
            clamped >= 70 ? "bg-gain" : clamped >= 50 ? "bg-amber-400" : "bg-loss"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="font-mono tabular-nums">{value.toFixed(2)}%</span>
    </div>
  );
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
    <section className="relative overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-card p-5 shadow-card transition-shadow duration-200 hover:shadow-lg">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-sky-500/70"
      />
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Crosshair className="h-4 w-4 text-sky-400" aria-hidden />
          {title}
        </h2>
        <Badge size="sm" variant="accent">
          AI Verified
        </Badge>
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
        <div className="mt-3 max-h-[560px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface-card">
              <tr className="border-b border-surface-border-subtle text-[10px] uppercase tracking-wider text-text-faint">
                <th className="pb-2 pt-1">Stock</th>
                <th className="pb-2 pt-1">Recommendation</th>
                <th className="pb-2 pt-1">Strategies</th>
                <th className="pb-2 pt-1 text-right">Entry / SL / Target</th>
                <th className="pb-2 pt-1 text-right">Score</th>
                <th className="pb-2 pt-1 text-right">Risk / Reward</th>
                <th className="pb-2 pt-1 text-right">Confidence</th>
                <th className="pb-2 pt-1 text-right">Regime</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((recommendation) => {
                const action = ACTION_STYLES[recommendation.action];
                return (
                  <tr
                    key={recommendation.id}
                    className="border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/40"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 rounded-full ${action.dot}`}
                        />
                        <div>
                          <p className="font-semibold text-text-primary">
                            {recommendation.symbol}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {recommendation.company}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <p
                        className={`flex items-center gap-1 font-semibold ${action.text}`}
                      >
                        {action.icon}
                        {recommendation.action}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted">
                        <Target className="h-3 w-3 shrink-0 text-text-faint" />
                        {recommendation.primaryStrategy}
                      </p>
                      <p className="text-[10px] text-text-faint">
                        {CATEGORY_LABELS[recommendation.category]} ·{" "}
                        {recommendation.action} signal
                      </p>
                    </td>
                    <td className="py-3">
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
                      <div className="mt-1">
                        <Badge size="sm" variant="neutral">
                          Conviction {recommendation.conviction}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono text-[10px] tabular-nums">
                      {price(recommendation.entry)} /{" "}
                      {price(recommendation.stopLoss)} /{" "}
                      {price(recommendation.targets.at(-1) ?? 0)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {recommendation.opportunityScore}
                    </td>
                    <td className="py-3 text-right font-mono text-[10px] tabular-nums">
                      {recommendation.risk.toFixed(2)} /{" "}
                      {recommendation.reward.toFixed(2)}
                      <p className="text-text-muted">
                        R:R {recommendation.riskReward.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-3 text-right">
                      <ConfidenceMeter value={recommendation.confidence} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Badge
                          size="sm"
                          variant={regimeVariant(recommendation.marketRegime)}
                        >
                          {recommendation.marketRegime}
                        </Badge>
                        <Badge size="sm" variant="neutral">
                          {recommendation.marketContext}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-text-faint">
                        {new Date(recommendation.timestamp).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </td>
                  </tr>
                );
              })}
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
    <section className="relative overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-card p-5 shadow-card">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-indigo-500/70"
      />
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
