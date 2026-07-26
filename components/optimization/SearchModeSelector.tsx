"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  estimateCombinationCount,
  estimateModeRuntimeSeconds,
  planSearchCombinations,
  type SearchMode,
  type SmartSearchIntensity,
  type ParameterState,
} from "@/lib/optimization";

const MODES: {
  id: SearchMode;
  label: string;
  description: string;
}[] = [
  {
    id: "quick",
    label: "Quick Optimization",
    description: "Fast adaptive sample for rapid screening.",
  },
  {
    id: "smart",
    label: "Smart Search",
    description: "Adaptive pruning of weak regions.",
  },
  {
    id: "grid",
    label: "Grid Search",
    description: "Exhaustive evaluation of all combinations.",
  },
  {
    id: "deep",
    label: "Deep Optimization",
    description: "Broader smart search with deeper coverage.",
  },
];

const INTENSITIES: { id: SmartSearchIntensity; label: string }[] = [
  { id: "fast", label: "Fast" },
  { id: "balanced", label: "Balanced" },
  { id: "deep", label: "Deep" },
];

export interface SearchModeSelectorProps {
  searchMode: SearchMode;
  smartIntensity: SmartSearchIntensity;
  parameters: ParameterState[];
  onSearchModeChange: (mode: SearchMode) => void;
  onIntensityChange: (intensity: SmartSearchIntensity) => void;
}

export const SearchModeSelector = memo(function SearchModeSelector({
  searchMode,
  smartIntensity,
  parameters,
  onSearchModeChange,
  onIntensityChange,
}: SearchModeSelectorProps) {
  const estimates = useMemo(() => {
    return MODES.map((mode) => {
      const combos = planSearchCombinations({
        parameters,
        searchMode: mode.id,
        smartIntensity,
      });
      const seconds = estimateModeRuntimeSeconds(combos.length, mode.id);
      return {
        id: mode.id,
        count: combos.length,
        fullGrid: estimateCombinationCount(parameters),
        runtime:
          seconds < 60
            ? `~${seconds.toFixed(1)}s`
            : `~${(seconds / 60).toFixed(1)} min`,
      };
    });
  }, [parameters, smartIntensity]);

  return (
    <Card hover={false} padding="sm" data-testid="search-mode-selector">
      <CardHeader
        title="Search Modes"
        subtitle="Estimated runtime shown before execution"
      />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODES.map((mode) => {
          const est = estimates.find((e) => e.id === mode.id);
          const selected = searchMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSearchModeChange(mode.id)}
              aria-pressed={selected}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                selected
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border-subtle bg-surface-overlay/40 hover:bg-surface-hover"
              )}
            >
              <p className="text-xs font-semibold text-text-primary">
                {mode.label}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {mode.description}
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-accent">
                {est?.count.toLocaleString()} combos · {est?.runtime}
              </p>
            </button>
          );
        })}
      </div>

      {(searchMode === "smart" ||
        searchMode === "quick" ||
        searchMode === "deep") && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Smart Intensity
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Smart search intensity">
            {INTENSITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onIntensityChange(item.id)}
                aria-pressed={smartIntensity === item.id}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  smartIntensity === item.id
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-surface-border-subtle text-text-secondary hover:bg-surface-hover"
                )}
              >
                {item.label} Mode
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});
