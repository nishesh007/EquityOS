/**
 * Shared SVG chart helpers for analytics wrappers.
 */

import type { ChartPoint, ChartSeries } from "@/lib/analytics/types";
import {
  CHART_COLORS,
  CHART_SERIES_COLORS,
} from "@/src/design/charts/chartTokens";

export { CHART_COLORS, CHART_SERIES_COLORS };

export interface ChartBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function seriesColor(index: number, explicit?: string): string {
  if (explicit) return explicit;
  return CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];
}

export function flattenPoints(series: readonly ChartSeries[]): ChartPoint[] {
  return series.flatMap((s) => [...s.points]);
}

export function numericX(point: ChartPoint, index: number): number {
  if (typeof point.x === "number" && Number.isFinite(point.x)) return point.x;
  const asTime = Date.parse(String(point.x));
  if (Number.isFinite(asTime)) return asTime;
  return index;
}

export function computeBounds(
  series: readonly ChartSeries[],
  padRatio = 0.08
): ChartBounds | null {
  const points = flattenPoints(series);
  if (points.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  series.forEach((s) => {
    s.points.forEach((point, index) => {
      const x = numericX(point, index);
      const y = point.y;
      if (!Number.isFinite(y)) return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const padY = (maxY - minY) * padRatio;
  return {
    minX,
    maxX,
    minY: minY - padY,
    maxY: maxY + padY,
  };
}

export function project(
  bounds: ChartBounds,
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 24
): { px: number; py: number } {
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const px =
    padding + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * innerW;
  const py =
    padding +
    (1 - (y - bounds.minY) / (bounds.maxY - bounds.minY)) * innerH;
  return { px, py };
}

export function buildLinePath(
  points: readonly ChartPoint[],
  bounds: ChartBounds,
  width: number,
  height: number,
  padding = 24
): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => {
      const { px, py } = project(
        bounds,
        numericX(point, index),
        point.y,
        width,
        height,
        padding
      );
      return `${index === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(" ");
}

export function buildAreaPath(
  points: readonly ChartPoint[],
  bounds: ChartBounds,
  width: number,
  height: number,
  padding = 24
): string {
  if (points.length === 0) return "";
  const line = buildLinePath(points, bounds, width, height, padding);
  const first = project(
    bounds,
    numericX(points[0], 0),
    points[0].y,
    width,
    height,
    padding
  );
  const last = project(
    bounds,
    numericX(points[points.length - 1], points.length - 1),
    points[points.length - 1].y,
    width,
    height,
    padding
  );
  const baseY = height - padding;
  return `${line} L${last.px.toFixed(2)} ${baseY} L${first.px.toFixed(2)} ${baseY} Z`;
}
