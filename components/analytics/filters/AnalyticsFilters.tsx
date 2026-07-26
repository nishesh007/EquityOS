"use client";

import {
  countActiveAnalyticsFilters,
  createEmptyAnalyticsFilters,
  type AnalyticsFilterOption,
  type AnalyticsFilterState,
} from "@/components/analytics/filters/types";
import {
  TIME_RANGE_PRESETS,
  resolveTimeRangePreset,
} from "@/lib/analytics/time-range";
import type { TimeRangePreset } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

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
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        selected
          ? "border-accent/30 bg-accent/15 text-accent"
          : "border-surface-border-subtle bg-surface-overlay/40 text-text-secondary hover:bg-surface-hover"
      )}
    >
      {label}
    </button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function toggleValue(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value?: TimeRangePreset;
  onChange: (preset: TimeRangePreset, range: ReturnType<typeof resolveTimeRangePreset>) => void;
}) {
  return (
    <FilterGroup label="Date Range">
      {TIME_RANGE_PRESETS.map((preset) => (
        <Chip
          key={preset.id}
          label={preset.label}
          selected={value === preset.id}
          onClick={() => onChange(preset.id, resolveTimeRangePreset(preset.id))}
        />
      ))}
    </FilterGroup>
  );
}

function MultiChipFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <FilterGroup label={label}>
      {options.map((option) => (
        <Chip
          key={option.id}
          label={option.label}
          selected={selected.includes(option.id)}
          onClick={() => onChange(toggleValue(selected, option.id))}
        />
      ))}
    </FilterGroup>
  );
}

export function StrategyFilter(props: {
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return <MultiChipFilter label="Strategy" {...props} />;
}

export function CompanyFilter(props: {
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return <MultiChipFilter label="Company" {...props} />;
}

export function SectorFilter(props: {
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return <MultiChipFilter label="Sector" {...props} />;
}

export function RecommendationFilter(props: {
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return <MultiChipFilter label="Recommendation" {...props} />;
}

export function StatusFilter(props: {
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return <MultiChipFilter label="Status" {...props} />;
}

export function MarketRegimeFilter(props: {
  options: readonly AnalyticsFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return <MultiChipFilter label="Market Regime" {...props} />;
}

export interface AnalyticsFilterBarProps {
  value: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  strategyOptions?: readonly AnalyticsFilterOption[];
  companyOptions?: readonly AnalyticsFilterOption[];
  sectorOptions?: readonly AnalyticsFilterOption[];
  recommendationOptions?: readonly AnalyticsFilterOption[];
  statusOptions?: readonly AnalyticsFilterOption[];
  marketRegimeOptions?: readonly AnalyticsFilterOption[];
  className?: string;
}

/**
 * Composable analytics filter bar — mount only the option sets you need.
 */
export function AnalyticsFilterBar({
  value,
  onChange,
  strategyOptions = [],
  companyOptions = [],
  sectorOptions = [],
  recommendationOptions = [],
  statusOptions = [],
  marketRegimeOptions = [],
  className,
}: AnalyticsFilterBarProps) {
  const active = countActiveAnalyticsFilters(value);

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-surface-border-subtle bg-surface-overlay/20 p-4",
        className
      )}
      data-testid="analytics-filter-bar"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary">
          Filters{active > 0 ? ` · ${active} active` : ""}
        </p>
        <button
          type="button"
          onClick={() => onChange(createEmptyAnalyticsFilters())}
          className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reset
        </button>
      </div>

      <DateRangeFilter
        value={value.timeRangePreset}
        onChange={(preset, range) =>
          onChange({
            ...value,
            timeRangePreset: preset,
            dateRange: range,
          })
        }
      />

      {strategyOptions.length > 0 ? (
        <StrategyFilter
          options={strategyOptions}
          selected={value.strategies}
          onChange={(strategies) => onChange({ ...value, strategies })}
        />
      ) : null}
      {companyOptions.length > 0 ? (
        <CompanyFilter
          options={companyOptions}
          selected={value.companies}
          onChange={(companies) => onChange({ ...value, companies })}
        />
      ) : null}
      {sectorOptions.length > 0 ? (
        <SectorFilter
          options={sectorOptions}
          selected={value.sectors}
          onChange={(sectors) => onChange({ ...value, sectors })}
        />
      ) : null}
      {recommendationOptions.length > 0 ? (
        <RecommendationFilter
          options={recommendationOptions}
          selected={value.recommendations}
          onChange={(recommendations) =>
            onChange({ ...value, recommendations })
          }
        />
      ) : null}
      {statusOptions.length > 0 ? (
        <StatusFilter
          options={statusOptions}
          selected={value.statuses}
          onChange={(statuses) => onChange({ ...value, statuses })}
        />
      ) : null}
      {marketRegimeOptions.length > 0 ? (
        <MarketRegimeFilter
          options={marketRegimeOptions}
          selected={value.marketRegimes}
          onChange={(marketRegimes) => onChange({ ...value, marketRegimes })}
        />
      ) : null}
    </div>
  );
}
