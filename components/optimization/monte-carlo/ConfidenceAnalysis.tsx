"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { ConfidenceInterval } from "@/lib/optimization";

export interface ConfidenceAnalysisProps {
  intervals: ConfidenceInterval[];
}

export const ConfidenceAnalysis = memo(function ConfidenceAnalysis({
  intervals,
}: ConfidenceAnalysisProps) {
  if (intervals.length === 0) {
    return (
      <Card hover={false} padding="sm" data-testid="confidence-analysis">
        <CardHeader title="Confidence Analysis" subtitle="50%–99% intervals" />
        <p className="mt-2 text-xs text-text-muted">No confidence intervals yet.</p>
      </Card>
    );
  }

  return (
    <Card hover={false} padding="sm" data-testid="confidence-analysis">
      <CardHeader
        title="Confidence Analysis"
        subtitle="Return, drawdown, profit factor, Sharpe, and probability of loss"
      />
      <div className="mt-3 overflow-x-auto">
        <table
          className="w-full min-w-[640px] text-left text-xs"
          aria-label="Confidence intervals"
        >
          <thead>
            <tr className="border-b border-surface-border-subtle text-[10px] uppercase tracking-wider text-text-faint">
              <th className="px-2 py-2">Level</th>
              <th className="px-2 py-2">Return</th>
              <th className="px-2 py-2">Drawdown</th>
              <th className="px-2 py-2">Profit Factor</th>
              <th className="px-2 py-2">Sharpe</th>
              <th className="px-2 py-2">P(Loss)</th>
            </tr>
          </thead>
          <tbody>
            {intervals.map((row) => (
              <tr
                key={row.level}
                className="border-b border-surface-border-subtle/60"
              >
                <td className="px-2 py-2 font-semibold text-text-primary">
                  {row.level}%
                </td>
                <td className="px-2 py-2 text-text-secondary">
                  {row.returnLow}% – {row.returnHigh}%
                </td>
                <td className="px-2 py-2 text-text-secondary">
                  {row.drawdownLow}% – {row.drawdownHigh}%
                </td>
                <td className="px-2 py-2 text-text-secondary">
                  {row.profitFactorLow} – {row.profitFactorHigh}
                </td>
                <td className="px-2 py-2 text-text-secondary">
                  {row.sharpeLow} – {row.sharpeHigh}
                </td>
                <td className="px-2 py-2 text-text-secondary">
                  {row.probabilityOfLoss}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
