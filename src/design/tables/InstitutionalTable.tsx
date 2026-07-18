"use client";

/**
 * Sprint 10C.R4 — the institutional table component.
 *
 * Bloomberg/CapitalIQ-style data table: sticky header, sticky first column,
 * sorting, search, per-column filters, pagination, density modes, column
 * visibility/reorder/resize, CSV export, fullscreen, bulk selection,
 * keyboard navigation and persisted preferences.
 *
 * Presentation only — rows are supplied by callers; nothing is computed here.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import { CellRenderer } from "@/src/design/cells/CellRenderer";
import { WidgetEmptyState } from "@/src/design/widgets/WidgetEmptyState";
import { WidgetSkeleton } from "@/src/design/widgets/WidgetSkeleton";
import { TableToolbar } from "@/src/design/toolbars/TableToolbar";
import {
  columnValue,
  cycleDensity,
  defaultColumnAlign,
  DENSITY_CELL_CLASSES,
  moveColumn,
  moveFocus,
  processTable,
  resetTableLayout,
  setColumnWidth,
  toCsv,
  toggleColumnVisibility,
  visibleColumns,
  type CellPosition,
  type InstitutionalTableDef,
  type SortDirection,
  type TableColumn,
  type TableState,
} from "./tableEngine";
import {
  applyTablePreferences,
  restoreTablePreferences,
  saveTablePreferences,
  tablePreferencesFromState,
} from "./tablePreferences";

export interface BulkAction<Row> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onAction: (rows: Row[]) => void;
}

interface InstitutionalTableProps<Row> {
  table: InstitutionalTableDef<Row>;
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: Row) => void;
  onRefresh?: () => void;
  /** Enables bulk selection checkboxes + action bar. */
  bulkActions?: BulkAction<Row>[];
  /** Persist density/columns preferences (defaults to true). */
  persistPreferences?: boolean;
  /** Hide pagination for short tables. */
  paginated?: boolean;
  maxHeight?: number;
  className?: string;
}

export function InstitutionalTable<Row>({
  table,
  rows,
  getRowId,
  title,
  subtitle,
  loading = false,
  emptyTitle = "No Data",
  emptyDescription,
  onRowClick,
  onRefresh,
  bulkActions,
  persistPreferences = true,
  paginated = true,
  maxHeight = 480,
  className,
}: InstitutionalTableProps<Row>) {
  const [state, setState] = useState<TableState>(table.defaultState);
  const [fullscreen, setFullscreen] = useState(false);
  const [focused, setFocused] = useState<CellPosition | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const hydrated = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Restore persisted preferences after mount (avoids hydration mismatch).
  useEffect(() => {
    if (!persistPreferences) return;
    const prefs = restoreTablePreferences(table.id);
    if (prefs) {
      setState((current) => applyTablePreferences(current, prefs));
    }
    hydrated.current = true;
  }, [table.id, persistPreferences]);

  useEffect(() => {
    if (!persistPreferences || !hydrated.current) return;
    saveTablePreferences(table.id, tablePreferencesFromState(state));
  }, [state, table.id, persistPreferences]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const processed = useMemo(
    () =>
      processTable(table, rows, {
        ...state,
        pageSize: paginated ? state.pageSize : Math.max(1, rows.length),
      }),
    [table, rows, state, paginated]
  );

  const selectionEnabled = Boolean(bulkActions?.length);
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(getRowId(row))),
    [rows, selected, getRowId]
  );

  const update = useCallback(
    (patch: Partial<TableState>) =>
      setState((current) => ({ ...current, ...patch })),
    []
  );

  const handleSort = (column: TableColumn<Row>) => {
    if (column.sortable === false) return;
    setState((current) => {
      const direction: SortDirection =
        current.sort?.columnId === column.id && current.sort.direction === "desc"
          ? "asc"
          : "desc";
      return { ...current, sort: { columnId: column.id, direction }, page: 0 };
    });
  };

  const handleExport = () => {
    const allVisible = visibleColumns(table.columns, state);
    const exportRows = selectedRows.length > 0 ? selectedRows : rows;
    const csv = toCsv(allVisible, exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${table.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleResizeStart = (
    event: React.PointerEvent,
    column: TableColumn<Row>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth =
      state.columnWidths[column.id] ??
      column.width ??
      (event.currentTarget.parentElement as HTMLElement)?.offsetWidth ??
      120;
    const onMove = (move: PointerEvent) => {
      const width = startWidth + (move.clientX - startX);
      setState((current) =>
        setColumnWidth(current, column.id, width, column.minWidth ?? 56)
      );
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const rowCount = processed.rows.length;
    const colCount = processed.columns.length;
    if (rowCount === 0 || colCount === 0) return;
    if (event.key === "Enter" && focused && onRowClick) {
      onRowClick(processed.rows[focused.row]);
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      setFocused(null);
      return;
    }
    const current = focused ?? { row: 0, col: 0 };
    const next = moveFocus(current, event.key, rowCount, colCount);
    if (!focused || next.row !== current.row || next.col !== current.col) {
      const isNavKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(event.key);
      if (isNavKey) {
        setFocused(next);
        event.preventDefault();
      }
    }
  };

  const toggleRowSelected = (rowId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const allPageSelected =
    processed.rows.length > 0 &&
    processed.rows.every((row) => selected.has(getRowId(row)));

  const toggleAllPage = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        processed.rows.forEach((row) => next.delete(getRowId(row)));
      } else {
        processed.rows.forEach((row) => next.add(getRowId(row)));
      }
      return next;
    });
  };

  const body = (
    <div className={cn(!fullscreen && className)}>
      <TableToolbar
        title={title}
        subtitle={subtitle}
        search={state.search}
        onSearchChange={(value) => update({ search: value, page: 0 })}
        density={state.density}
        onCycleDensity={() => update({ density: cycleDensity(state.density) })}
        columns={table.columns as readonly TableColumn<never>[]}
        hiddenColumns={state.hiddenColumns}
        columnOrder={state.columnOrder}
        onToggleColumn={(id) => setState((s) => toggleColumnVisibility(s, id))}
        onMoveColumn={(id, dir) => setState((s) => moveColumn(s, id, dir))}
        onResetLayout={() => setState((s) => resetTableLayout(table, s))}
        onExport={handleExport}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
        onRefresh={onRefresh}
      />

      {selectionEnabled && selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5">
          <span className="text-xs font-medium text-text-primary">
            {selected.size} selected
          </span>
          {bulkActions?.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => action.onAction(selectedRows)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/15"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[11px] text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <WidgetSkeleton rows={6} minHeight={220} />
      ) : rows.length === 0 ? (
        <WidgetEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div
            ref={gridRef}
            role="grid"
            aria-label={title ?? table.id}
            aria-rowcount={processed.filteredCount}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className={cn(TABLE_CLASSES.container, "focus:outline-none")}
            style={{ maxHeight: fullscreen ? "calc(100vh - 160px)" : maxHeight }}
          >
            <table className={TABLE_CLASSES.table}>
              <thead>
                <tr>
                  {selectionEnabled && (
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        aria-label="Select all rows on this page"
                        className="h-3.5 w-3.5 accent-[rgb(var(--eos-color-accent))]"
                      />
                    </th>
                  )}
                  {processed.columns.map((column) => {
                    const align = defaultColumnAlign(
                      column as TableColumn<never>
                    );
                    const sortActive = state.sort?.columnId === column.id;
                    const width = state.columnWidths[column.id] ?? column.width;
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        aria-sort={
                          sortActive
                            ? state.sort?.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        style={width ? { width, minWidth: width } : undefined}
                        className={cn(
                          "group/th relative select-none",
                          column.sticky && "institutional-table-sticky-col z-20",
                          align === "right" && "!text-right"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(column)}
                          disabled={column.sortable === false}
                          className={cn(
                            "inline-flex items-center gap-1 uppercase tracking-wider",
                            align === "right" && "flex-row-reverse",
                            column.sortable !== false &&
                              "cursor-pointer hover:text-text-primary"
                          )}
                        >
                          {column.label}
                          {column.sortable !== false &&
                            (sortActive ? (
                              state.sort?.direction === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-accent" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-accent" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover/th:opacity-40" />
                            ))}
                        </button>
                        <span
                          role="separator"
                          aria-orientation="vertical"
                          onPointerDown={(event) =>
                            handleResizeStart(event, column)
                          }
                          className="absolute right-0 top-1/2 h-4 w-1 -translate-y-1/2 cursor-col-resize rounded bg-surface-border opacity-0 transition-opacity group-hover/th:opacity-100"
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {processed.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        processed.columns.length + (selectionEnabled ? 1 : 0)
                      }
                      className="py-8 text-center text-xs text-text-muted"
                    >
                      No rows match the current search or filters.
                    </td>
                  </tr>
                ) : (
                  processed.rows.map((row, rowIndex) => {
                    const rowId = getRowId(row);
                    return (
                      <tr
                        key={rowId}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          "group",
                          onRowClick && "cursor-pointer",
                          selected.has(rowId) &&
                            TABLE_CLASSES.highlightRow
                        )}
                      >
                        {selectionEnabled && (
                          <td
                            className="w-8"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(rowId)}
                              onChange={() => toggleRowSelected(rowId)}
                              aria-label={`Select row ${rowId}`}
                              className="h-3.5 w-3.5 accent-[rgb(var(--eos-color-accent))]"
                            />
                          </td>
                        )}
                        {processed.columns.map((column, colIndex) => {
                          const align = defaultColumnAlign(
                            column as TableColumn<never>
                          );
                          const isFocused =
                            focused?.row === rowIndex &&
                            focused?.col === colIndex;
                          return (
                            <td
                              key={column.id}
                              className={cn(
                                "!p-0",
                                column.sticky &&
                                  "institutional-table-sticky-col"
                              )}
                            >
                              <div
                                className={cn(
                                  DENSITY_CELL_CLASSES[state.density],
                                  align === "right" && "text-right",
                                  isFocused &&
                                    "rounded ring-1 ring-inset ring-accent"
                                )}
                              >
                                <CellRenderer
                                  kind={column.kind}
                                  value={columnValue(column, row)}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {paginated && processed.pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-text-muted">
                {processed.filteredCount} rows · page {processed.page + 1} of{" "}
                {processed.pageCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update({ page: processed.page - 1 })}
                  disabled={processed.page === 0}
                  aria-label="Previous page"
                  className="rounded-md border border-surface-border p-1 text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ page: processed.page + 1 })}
                  disabled={processed.page >= processed.pageCount - 1}
                  aria-label="Next page"
                  className="rounded-md border border-surface-border p-1 text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title ?? table.id} fullscreen`}
        className="fixed inset-0 z-50 overflow-y-auto bg-surface/95 p-6 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-7xl rounded-xl border border-surface-border bg-card p-5 shadow-overlay">
          {body}
        </div>
      </div>
    );
  }

  return body;
}
