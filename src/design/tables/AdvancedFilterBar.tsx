"use client";

/**
 * Advanced table filters — text, numeric range, multi-select.
 * Presentation only; operates on already-supplied row values.
 */

import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  NUMERIC_CELL_KINDS,
  columnValue,
  type RangeFilter,
  type TableColumn,
} from "./tableEngine";

interface AdvancedFilterBarProps<Row> {
  columns: readonly TableColumn<Row>[];
  filters: Record<string, string>;
  rangeFilters: Record<string, RangeFilter>;
  multiFilters: Record<string, readonly string[]>;
  rows: readonly Row[];
  onFiltersChange: (filters: Record<string, string>) => void;
  onRangeFiltersChange: (rangeFilters: Record<string, RangeFilter>) => void;
  onMultiFiltersChange: (
    multiFilters: Record<string, readonly string[]>
  ) => void;
}

export function AdvancedFilterBar<Row>({
  columns,
  filters,
  rangeFilters,
  multiFilters,
  rows,
  onFiltersChange,
  onRangeFiltersChange,
  onMultiFiltersChange,
}: AdvancedFilterBarProps<Row>) {
  const [open, setOpen] = useState(false);
  const activeCount =
    Object.values(filters).filter((v) => v.trim()).length +
    Object.values(rangeFilters).filter((r) => r.min != null || r.max != null)
      .length +
    Object.values(multiFilters).filter((v) => v.length > 0).length;

  const textColumns = columns.filter(
    (c) => !NUMERIC_CELL_KINDS.includes(c.kind)
  );
  const numericColumns = columns.filter((c) =>
    NUMERIC_CELL_KINDS.includes(c.kind)
  );

  const multiOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const column of textColumns.slice(0, 6)) {
      const values = new Set<string>();
      for (const row of rows) {
        const raw = columnValue(column, row);
        if (raw == null || raw === "") continue;
        values.add(String(raw));
      }
      map[column.id] = [...values].sort().slice(0, 24);
    }
    return map;
  }, [rows, textColumns]);

  const clearAll = () => {
    onFiltersChange({});
    onRangeFiltersChange({});
    onMultiFiltersChange({});
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors",
          activeCount > 0
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-surface-border bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {activeCount > 0 ? (
          <span className="rounded bg-accent/20 px-1 text-[9px] font-bold">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-[min(92vw,360px)] rounded-lg border border-surface-border bg-card p-3 shadow-dropdown">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Advanced filters
            </p>
            <div className="flex items-center gap-1">
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] text-text-muted hover:text-text-primary"
                >
                  Clear all
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-text-faint hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {textColumns.slice(0, 4).map((column) => (
              <label key={column.id} className="block">
                <span className="mb-1 block text-[10px] text-text-muted">
                  {column.label} contains
                </span>
                <input
                  type="text"
                  value={filters[column.id] ?? ""}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      [column.id]: event.target.value,
                    })
                  }
                  className="h-7 w-full rounded-md border border-surface-border bg-surface-raised px-2 text-[11px] text-text-primary focus:border-accent focus:outline-none"
                  placeholder={`Filter ${column.label}…`}
                />
              </label>
            ))}

            {numericColumns.slice(0, 4).map((column) => {
              const range = rangeFilters[column.id] ?? {};
              return (
                <div key={column.id}>
                  <p className="mb-1 text-[10px] text-text-muted">
                    {column.label} range
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={range.min ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        onRangeFiltersChange({
                          ...rangeFilters,
                          [column.id]: {
                            ...range,
                            min: raw === "" ? null : Number(raw),
                          },
                        });
                      }}
                      placeholder="Min"
                      className="h-7 w-full rounded-md border border-surface-border bg-surface-raised px-2 text-[11px] tabular-nums text-text-primary focus:border-accent focus:outline-none"
                    />
                    <span className="text-[10px] text-text-faint">–</span>
                    <input
                      type="number"
                      value={range.max ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        onRangeFiltersChange({
                          ...rangeFilters,
                          [column.id]: {
                            ...range,
                            max: raw === "" ? null : Number(raw),
                          },
                        });
                      }}
                      placeholder="Max"
                      className="h-7 w-full rounded-md border border-surface-border bg-surface-raised px-2 text-[11px] tabular-nums text-text-primary focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}

            {Object.entries(multiOptions)
              .filter(([, opts]) => opts.length >= 2 && opts.length <= 16)
              .slice(0, 2)
              .map(([columnId, options]) => {
                const column = columns.find((c) => c.id === columnId);
                if (!column) return null;
                const selected = new Set(multiFilters[columnId] ?? []);
                return (
                  <div key={columnId}>
                    <p className="mb-1 text-[10px] text-text-muted">
                      {column.label} (multi-select)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {options.map((option) => {
                        const on = selected.has(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              const next = new Set(selected);
                              if (on) next.delete(option);
                              else next.add(option);
                              onMultiFiltersChange({
                                ...multiFilters,
                                [columnId]: [...next],
                              });
                            }}
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px]",
                              on
                                ? "border-accent/40 bg-accent/15 text-accent"
                                : "border-surface-border text-text-muted hover:bg-surface-hover"
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
