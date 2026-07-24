"use client";

import {
  HEATMAP_COLOR_METRICS,
  HEATMAP_UNIVERSE_OPTIONS,
  type HeatmapColorMetric,
  type HeatmapUniverseId,
} from "@/lib/market-heatmap/types";

interface HeatmapControlsProps {
  universe: HeatmapUniverseId;
  colorMetric: HeatmapColorMetric;
  pending?: boolean;
  onUniverseChange: (id: HeatmapUniverseId) => void;
  onColorMetricChange: (metric: HeatmapColorMetric) => void;
}

export function HeatmapControls({
  universe,
  colorMetric,
  pending,
  onUniverseChange,
  onColorMetricChange,
}: HeatmapControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="data-label flex items-center gap-1.5">
        Universe
        <select
          aria-label="Heatmap universe"
          disabled={pending}
          className="rounded-md border border-surface-border bg-surface-overlay px-2 py-1 text-xs font-semibold normal-case tracking-normal text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={universe}
          onChange={(event) =>
            onUniverseChange(event.target.value as HeatmapUniverseId)
          }
        >
          {HEATMAP_UNIVERSE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="data-label flex items-center gap-1.5">
        Color by
        <select
          aria-label="Heatmap color metric"
          className="rounded-md border border-surface-border bg-surface-overlay px-2 py-1 text-xs font-semibold normal-case tracking-normal text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={colorMetric}
          onChange={(event) =>
            onColorMetricChange(event.target.value as HeatmapColorMetric)
          }
        >
          {HEATMAP_COLOR_METRICS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
