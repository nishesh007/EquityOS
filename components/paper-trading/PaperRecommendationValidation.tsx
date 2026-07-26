"use client";

import { cn } from "@/lib/utils";
import type { RecommendationValidationStats } from "@/lib/paper-trading/analytics-types";
import { formatPercent } from "@/lib/paper-trading/format";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";

interface PaperRecommendationValidationProps {
  stats: RecommendationValidationStats;
}

export function PaperRecommendationValidation({
  stats,
}: PaperRecommendationValidationProps) {
  const kpis = [
    {
      label: "Recommendations Generated",
      value: String(stats.recommendationsGenerated),
    },
    {
      label: "Recommendations Executed",
      value: String(stats.recommendationsExecuted),
    },
    {
      label: "Recommendations Expired",
      value: String(stats.recommendationsExpired),
    },
    {
      label: "Recommendations Cancelled",
      value: String(stats.recommendationsCancelled),
    },
    {
      label: "Execution Success %",
      value: `${stats.executionSuccessPercent.toFixed(1)}%`,
    },
    {
      label: "Average Conviction",
      value: stats.averageConviction.toFixed(1),
    },
    {
      label: "Average Return by Conviction",
      value: formatPercent(stats.averageReturnByConviction),
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Section 6
        </p>
        <h2 className="mt-0.5 text-sm font-semibold text-text-primary">
          Recommendation Validation
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Measures recommendation quality from paper-trade outcomes · read-only
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
          >
            <dt className="text-[10px] text-text-muted">{row.label}</dt>
            <dd className="mt-0.5 font-mono text-xs font-medium text-text-primary tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Success by Conviction Band
        </p>
        <div className={cn(TABLE_CLASSES.container, "overflow-x-auto")}>
          <table className={TABLE_CLASSES.table}>
            <caption className="sr-only">Conviction band validation</caption>
            <thead>
              <tr>
                <th>Band</th>
                <th className="text-right">Trades</th>
                <th className="text-right">Win Rate</th>
                <th className="text-right">Average Return</th>
              </tr>
            </thead>
            <tbody>
              {stats.convictionBands.map((band) => (
                <tr key={band.band}>
                  <td className="font-medium text-text-primary">{band.label}</td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {band.trades}
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {band.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right",
                      band.averageReturn >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(band.averageReturn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
