"use client";

import { TabBar } from "@/components/ui/TabBar";
import { PaperClosedTradesTable } from "@/components/paper-trading/PaperClosedTradesTable";
import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";

const STRATEGY_TABS: Array<{ id: PaperStrategy; label: string }> = [
  { id: "intraday", label: "Intraday" },
  { id: "scalping", label: "Scalping" },
  { id: "swing", label: "Swing" },
];

interface PaperLabClosedModuleProps {
  trades: readonly PaperTrade[];
  strategyTab: PaperStrategy;
  onStrategyChange: (strategy: PaperStrategy) => void;
  onSelect: (trade: PaperTrade) => void;
}

export function PaperLabClosedModule({
  trades,
  strategyTab,
  onStrategyChange,
  onSelect,
}: PaperLabClosedModuleProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Closed Trades
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary">
            Completed Paper-Trade History
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Exits from stop-loss, targets, expiry, or session close
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TabBar
            tabs={STRATEGY_TABS}
            activeTab={strategyTab}
            onTabChange={onStrategyChange}
          />
          <span className="text-[10px] tabular-nums text-text-faint">
            {trades.length} closed
          </span>
        </div>
      </div>
      <PaperClosedTradesTable trades={trades} onSelect={onSelect} />
    </div>
  );
}
