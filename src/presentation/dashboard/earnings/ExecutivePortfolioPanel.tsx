"use client";

import { PortfolioEarningsPanel } from "@/components/dashboard/earnings";
import type { PortfolioEarningsRow } from "@/src/core/earnings/calendar";
import { EXECUTIVE_EARNINGS_EMPTY } from "@/lib/dashboard/executive-earnings-presentation";
import { ExecutiveEmptyState } from "@/src/presentation/dashboard/earnings/ExecutiveEmptyState";

/** Composes R1 portfolio earnings surface. */
export function ExecutivePortfolioPanel({
  rows,
}: {
  rows: PortfolioEarningsRow[];
}) {
  return (
    <div id="executive-portfolio" data-testid="executive-portfolio-panel">
      {rows.length === 0 ? (
        <ExecutiveEmptyState message={EXECUTIVE_EARNINGS_EMPTY.noPortfolio} />
      ) : (
        <PortfolioEarningsPanel rows={rows} />
      )}
    </div>
  );
}
