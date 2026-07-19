"use client";

import { cn } from "@/lib/utils";
import {
  CHART_LAYOUTS,
  WORKSPACE_TIMEFRAMES,
  isIntradayTimeframe,
  type ChartLayoutId,
  type WorkspaceTimeframe,
} from "./types";

interface ChartTimeframeBarProps {
  timeframe: WorkspaceTimeframe;
  layout: ChartLayoutId;
  onTimeframeChange: (tf: WorkspaceTimeframe) => void;
  onLayoutChange: (layout: ChartLayoutId) => void;
}

export function ChartTimeframeBar({
  timeframe,
  layout,
  onTimeframeChange,
  onLayoutChange,
}: ChartTimeframeBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        role="tablist"
        aria-label="Chart timeframes"
        className="flex flex-wrap gap-1 rounded-lg border border-surface-border-subtle bg-surface-overlay/60 p-1"
      >
        {WORKSPACE_TIMEFRAMES.map((tf) => {
          const active = timeframe === tf;
          return (
            <button
              key={tf}
              type="button"
              role="tab"
              aria-selected={active}
              title={
                isIntradayTimeframe(tf)
                  ? "Intraday feed reserved — daily candles shown"
                  : undefined
              }
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              {tf}
            </button>
          );
        })}
      </div>

      <div
        role="group"
        aria-label="Chart layout"
        className="flex flex-wrap gap-1 rounded-lg border border-surface-border-subtle bg-surface-overlay/60 p-1"
      >
        {CHART_LAYOUTS.map((item) => {
          const active = layout === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onLayoutChange(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
