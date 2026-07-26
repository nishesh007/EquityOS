"use client";

import {
  createEmptyValidationFilters,
  type ValidationFilterState,
} from "@/lib/backtesting/validation";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import type { AnalyticsFilterOption } from "@/components/analytics/filters";

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        selected
          ? "border-accent/30 bg-accent/15 text-accent"
          : "border-surface-border-subtle bg-surface-overlay/40 text-text-secondary hover:bg-surface-hover"
      )}
    >
      {label}
    </button>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = `filter-group-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-2" role="group" aria-labelledby={id}>
      <p
        id={id}
        className="text-[10px] font-semibold uppercase tracking-wider text-text-faint"
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
}

export function ValidationFilterBar({
  value,
  onChange,
  strategyOptions,
  sectorOptions,
  symbolOptions,
  regimeOptions,
  universeOptions,
}: {
  value: ValidationFilterState;
  onChange: (next: ValidationFilterState) => void;
  strategyOptions: readonly AnalyticsFilterOption[];
  sectorOptions: readonly AnalyticsFilterOption[];
  symbolOptions: readonly AnalyticsFilterOption[];
  regimeOptions: readonly AnalyticsFilterOption[];
  universeOptions: readonly AnalyticsFilterOption[];
}) {
  return (
    <div
      className="space-y-4 rounded-xl border border-surface-border-subtle bg-surface-overlay/20 p-4 contrast-more:border-2"
      role="search"
      aria-label="Validation filters"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary">
          Validation Filters
        </p>
        <button
          type="button"
          onClick={() => onChange(createEmptyValidationFilters())}
          aria-label="Reset all validation filters"
          className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-[11px] text-text-secondary">
          From
          <input
            type="date"
            value={value.dateStart?.slice(0, 10) ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                dateStart: e.target.value
                  ? `${e.target.value}T00:00:00.000Z`
                  : undefined,
              })
            }
            className="ml-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[11px] text-text-secondary">
          To
          <input
            type="date"
            value={value.dateEnd?.slice(0, 10) ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                dateEnd: e.target.value
                  ? `${e.target.value}T23:59:59.999Z`
                  : undefined,
              })
            }
            className="ml-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2 py-1 text-xs"
          />
        </label>
      </div>

      <Group label="Strategy">
        {strategyOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={value.strategies.includes(opt.id)}
            onClick={() =>
              onChange({
                ...value,
                strategies: toggle(value.strategies, opt.id),
              })
            }
          />
        ))}
      </Group>
      <Group label="Sector">
        {sectorOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={value.sectors.includes(opt.id)}
            onClick={() =>
              onChange({ ...value, sectors: toggle(value.sectors, opt.id) })
            }
          />
        ))}
      </Group>
      <Group label="Symbol">
        {symbolOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={value.symbols.includes(opt.id)}
            onClick={() =>
              onChange({ ...value, symbols: toggle(value.symbols, opt.id) })
            }
          />
        ))}
      </Group>
      <Group label="Market Regime">
        {regimeOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={value.marketRegimes.includes(opt.id)}
            onClick={() =>
              onChange({
                ...value,
                marketRegimes: toggle(value.marketRegimes, opt.id),
              })
            }
          />
        ))}
      </Group>
      <Group label="Universe">
        {universeOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={value.universes.includes(opt.id)}
            onClick={() =>
              onChange({
                ...value,
                universes: toggle(value.universes, opt.id),
              })
            }
          />
        ))}
      </Group>
    </div>
  );
}
