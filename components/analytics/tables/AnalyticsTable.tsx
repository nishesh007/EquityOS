"use client";

import { useMemo, useState } from "react";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Search } from "lucide-react";

export interface AnalyticsTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  numeric?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
  accessor?: (row: T) => string | number | null | undefined;
  render: (row: T) => React.ReactNode;
}

export interface AnalyticsTableProps<T> {
  columns: AnalyticsTableColumn<T>[];
  data: readonly T[];
  keyExtractor: (row: T) => string;
  className?: string;
  caption?: string;
  stickyHeader?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  initialSortKey?: string;
  initialSortDir?: "asc" | "desc";
  onRowClick?: (row: T) => void;
}

type SortDir = "asc" | "desc";

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir
): number {
  const av = a ?? "";
  const bv = b ?? "";
  let result = 0;
  if (typeof av === "number" && typeof bv === "number") {
    result = av - bv;
  } else {
    result = String(av).localeCompare(String(bv), "en", { numeric: true });
  }
  return dir === "asc" ? result : -result;
}

/**
 * Shared analytics table — sorting, search, pagination, sticky header,
 * loading + empty states. Presentation infrastructure only.
 */
export function AnalyticsTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  caption,
  stickyHeader = true,
  loading = false,
  emptyTitle = "No rows",
  emptyMessage = "No analytics data matches the current filters.",
  searchable = true,
  searchPlaceholder = "Search…",
  pageSize = 25,
  initialSortKey,
  initialSortDir = "desc",
  onRowClick,
}: AnalyticsTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);
  const [page, setPage] = useState(0);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      for (const col of columns) {
        if (!col.filterable) continue;
        const filter = columnFilters[col.key]?.trim().toLowerCase();
        if (!filter) continue;
        const raw = col.accessor?.(row);
        if (!String(raw ?? "").toLowerCase().includes(filter)) return false;
      }
      if (!q) return true;
      const searchableColumns = columns.filter((col) => col.accessor);
      if (searchableColumns.length === 0) return true;
      return searchableColumns.some((col) => {
        const raw = col.accessor?.(row);
        return raw != null && String(raw).toLowerCase().includes(q);
      });
    });
  }, [columns, columnFilters, data, query]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return filtered;
    return [...filtered].sort((a, b) =>
      compareValues(col.accessor?.(a), col.accessor?.(b), sortDir)
    );
  }, [columns, filtered, sortDir, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  if (loading) {
    return (
      <div className={cn("space-y-2", className)} role="status" aria-label="Loading table">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {searchable || columns.some((c) => c.filterable) ? (
        <div className="flex flex-wrap items-center gap-2">
          {searchable ? (
            <label className="relative min-w-[12rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/40 py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-faint focus:border-accent/40 focus:outline-none"
              />
            </label>
          ) : null}
          {columns
            .filter((c) => c.filterable)
            .map((col) => (
              <input
                key={col.key}
                value={columnFilters[col.key] ?? ""}
                onChange={(e) => {
                  setColumnFilters((prev) => ({
                    ...prev,
                    [col.key]: e.target.value,
                  }));
                  setPage(0);
                }}
                placeholder={`Filter ${col.header}`}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2 text-xs text-text-primary placeholder:text-text-faint focus:border-accent/40 focus:outline-none"
              />
            ))}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyStatePanel
          icon={Inbox}
          title={emptyTitle}
          message={emptyMessage}
          source="Analytics Table"
        />
      ) : (
        <>
          <div
            className={cn(
              stickyHeader ? TABLE_CLASSES.container : "overflow-x-auto rounded-lg"
            )}
          >
            <table className={TABLE_CLASSES.table}>
              {caption ? <caption className="sr-only">{caption}</caption> : null}
              <thead>
                <tr>
                  {columns.map((col) => {
                    const align =
                      col.align ?? (col.numeric ? "right" : "left");
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn(
                          align === "right" && "text-right",
                          align === "center" && "text-center",
                          col.numeric && TABLE_CLASSES.numericCell,
                          col.className
                        )}
                      >
                        {col.sortable && col.accessor ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex items-center gap-1 font-semibold"
                          >
                            {col.header}
                            {sortKey === col.key ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-text-faint" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((col) => {
                      const align =
                        col.align ?? (col.numeric ? "right" : "left");
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "py-3 text-sm",
                            align === "right" && "text-right",
                            align === "center" && "text-center",
                            col.numeric && TABLE_CLASSES.numericCell,
                            col.className
                          )}
                        >
                          {col.render(row)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
            <span>
              {sorted.length} row{sorted.length === 1 ? "" : "s"}
              {sorted.length !== data.length
                ? ` (filtered from ${data.length})`
                : ""}
            </span>
            {pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md border border-surface-border-subtle px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>
                  Page {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                  className="rounded-md border border-surface-border-subtle px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
