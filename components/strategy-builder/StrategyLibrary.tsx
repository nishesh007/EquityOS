"use client";

import { memo, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { VirtualizedRows } from "@/components/backtesting/hardening/VirtualizedRows";
import type { BuiltStrategy, LibraryFilterState } from "@/lib/strategy-builder";
import { StrategyCard } from "./StrategyCard";

export const StrategyLibrary = memo(function StrategyLibrary({
  strategies,
  filters,
  selectedId,
  comparisonIds,
  onFiltersChange,
  onSelect,
  onToggleCompare,
  onFavorite,
  onDuplicate,
  onRename,
  onArchive,
  onDelete,
  onSaveGenerated,
}: {
  strategies: readonly BuiltStrategy[];
  filters: LibraryFilterState;
  selectedId: string | null;
  comparisonIds: readonly string[];
  onFiltersChange: (patch: Partial<LibraryFilterState>) => void;
  onSelect: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveGenerated?: (id: string) => void;
}) {
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const s of strategies) for (const t of s.tags) set.add(t);
    return Array.from(set).sort();
  }, [strategies]);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <Card padding="lg" data-testid="strategy-library">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Strategy Library
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Persist, tag, favorite, and manage reusable strategies locally.
          </p>
        </div>
        <span className="text-xs text-text-faint">{strategies.length} shown</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="library-search">
          Search strategies
        </label>
        <input
          id="library-search"
          type="search"
          placeholder="Search name, tag, description…"
          value={filters.query}
          onChange={(e) => onFiltersChange({ query: e.target.value })}
          className="min-w-[200px] flex-1 rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
        />
        <select
          aria-label="Filter by tag"
          className="rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
          value={filters.tag ?? ""}
          onChange={(e) =>
            onFiltersChange({ tag: e.target.value || null })
          }
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-surface-border-subtle px-3 py-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={filters.favoritesOnly}
            onChange={(e) =>
              onFiltersChange({ favoritesOnly: e.target.checked })
            }
          />
          Favorites
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-surface-border-subtle px-3 py-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(e) =>
              onFiltersChange({ includeArchived: e.target.checked })
            }
          />
          Archived
        </label>
      </div>

      <div className="mt-4">
        <VirtualizedRows
          items={strategies as BuiltStrategy[]}
          rowHeight={168}
          maxHeight={420}
          labelledBy="strategy-library"
          keyExtractor={(s) => s.id}
          emptyFallback={
            <p className="py-8 text-center text-sm text-text-secondary">
              No strategies in the library yet. Generate and save one to begin.
            </p>
          }
          renderRow={(s) => (
            <div className="space-y-2 px-1 py-1">
              <StrategyCard
                strategy={s}
                selected={selectedId === s.id}
                compared={comparisonIds.includes(s.id)}
                onSelect={() => onSelect(s.id)}
                onToggleCompare={() => onToggleCompare(s.id)}
                onFavorite={() => onFavorite(s.id)}
              />
              <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                {onSaveGenerated && s.source === "generated" && (
                  <button
                    type="button"
                    className="rounded border border-surface-border-subtle px-2 py-1 text-[11px] text-text-secondary"
                    onClick={() => onSaveGenerated(s.id)}
                  >
                    Save to library
                  </button>
                )}
                <button
                  type="button"
                  className="rounded border border-surface-border-subtle px-2 py-1 text-[11px] text-text-secondary"
                  onClick={() => onDuplicate(s.id)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="rounded border border-surface-border-subtle px-2 py-1 text-[11px] text-text-secondary"
                  onClick={() => {
                    setRenameId(s.id);
                    setRenameValue(s.name);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="rounded border border-surface-border-subtle px-2 py-1 text-[11px] text-text-secondary"
                  onClick={() => onArchive(s.id)}
                >
                  {s.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  className="rounded border border-loss/40 px-2 py-1 text-[11px] text-loss"
                  onClick={() => onDelete(s.id)}
                >
                  Delete
                </button>
              </div>
              {renameId === s.id && (
                <form
                  className="flex gap-2 px-1 pb-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRename(s.id, renameValue);
                    setRenameId(null);
                  }}
                >
                  <input
                    aria-label="Rename strategy"
                    className="flex-1 rounded border border-surface-border-subtle bg-surface-raised px-2 py-1 text-xs"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="rounded bg-accent px-2 py-1 text-xs text-white"
                  >
                    Save
                  </button>
                </form>
              )}
            </div>
          )}
        />
      </div>
    </Card>
  );
});
