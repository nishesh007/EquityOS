"use client";

/**
 * Sprint 10C.R4 — institutional table toolbar.
 * Refresh, search, density, column customization, export and fullscreen.
 */

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Rows3,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DENSITY_LABELS,
  type DensityMode,
  type TableColumn,
} from "@/src/design/tables/tableEngine";

const BUTTON_CLASS =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-2 text-[11px] font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-hover hover:text-text-primary";

interface TableToolbarProps {
  title?: string;
  subtitle?: string;
  search: string;
  onSearchChange: (value: string) => void;
  density: DensityMode;
  onCycleDensity: () => void;
  columns: readonly TableColumn<never>[];
  hiddenColumns: readonly string[];
  columnOrder: readonly string[];
  pinLeft?: readonly string[];
  onToggleColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
  onTogglePinLeft?: (columnId: string) => void;
  onResetLayout: () => void;
  onExport: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onRefresh?: () => void;
  /** Optional extra controls (filters, settings). */
  extra?: React.ReactNode;
}

export function TableToolbar({
  title,
  subtitle,
  search,
  onSearchChange,
  density,
  onCycleDensity,
  columns,
  hiddenColumns,
  columnOrder,
  pinLeft = [],
  onToggleColumn,
  onMoveColumn,
  onTogglePinLeft,
  onResetLayout,
  onExport,
  fullscreen,
  onToggleFullscreen,
  onRefresh,
  extra,
}: TableToolbarProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!columnsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setColumnsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColumnsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [columnsOpen]);

  const orderedColumns = [...columns].sort(
    (a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id)
  );

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {(title || subtitle) && (
        <div className="mr-auto min-w-0">
          {title && (
            <h3 className="truncate text-sm font-semibold tracking-tight text-text-primary">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="truncate text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
      )}

      <div className={cn("flex flex-wrap items-center gap-2", !title && "ml-auto")}>
        <label className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-faint"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search…"
            aria-label="Search table"
            className="h-7 w-36 rounded-md border border-surface-border bg-surface-raised pl-7 pr-2 text-[11px] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none sm:w-44"
          />
        </label>

        {extra}

        <button
          type="button"
          onClick={onCycleDensity}
          className={BUTTON_CLASS}
          aria-label={`Density: ${DENSITY_LABELS[density]}. Click to change.`}
          title={`Density: ${DENSITY_LABELS[density]}`}
        >
          <Rows3 aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{DENSITY_LABELS[density]}</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setColumnsOpen((open) => !open)}
            className={BUTTON_CLASS}
            aria-haspopup="menu"
            aria-expanded={columnsOpen}
            aria-label="Customize columns"
          >
            <Columns3 aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Columns</span>
          </button>

          {columnsOpen && (
            <div
              role="menu"
              aria-label="Column customization"
              className="absolute right-0 z-30 mt-1 w-60 rounded-lg border border-surface-border bg-card p-2 shadow-dropdown"
            >
              <div className="max-h-64 overflow-y-auto">
                {orderedColumns.map((column, index) => {
                  const visible = !hiddenColumns.includes(column.id);
                  const pinned = pinLeft.includes(column.id) || column.sticky;
                  return (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-hover"
                    >
                      <input
                        id={`col-toggle-${column.id}`}
                        type="checkbox"
                        checked={visible}
                        onChange={() => onToggleColumn(column.id)}
                        className="h-3.5 w-3.5 accent-[rgb(var(--eos-color-accent))]"
                      />
                      <label
                        htmlFor={`col-toggle-${column.id}`}
                        className="min-w-0 flex-1 truncate text-xs text-text-secondary"
                      >
                        {column.label}
                      </label>
                      {onTogglePinLeft ? (
                        <button
                          type="button"
                          onClick={() => onTogglePinLeft(column.id)}
                          aria-label={
                            pinned
                              ? `Unpin ${column.label}`
                              : `Pin ${column.label} left`
                          }
                          title={pinned ? "Unpin left" : "Pin left"}
                          className={cn(
                            "rounded px-1 text-[9px] font-semibold",
                            pinned
                              ? "bg-accent/15 text-accent"
                              : "text-text-faint hover:text-text-primary"
                          )}
                        >
                          Pin
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onMoveColumn(column.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${column.label} up`}
                        className="rounded p-0.5 text-text-faint hover:text-text-primary disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveColumn(column.id, 1)}
                        disabled={index === orderedColumns.length - 1}
                        aria-label={`Move ${column.label} down`}
                        className="rounded p-0.5 text-text-faint hover:text-text-primary disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={onResetLayout}
                className="mt-2 w-full rounded-md border border-surface-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                Reset layout
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onExport}
          className={BUTTON_CLASS}
          aria-label="Export table as CSV"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className={BUTTON_CLASS}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {fullscreen ? (
            <Minimize2 aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </button>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={BUTTON_CLASS}
            aria-label="Refresh table"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
