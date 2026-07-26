"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { BuiltStrategy } from "@/lib/strategy-builder";
import { Star } from "lucide-react";

export const StrategyCard = memo(function StrategyCard({
  strategy,
  selected,
  compared,
  onSelect,
  onToggleCompare,
  onFavorite,
  compact = false,
}: {
  strategy: BuiltStrategy;
  selected?: boolean;
  compared?: boolean;
  onSelect?: () => void;
  onToggleCompare?: () => void;
  onFavorite?: () => void;
  compact?: boolean;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Strategy ${strategy.name}, grade ${strategy.scores.grade}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected
          ? "border-accent bg-accent/10"
          : "border-surface-border-subtle bg-surface-overlay/40 hover:border-surface-border"
      )}
      data-testid={`strategy-card-${strategy.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {strategy.name}
          </h3>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
              {strategy.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="rounded-md bg-surface-raised px-2 py-0.5 text-xs font-semibold text-accent"
            aria-label={`Grade ${strategy.scores.grade}`}
          >
            {strategy.scores.grade}
          </span>
          {onFavorite && (
            <button
              type="button"
              aria-label={strategy.favorite ? "Remove favorite" : "Favorite"}
              className="rounded p-1 text-text-secondary hover:bg-surface-raised hover:text-accent"
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
            >
              <Star
                className={cn("h-4 w-4", strategy.favorite && "fill-accent text-accent")}
              />
            </button>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-text-faint">Score</dt>
          <dd className="font-medium text-text-primary">{strategy.scores.overall}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Return</dt>
          <dd className="font-medium text-text-primary">
            {strategy.performance.historicalReturn}%
          </dd>
        </div>
        <div>
          <dt className="text-text-faint">Sharpe</dt>
          <dd className="font-medium text-text-primary">
            {strategy.performance.sharpe}
          </dd>
        </div>
      </dl>
      {onToggleCompare && (
        <button
          type="button"
          className={cn(
            "mt-3 w-full rounded-lg border px-2 py-1.5 text-xs font-medium",
            compared
              ? "border-accent bg-accent/15 text-accent"
              : "border-surface-border-subtle text-text-secondary hover:bg-surface-raised"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare();
          }}
        >
          {compared ? "In comparison" : "Add to comparison"}
        </button>
      )}
    </article>
  );
});
