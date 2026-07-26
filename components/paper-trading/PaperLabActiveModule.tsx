"use client";

import { TabBar } from "@/components/ui/TabBar";
import { PaperActiveTradesTable } from "@/components/paper-trading/PaperActiveTradesTable";
import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";

const STRATEGY_TABS: Array<{ id: PaperStrategy; label: string }> = [
  { id: "intraday", label: "Intraday" },
  { id: "scalping", label: "Scalping" },
  { id: "swing", label: "Swing" },
];

interface PaperLabActiveModuleProps {
  trades: readonly PaperTrade[];
  strategyTab: PaperStrategy;
  onStrategyChange: (strategy: PaperStrategy) => void;
  onSelect: (trade: PaperTrade) => void;
}

export function PaperLabActiveModule({
  trades,
  strategyTab,
  onStrategyChange,
  onSelect,
}: PaperLabActiveModuleProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Active Trades
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary">
            Open Automated Positions
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Independent strategy books · statistics remain separate
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TabBar
            tabs={STRATEGY_TABS}
            activeTab={strategyTab}
            onTabChange={onStrategyChange}
          />
          <span className="text-[10px] tabular-nums text-text-faint">
            {trades.length} open
          </span>
        </div>
      </div>
      <PaperActiveTradesTable trades={trades} onSelect={onSelect} />
    </div>
  );
}
