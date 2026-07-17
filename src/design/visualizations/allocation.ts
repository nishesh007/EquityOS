/**
 * Allocation ring geometry — converts value slices into donut segments.
 * Pure presentation math over values that already exist (holding values,
 * sector totals); no portfolio calculations are duplicated here.
 */

import { getVisualizationTheme } from "./visualizationTheme";
import type { Theme } from "../theme/themeTokens";

export interface AllocationSliceInput {
  id: string;
  label: string;
  /** Absolute value of the slice (e.g. holding market value). */
  value: number;
}

export interface AllocationSegment extends AllocationSliceInput {
  /** Share of the total, 0–1. */
  share: number;
  /** Share formatted as a percent, 1dp. */
  percent: number;
  startAngle: number;
  endAngle: number;
  color: string;
  /** SVG stroke-dasharray geometry for a donut of circumference C. */
  dashLength: number;
  dashOffset: number;
}

export interface AllocationRender {
  segments: readonly AllocationSegment[];
  total: number;
  /** Circumference used for the dash geometry. */
  circumference: number;
  empty: boolean;
}

export interface AllocationOptions {
  /** Donut radius used for dash geometry (default 40). */
  radius?: number;
  /** Group slices beyond this count into "Others". */
  maxSlices?: number;
  theme?: Theme;
}

/** Public API — compute donut segments from allocation slices. */
export function renderAllocationChart(
  inputs: readonly AllocationSliceInput[],
  options: AllocationOptions = {},
): AllocationRender {
  const radius = options.radius ?? 40;
  const circumference = round2(2 * Math.PI * radius);
  const palette = getVisualizationTheme(options.theme).series;

  const valid = inputs.filter((slice) => Number.isFinite(slice.value) && slice.value > 0);
  const total = valid.reduce((sum, slice) => sum + slice.value, 0);
  if (valid.length === 0 || total <= 0) {
    return Object.freeze({ segments: [], total: 0, circumference, empty: true });
  }

  const maxSlices = options.maxSlices ?? 6;
  const sorted = [...valid].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, maxSlices);
  const tail = sorted.slice(maxSlices);
  const slices =
    tail.length > 0
      ? [
          ...head,
          {
            id: "others",
            label: "Others",
            value: tail.reduce((sum, slice) => sum + slice.value, 0),
          },
        ]
      : head;

  let cursor = 0;
  const segments = slices.map((slice, index) => {
    const share = slice.value / total;
    const startAngle = round2(cursor * 360);
    cursor += share;
    const endAngle = round2(cursor * 360);
    return Object.freeze({
      ...slice,
      share: round4(share),
      percent: Math.round(share * 1000) / 10,
      startAngle,
      endAngle,
      color: palette[index % palette.length],
      dashLength: round2(share * circumference),
      dashOffset: round2(circumference - (startAngle / 360) * circumference),
    });
  });

  return Object.freeze({
    segments: Object.freeze(segments),
    total,
    circumference,
    empty: false,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
