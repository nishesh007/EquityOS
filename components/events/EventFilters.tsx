"use client";

import {
  EVENT_IMPORTANCE_LABELS,
  EVENT_TYPE_DEFINITIONS,
  INTELLIGENCE_TYPE_CHIPS,
  MACRO_REGION_OPTIONS,
  MACRO_THEME_OPTIONS,
  MARKET_CAP_OPTIONS,
  QUARTER_OPTIONS,
  QUICK_RANGE_OPTIONS,
} from "@/constants/eventTypes";
import { getEventTypeColors } from "@/constants/eventColors";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type {
  EventExchange,
  EventFilterState,
  EventImportance,
  EventQuickRange,
  EventType,
  MarketCapBucket,
} from "@/types/event";
import type { MacroRegion, MacroTheme } from "@/types/macro";
import { ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { memo, useMemo, useState } from "react";

interface EventFiltersProps {
  filters: EventFilterState;
  onChange: (patch: Partial<EventFilterState>) => void;
  onReset: () => void;
  sectors: string[];
  industries: string[];
  exchanges: string[];
  open: boolean;
  onClose?: () => void;
  className?: string;
}

function FilterGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-surface-border-subtle/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-surface-hover/30",
          FOCUS_RING_CLASS
        )}
      >
        <span className="text-[12px] font-semibold tracking-tight text-text-secondary">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-muted transition-transform duration-150",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-surface-border-subtle/50 px-3 pb-3 pt-2.5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
      {children}
    </p>
  );
}

function Chip({
  label,
  selected,
  onClick,
  className,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-7 rounded-md border px-2 text-[11px] font-medium transition-[border-color,background-color,color] duration-150",
        selected
          ? "border-accent/30 bg-accent/15 text-accent"
          : "border-surface-border-subtle bg-surface-overlay/35 text-text-muted hover:border-surface-border hover:bg-surface-hover hover:text-text-secondary",
        FOCUS_RING_CLASS,
        className
      )}
    >
      {label}
    </button>
  );
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

const inputClass = cn(
  "h-8 w-full rounded-md border border-surface-border-subtle bg-surface-overlay/45 px-2 text-xs text-text-primary placeholder:text-text-muted",
  "transition-[border-color] duration-150 hover:border-surface-border",
  FOCUS_RING_CLASS
);

export const EventFilters = memo(function EventFilters({
  filters,
  onChange,
  onReset,
  sectors,
  industries,
  exchanges,
  open,
  onClose,
  className,
}: EventFiltersProps) {
  const filteredTypes = useMemo(() => {
    const q = filters.filterSearch.trim().toLowerCase();
    if (!q) return EVENT_TYPE_DEFINITIONS;
    return EVENT_TYPE_DEFINITIONS.filter(
      (def) =>
        def.label.toLowerCase().includes(q) ||
        def.id.toLowerCase().includes(q) ||
        def.category.toLowerCase().includes(q)
    );
  }, [filters.filterSearch]);

  const filteredSectors = useMemo(() => {
    const q = filters.filterSearch.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter((s) => s.toLowerCase().includes(q));
  }, [filters.filterSearch, sectors]);

  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-raised/80 shadow-card lg:w-[260px] lg:shrink-0",
        className
      )}
      aria-label="Event filters"
      data-testid="event-filters"
    >
      <div className="flex items-center justify-between gap-2 border-b border-surface-border-subtle px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-text-primary">Filters</p>
          <p className="text-[10px] text-text-muted">Refine the calendar</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset filters"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary",
              FOCUS_RING_CLASS
            )}
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Reset
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className={cn(
                "rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary lg:hidden",
                FOCUS_RING_CLASS
              )}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-surface-border-subtle px-3 py-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={filters.filterSearch}
            onChange={(event) => onChange({ filterSearch: event.target.value })}
            placeholder="Search filters…"
            aria-label="Search inside filters"
            className={cn(inputClass, "pl-8")}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <FilterGroup title="General" defaultOpen>
          <div>
            <FieldLabel>Date Range</FieldLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="space-y-1">
                <span className="sr-only">From</span>
                <input
                  type="date"
                  value={filters.dateRange.from ?? ""}
                  onChange={(event) =>
                    onChange({
                      dateRange: {
                        ...filters.dateRange,
                        from: event.target.value || null,
                      },
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="sr-only">To</span>
                <input
                  type="date"
                  value={filters.dateRange.to ?? ""}
                  onChange={(event) =>
                    onChange({
                      dateRange: {
                        ...filters.dateRange,
                        to: event.target.value || null,
                      },
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </div>
          <div>
            <FieldLabel>Quick Ranges</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={filters.quickRanges.includes(option.id)}
                  onClick={() =>
                    onChange({
                      quickRanges: toggleValue<EventQuickRange>(
                        filters.quickRanges,
                        option.id
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Importance</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EVENT_IMPORTANCE_LABELS) as EventImportance[]).map(
                (key) => (
                  <Chip
                    key={key}
                    label={EVENT_IMPORTANCE_LABELS[key]}
                    selected={filters.importance.includes(key)}
                    onClick={() =>
                      onChange({
                        importance: toggleValue<EventImportance>(
                          filters.importance,
                          key
                        ),
                      })
                    }
                  />
                )
              )}
            </div>
          </div>
        </FilterGroup>

        <FilterGroup title="Event Type" defaultOpen>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {filteredTypes.map((def) => {
              const colors = getEventTypeColors(def.id);
              const selected = filters.eventTypes.includes(def.id);
              return (
                <Chip
                  key={def.id}
                  label={def.shortLabel}
                  selected={selected}
                  onClick={() =>
                    onChange({
                      eventTypes: toggleValue<EventType>(
                        filters.eventTypes,
                        def.id
                      ),
                    })
                  }
                  className={selected ? colors.chip : undefined}
                />
              );
            })}
          </div>
        </FilterGroup>

        <FilterGroup title="Market">
          <div>
            <FieldLabel>Market Cap</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {MARKET_CAP_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={filters.marketCaps.includes(option.id)}
                  onClick={() =>
                    onChange({
                      marketCaps: toggleValue<MarketCapBucket>(
                        filters.marketCaps,
                        option.id
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Exchange</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {exchanges.map((exchange) => (
                <Chip
                  key={exchange}
                  label={exchange}
                  selected={filters.exchanges.includes(
                    exchange as EventExchange
                  )}
                  onClick={() =>
                    onChange({
                      exchanges: toggleValue(
                        filters.exchanges,
                        exchange as EventExchange
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
        </FilterGroup>

        <FilterGroup title="Company">
          <label className="block space-y-1">
            <FieldLabel>Company</FieldLabel>
            <input
              type="text"
              value={filters.company}
              onChange={(event) => onChange({ company: event.target.value })}
              placeholder="Company name"
              aria-label="Filter by company"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <FieldLabel>Ticker</FieldLabel>
            <input
              type="text"
              value={filters.ticker}
              onChange={(event) => onChange({ ticker: event.target.value })}
              placeholder="e.g. TCS"
              aria-label="Filter by ticker"
              className={cn(inputClass, "font-mono uppercase")}
            />
          </label>
        </FilterGroup>

        <FilterGroup title="Macro" defaultOpen>
          <div>
            <FieldLabel>Theme</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {MACRO_THEME_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={filters.macroThemes.includes(option.id)}
                  onClick={() =>
                    onChange({
                      macroThemes: toggleValue<MacroTheme>(
                        filters.macroThemes,
                        option.id
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Region</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {MACRO_REGION_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={filters.macroRegions.includes(option.id)}
                  onClick={() =>
                    onChange({
                      macroRegions: toggleValue<MacroRegion>(
                        filters.macroRegions,
                        option.id
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
        </FilterGroup>

        <FilterGroup title="Advanced">
          <div>
            <FieldLabel>Quarter</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {QUARTER_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={filters.quarters.includes(option.id)}
                  onClick={() =>
                    onChange({
                      quarters: toggleValue(filters.quarters, option.id),
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Action Shortcuts</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {INTELLIGENCE_TYPE_CHIPS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={filters.eventTypes.includes(option.id)}
                  onClick={() =>
                    onChange({
                      eventTypes: toggleValue<EventType>(
                        filters.eventTypes,
                        option.id
                      ),
                    })
                  }
                />
              ))}
              <Chip
                label="High Dividend"
                selected={filters.highDividendOnly}
                onClick={() =>
                  onChange({ highDividendOnly: !filters.highDividendOnly })
                }
              />
            </div>
          </div>
          <div>
            <FieldLabel>Sector</FieldLabel>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {filteredSectors.map((sector) => (
                <Chip
                  key={sector}
                  label={sector}
                  selected={filters.sectors.includes(sector)}
                  onClick={() =>
                    onChange({
                      sectors: toggleValue(filters.sectors, sector),
                    })
                  }
                />
              ))}
              {filteredSectors.length === 0 ? (
                <p className="text-[11px] text-text-muted">No sectors match</p>
              ) : null}
            </div>
          </div>
          <div>
            <FieldLabel>Industry</FieldLabel>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {industries.map((industry) => (
                <Chip
                  key={industry}
                  label={industry}
                  selected={filters.industries.includes(industry)}
                  onClick={() =>
                    onChange({
                      industries: toggleValue(filters.industries, industry),
                    })
                  }
                />
              ))}
            </div>
          </div>
        </FilterGroup>
      </div>
    </aside>
  );
});
