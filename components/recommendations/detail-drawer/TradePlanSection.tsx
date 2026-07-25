"use client";

import type { TradePlanView } from "@/lib/recommendations/executive-decision-presenter";
import { DrawerEmptyState } from "./DrawerStates";
import { formatInr, MetricChip, SectionShell } from "./SectionChrome";

export function TradePlanSection({ view }: { view: TradePlanView }) {
  const entryLabel =
    view.entryLow != null &&
    view.entryHigh != null &&
    view.entryLow > 0 &&
    view.entryHigh > 0 &&
    view.entryLow !== view.entryHigh
      ? `${formatInr(view.entryLow)} – ${formatInr(view.entryHigh)}`
      : formatInr(view.entry);

  return (
    <SectionShell
      index={3}
      title="Trade Plan"
      description="Actionable levels from the published recommendation package."
    >
      {!view.available ? (
        <DrawerEmptyState
          title="No trade plan"
          message="Trade levels are unavailable for this entry point. Open from a full recommendation row for a complete plan."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <MetricChip
              label="Recommended Entry"
              value={entryLabel}
              emphasize="entry"
            />
            <MetricChip
              label="Stop Loss"
              value={formatInr(view.stopLoss)}
              emphasize="stop"
            />
            <MetricChip label="Target 1" value={formatInr(view.target1)} />
            <MetricChip label="Target 2" value={formatInr(view.target2)} />
            <MetricChip label="Target 3" value={formatInr(view.target3)} />
            <MetricChip
              label="Risk / Reward"
              value={
                view.riskReward != null
                  ? `${view.riskReward.toFixed(2)}x`
                  : "—"
              }
            />
            <MetricChip label="Position Size" value={view.positionSize} />
            <MetricChip label="Holding Period" value={view.holdingPeriod} />
          </div>
          <div className="mt-2 rounded-lg border border-sky-500/20 bg-sky-500/8 px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-sky-300/90">
              Recommendation Expiry
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              {view.expiryLabel}
            </p>
          </div>
        </>
      )}
    </SectionShell>
  );
}
