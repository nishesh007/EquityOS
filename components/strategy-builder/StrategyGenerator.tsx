"use client";

import { memo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import {
  EXIT_RULE_OPTIONS,
  FUNDAMENTAL_FILTER_OPTIONS,
  HOLDING_PERIOD_OPTIONS,
  MOMENTUM_FILTER_OPTIONS,
  POSITION_SIZING_OPTIONS,
  REGIME_OPTIONS,
  RISK_RULE_OPTIONS,
  TECHNICAL_INDICATOR_OPTIONS,
  UNIVERSE_OPTIONS,
  VALUATION_FILTER_OPTIONS,
  VOLUME_FILTER_OPTIONS,
  toggleListItem,
  type StrategyBuildingBlocks,
} from "@/lib/strategy-builder";
import { cn } from "@/lib/utils";

function ChipGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-text-faint">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={legend}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                on
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-surface-border-subtle text-text-secondary hover:bg-surface-raised"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export const StrategyGenerator = memo(function StrategyGenerator({
  blocks,
  onChange,
  onGenerate,
  disabled,
}: {
  blocks: StrategyBuildingBlocks;
  onChange: (next: StrategyBuildingBlocks) => void;
  onGenerate: () => void;
  disabled?: boolean;
}) {
  const patchList = useCallback(
    (key: keyof StrategyBuildingBlocks, value: string) => {
      const current = blocks[key];
      if (!Array.isArray(current)) return;
      onChange({ ...blocks, [key]: toggleListItem(current, value) });
    },
    [blocks, onChange]
  );

  return (
    <Card padding="lg" data-testid="strategy-generator" accent="violet">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Strategy Generator
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Compose building blocks or start from a template, then generate complete rules.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onGenerate}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Generate Strategies
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChipGroup
          legend="Technical Indicators"
          options={TECHNICAL_INDICATOR_OPTIONS}
          selected={blocks.technicalIndicators}
          onToggle={(v) => patchList("technicalIndicators", v)}
        />
        <ChipGroup
          legend="Fundamental Filters"
          options={FUNDAMENTAL_FILTER_OPTIONS}
          selected={blocks.fundamentalFilters}
          onToggle={(v) => patchList("fundamentalFilters", v)}
        />
        <ChipGroup
          legend="Valuation Filters"
          options={VALUATION_FILTER_OPTIONS}
          selected={blocks.valuationFilters}
          onToggle={(v) => patchList("valuationFilters", v)}
        />
        <ChipGroup
          legend="Volume Filters"
          options={VOLUME_FILTER_OPTIONS}
          selected={blocks.volumeFilters}
          onToggle={(v) => patchList("volumeFilters", v)}
        />
        <ChipGroup
          legend="Momentum Filters"
          options={MOMENTUM_FILTER_OPTIONS}
          selected={blocks.momentumFilters}
          onToggle={(v) => patchList("momentumFilters", v)}
        />
        <ChipGroup
          legend="Risk Rules"
          options={RISK_RULE_OPTIONS}
          selected={blocks.riskRules}
          onToggle={(v) => patchList("riskRules", v)}
        />
        <ChipGroup
          legend="Exit Rules"
          options={EXIT_RULE_OPTIONS}
          selected={blocks.exitRules}
          onToggle={(v) => patchList("exitRules", v)}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-text-faint">
          Position Sizing
          <select
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary"
            value={blocks.positionSizing}
            onChange={(e) =>
              onChange({ ...blocks, positionSizing: e.target.value })
            }
          >
            {POSITION_SIZING_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-text-faint">
          Holding Period
          <select
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary"
            value={blocks.holdingPeriod}
            onChange={(e) =>
              onChange({ ...blocks, holdingPeriod: e.target.value })
            }
          >
            {HOLDING_PERIOD_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-text-faint">
          Universe
          <select
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary"
            value={blocks.universe}
            onChange={(e) =>
              onChange({
                ...blocks,
                universe: e.target.value as StrategyBuildingBlocks["universe"],
              })
            }
          >
            {UNIVERSE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-text-faint">
          Market Regime
          <select
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary"
            value={blocks.marketRegime}
            onChange={(e) =>
              onChange({
                ...blocks,
                marketRegime: e.target
                  .value as StrategyBuildingBlocks["marketRegime"],
              })
            }
          >
            {REGIME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  );
});
