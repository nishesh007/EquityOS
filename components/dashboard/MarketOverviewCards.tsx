import { Card } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatNumber } from "@/lib/utils";
import type { MarketIndex } from "@/types";

interface MarketOverviewCardsProps {
  indices: MarketIndex[];
}

export function MarketOverviewCards({ indices }: MarketOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {indices.map((index) => (
        <Card key={index.id} hover padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="data-label">{index.name}</p>
              <p className="mt-1 text-[10px] font-mono text-text-faint">
                {index.symbol}
              </p>
            </div>
            <Sparkline
              data={index.sparkline}
              positive={index.changePercent >= 0}
            />
          </div>

          <div className="mt-3">
            <p className="data-value text-xl font-semibold">
              {formatNumber(index.value)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <ChangeIndicator value={index.changePercent} size="sm" />
              <span
                className={`text-xs font-mono tabular-nums ${
                  index.change >= 0 ? "text-gain" : "text-loss"
                }`}
              >
                {index.change >= 0 ? "+" : ""}
                {formatNumber(index.change)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-4 border-t border-surface-border-subtle pt-3">
            <div>
              <p className="text-[10px] text-text-faint">H</p>
              <p className="text-xs font-mono text-text-secondary tabular-nums">
                {formatNumber(index.high)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-faint">L</p>
              <p className="text-xs font-mono text-text-secondary tabular-nums">
                {formatNumber(index.low)}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
