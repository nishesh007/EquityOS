/**
 * Heatmap bucketing — maps cell values onto the theme heat scale.
 * Works for sector, portfolio, market and recommendation heatmaps.
 */

import { getVisualizationTheme } from "./visualizationTheme";
import type { Theme } from "../theme/themeTokens";

export interface HeatmapCellInput {
  id: string;
  label: string;
  /** The value that drives the color (e.g. % change, score). */
  value: number;
  /** Optional pre-formatted display value. */
  display?: string;
}

export interface HeatmapCell extends HeatmapCellInput {
  /** Bucket index into the heat scale (0 = coldest). */
  bucket: number;
  /** Resolved color from the visualization theme. */
  color: string;
  /** Normalized position of the value in the domain, 0–1. */
  intensity: number;
}

export interface HeatmapRender {
  cells: readonly HeatmapCell[];
  min: number;
  max: number;
  buckets: number;
  empty: boolean;
}

export interface HeatmapOptions {
  /** Fixed domain; defaults to the data extent. Use [-x, x] for change %. */
  domain?: [number, number];
  theme?: Theme;
}

/** Public API — bucket heatmap cells onto the theme heat scale. */
export function renderHeatmap(
  inputs: readonly HeatmapCellInput[],
  options: HeatmapOptions = {},
): HeatmapRender {
  const scale = getVisualizationTheme(options.theme).heatScale;
  const valid = inputs.filter((cell) => Number.isFinite(cell.value));
  if (valid.length === 0) {
    return Object.freeze({ cells: [], min: 0, max: 0, buckets: scale.length, empty: true });
  }

  const values = valid.map((cell) => cell.value);
  const [min, max] = options.domain ?? [Math.min(...values), Math.max(...values)];
  const range = max - min;

  const cells = valid.map((cell) => {
    const normalized = range === 0 ? 0.5 : (cell.value - min) / range;
    const intensity = Math.min(1, Math.max(0, normalized));
    const bucket = Math.min(scale.length - 1, Math.floor(intensity * scale.length));
    return Object.freeze({ ...cell, bucket, color: scale[bucket], intensity: round2(intensity) });
  });

  return Object.freeze({
    cells: Object.freeze(cells),
    min,
    max,
    buckets: scale.length,
    empty: false,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
