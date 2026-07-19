"use client";

/**
 * ResearchDataGrid — institutional research grid façade.
 * Wraps InstitutionalTable with saved views, row expansion, and export menu.
 * Presentation only.
 */

import { InstitutionalTable, type BulkAction } from "./InstitutionalTable";
import {
  processTable,
  toCsv,
  type InstitutionalTableDef,
  type TableState,
} from "./tableEngine";
import {
  applyBuiltinDensityPreset,
  applyNamedView,
  BUILTIN_VIEW_PRESETS,
  deleteNamedView,
  listSavedViews,
  saveNamedView,
  type SavedTableView,
} from "./savedViews";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  Printer,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ResearchDataGridProps<Row> {
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
  bulkActions?: BulkAction<Row>[];
  persistPreferences?: boolean;
  paginated?: boolean;
  maxHeight?: number;
  className?: string;
  /** Expandable research detail for a row. */
  renderExpandedRow?: (row: Row) => ReactNode;
}

export function ResearchDataGrid<Row>({
  table,
  rows,
  getRowId,
  title,
  subtitle,
  loading,
  emptyTitle,
  emptyDescription,
  onRowClick,
  onRefresh,
  bulkActions,
  persistPreferences = true,
  paginated = true,
  maxHeight = 520,
  className,
  renderExpandedRow,
}: ResearchDataGridProps<Row>) {
  const [views, setViews] = useState<SavedTableView[]>([]);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const stateRef = useRef<TableState>(table.defaultState);
  const [gridState, setGridState] = useState<TableState>(table.defaultState);
  const [applyState, setApplyState] = useState<TableState | null>(null);
  const [applyStateKey, setApplyStateKey] = useState(0);

  useEffect(() => {
    setViews(listSavedViews(table.id));
  }, [table.id]);

  const refreshViews = useCallback(() => {
    setViews(listSavedViews(table.id));
  }, [table.id]);

  const filteredRows = useMemo(() => {
    return processTable(table, rows, {
      ...gridState,
      page: 0,
      pageSize: Math.max(1, rows.length),
    }).rows;
  }, [table, rows, gridState]);

  const bumpApply = useCallback((next: TableState) => {
    setApplyState(next);
    setApplyStateKey((key) => key + 1);
  }, []);

  const handleCopy = useCallback(() => {
    const csv = toCsv(table.columns as never, filteredRows as never);
    void navigator.clipboard?.writeText(csv);
  }, [table.columns, filteredRows]);

  const handleExcel = useCallback(() => {
    const csv = toCsv(table.columns as never, filteredRows as never);
    const blob = new Blob([`\ufeff${csv}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.id}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [table.columns, filteredRows, table.id]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const expandedRow = useMemo(() => {
    if (!expandedId || !renderExpandedRow) return null;
    return rows.find((row) => getRowId(row) === expandedId) ?? null;
  }, [expandedId, rows, getRowId, renderExpandedRow]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setViewsOpen((o) => !o)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-2 text-[11px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Saved views
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {viewsOpen ? (
            <div className="absolute left-0 z-30 mt-1 w-56 rounded-lg border border-surface-border bg-card p-1.5 shadow-dropdown">
              <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-wider text-text-faint">
                Presets
              </p>
              {BUILTIN_VIEW_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-[11px] text-text-secondary hover:bg-surface-hover"
                  onClick={() => {
                    bumpApply(
                      applyBuiltinDensityPreset(stateRef.current, preset.density)
                    );
                    setViewsOpen(false);
                  }}
                >
                  {preset.name}
                </button>
              ))}
              <div className="my-1 border-t border-surface-border-subtle" />
              <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-wider text-text-faint">
                Your views
              </p>
              {views.length === 0 ? (
                <p className="px-2 py-1 text-[10px] text-text-faint">
                  No saved views yet
                </p>
              ) : (
                views.map((view) => (
                  <div
                    key={view.id}
                    className="flex items-center gap-1 rounded-md hover:bg-surface-hover"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[11px] text-text-secondary"
                      onClick={() => {
                        bumpApply(applyNamedView(stateRef.current, view));
                        setViewsOpen(false);
                      }}
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${view.name}`}
                      className="rounded p-1 text-text-faint hover:text-loss"
                      onClick={() => {
                        deleteNamedView(table.id, view.id);
                        refreshViews();
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
              <div className="my-1 border-t border-surface-border-subtle" />
              <button
                type="button"
                className="flex w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-accent hover:bg-accent/10"
                onClick={() => {
                  const name = window.prompt("View name", "My research view");
                  if (!name) return;
                  saveNamedView(table.id, name, stateRef.current);
                  refreshViews();
                  setViewsOpen(false);
                }}
              >
                Save current layout…
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-2 text-[11px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {exportOpen ? (
            <div className="absolute left-0 z-30 mt-1 w-44 rounded-lg border border-surface-border bg-card p-1.5 shadow-dropdown">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-text-secondary hover:bg-surface-hover"
                onClick={() => {
                  handleExcel();
                  setExportOpen(false);
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xls)
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-text-secondary hover:bg-surface-hover"
                onClick={() => {
                  handleCopy();
                  setExportOpen(false);
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy selection
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-text-secondary hover:bg-surface-hover"
                onClick={() => {
                  handlePrint();
                  setExportOpen(false);
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print-friendly
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-[10px] text-text-faint">
          {renderExpandedRow
            ? "Click a row to expand · Shift+click headers for multi-sort"
            : "Shift+click column headers for multi-sort"}
        </p>
      </div>

      <InstitutionalTable
        table={table}
        rows={rows}
        getRowId={getRowId}
        title={title}
        subtitle={subtitle}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onRowClick={(row) => {
          if (renderExpandedRow) {
            const id = getRowId(row);
            setExpandedId((current) => (current === id ? null : id));
          }
          onRowClick?.(row);
        }}
        onRefresh={onRefresh}
        bulkActions={bulkActions}
        persistPreferences={persistPreferences}
        paginated={paginated}
        maxHeight={maxHeight}
        applyState={applyState}
        applyStateKey={applyStateKey}
        onStateChange={(next) => {
          stateRef.current = next;
          setGridState(next);
        }}
      />

      {expandedRow && renderExpandedRow ? (
        <div className="animate-fade-in rounded-xl border border-accent/25 bg-accent/5 p-4 text-sm text-text-secondary">
          {renderExpandedRow(expandedRow)}
        </div>
      ) : null}
    </div>
  );
}
