"use client";

import { EarningsWorkspacePanel } from "@/components/dashboard/earnings";
import type { HoldingWeightInput } from "@/src/core/earnings/workspace";

/** Composes R7 decision workspace — no duplicate impact logic. */
export function ExecutiveWorkspacePanel({
  holdings = [],
  totalValue,
  watchlistSymbols = [],
}: {
  holdings?: HoldingWeightInput[];
  totalValue?: number;
  watchlistSymbols?: string[];
}) {
  return (
    <div id="executive-workspace" data-testid="executive-workspace-panel">
      <EarningsWorkspacePanel
        holdings={holdings}
        totalValue={totalValue}
        watchlistSymbols={watchlistSymbols}
        compact
      />
    </div>
  );
}
