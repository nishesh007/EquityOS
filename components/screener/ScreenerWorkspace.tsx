"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ScreenerFilterPanel } from "@/components/screener/ScreenerFilterPanel";
import { ScreenerResultsTable } from "@/components/screener/ScreenerResultsTable";
import {
  createQuery,
  runScreener,
  SCREENER_PRESETS,
  type FilterDefinition,
  type ScreenerQuery,
  type ScreenerResult,
  type ScreenerUniverseSnapshot,
} from "@/lib/screener";
import { Bookmark, Layers } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface ScreenerWorkspaceProps {
  universe: ScreenerUniverseSnapshot;
  filters: FilterDefinition[];
  filterCount: number;
}

export function ScreenerWorkspace({
  universe,
  filters,
  filterCount,
}: ScreenerWorkspaceProps) {
  const [query, setQuery] = useState<ScreenerQuery>(() => createQuery());
  const [result, setResult] = useState<ScreenerResult>(() =>
    runScreener(createQuery(), universe)
  );
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(() => {
    setIsRunning(true);
    requestAnimationFrame(() => {
      const next = runScreener(query, universe);
      setResult(next);
      setIsRunning(false);
    });
  }, [query, universe]);

  const handlePreset = useCallback(
    (presetQuery: ScreenerQuery) => {
      setQuery(presetQuery);
      setIsRunning(true);
      requestAnimationFrame(() => {
        const next = runScreener(presetQuery, universe);
        setResult(next);
        setIsRunning(false);
      });
    },
    [universe]
  );

  const categorySummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of filters) {
      counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    }
    return counts;
  }, [filters]);

  return (
    <div className="space-y-6">
      <section className="animate-fade-in-up">
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <span className="text-xs text-text-muted">
                {filterCount}+ filters · {universe.totalCount.toLocaleString("en-IN")} stocks
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SCREENER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePreset(preset.query)}
                  className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle px-2.5 py-1 text-[10px] text-text-secondary transition-colors hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
                  title={preset.description}
                >
                  <Bookmark className="h-2.5 w-2.5" />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] animate-fade-in-up [animation-delay:60ms]">
        <ScreenerFilterPanel
          filters={filters}
          rootGroup={query.root}
          onGroupChange={(root) => setQuery({ ...query, root })}
          onRun={handleRun}
          isRunning={isRunning}
        />

        <Card padding="lg">
          <CardHeader
            title="Results"
            subtitle={`Screening ${universe.totalCount.toLocaleString("en-IN")} NSE/BSE stocks`}
          />
          <ScreenerResultsTable
            rows={result.rows}
            totalMatched={result.totalMatched}
            totalUniverse={result.totalUniverse}
            executionMs={result.executionMs}
          />
        </Card>
      </section>

      <section className="animate-fade-in-up [animation-delay:120ms]">
        <Card padding="md">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Filter Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(categorySummary.entries()).map(([category, count]) => (
              <span
                key={category}
                className="rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] text-text-muted"
              >
                {category.replace(/_/g, " ")} · {count}
              </span>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
