"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ScreenerFilterPanel } from "@/components/screener/ScreenerFilterPanel";
import { ScreenerResultsTable } from "@/components/screener/ScreenerResultsTable";
import {
  createQuery,
  SCREENER_PRESETS,
  type FilterDefinition,
  type ScreenerQuery,
  type ScreenerResult,
  type ScreenerUniverseSnapshot,
} from "@/lib/screener";
import { Bookmark, Layers } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ScreenerWorkspaceProps {
  universe: ScreenerUniverseSnapshot;
  filters: FilterDefinition[];
  filterCount: number;
}

async function runScreenerOnServer(query: ScreenerQuery): Promise<ScreenerResult> {
  const response = await fetch("/api/screener/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error("Screener run failed");
  }

  return response.json() as Promise<ScreenerResult>;
}

export function ScreenerWorkspace({
  universe,
  filters,
  filterCount,
}: ScreenerWorkspaceProps) {
  const [query, setQuery] = useState<ScreenerQuery>(() => createQuery());
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (nextQuery: ScreenerQuery) => {
    setIsRunning(true);
    setError(null);
    try {
      const next = await runScreenerOnServer(nextQuery);
      setResult(next);
    } catch {
      setError("Failed to run screener. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    void runQuery(createQuery());
  }, [runQuery]);

  const handleRun = useCallback(() => {
    void runQuery(query);
  }, [query, runQuery]);

  const handlePreset = useCallback(
    (presetQuery: ScreenerQuery) => {
      setQuery(presetQuery);
      void runQuery(presetQuery);
    },
    [runQuery]
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
          {error ? (
            <p className="py-8 text-center text-sm text-loss">{error}</p>
          ) : result ? (
            <ScreenerResultsTable
              rows={result.rows}
              totalMatched={result.totalMatched}
              totalUniverse={result.totalUniverse}
              executionMs={result.executionMs}
            />
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">Loading results…</p>
          )}
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
