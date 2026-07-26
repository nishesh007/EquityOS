"use client";

import { memo, useCallback } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OptimizationStrategy } from "@/lib/optimization";

export interface StrategySelectorProps {
  strategies: readonly OptimizationStrategy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const StrategySelector = memo(function StrategySelector({
  strategies,
  selectedId,
  onSelect,
}: StrategySelectorProps) {
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
    },
    [onSelect]
  );

  return (
    <Card hover={false} padding="sm" accent="violet" data-testid="strategy-selector">
      <CardHeader
        title="Strategy Selector"
        subtitle="Choose the strategy universe for this optimization experiment"
      />
      <div
        role="listbox"
        aria-label="Optimization strategies"
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
      >
        {strategies.map((strategy) => {
          const selected = strategy.id === selectedId;
          return (
            <button
              key={strategy.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`${strategy.name}, ${strategy.category}, ${strategy.supportedMarket}`}
              onClick={() => handleSelect(strategy.id)}
              className={cn(
                "relative rounded-lg border px-3 py-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                selected
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border-subtle bg-surface-overlay/40 hover:border-surface-border hover:bg-surface-hover"
              )}
            >
              {selected ? (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent"
                >
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
              <p className="pr-6 text-sm font-semibold text-text-primary">
                {strategy.name}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
                {strategy.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded border border-surface-border-subtle bg-surface-overlay/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                  {strategy.category}
                </span>
                <span className="rounded border border-surface-border-subtle bg-surface-overlay/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-faint">
                  {strategy.supportedMarket}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
});
