/**
 * Sparkline geometry — converts a numeric series into SVG path data plus
 * trend metadata. Pure presentation math; no business calculations.
 */

export type TrendDirection = "up" | "down" | "flat";

export interface SparklineRender {
  /** SVG polyline path ("M x y L x y ...") in the given viewbox. */
  path: string;
  /** Closed path for an area fill under the line. */
  areaPath: string;
  width: number;
  height: number;
  trend: TrendDirection;
  /** Percent change first → last (presentation delta, 2dp). */
  changePercent: number;
  /** Range of the series (session range). */
  min: number;
  max: number;
  /** Position of the last value within the range, 0–1. */
  lastPositionInRange: number;
  /** True when the series was too short/invalid to draw. */
  empty: boolean;
}

export interface SparklineOptions {
  width?: number;
  height?: number;
  /** Padding inside the viewbox so strokes are not clipped. */
  padding?: number;
}

const EMPTY: SparklineRender = Object.freeze({
  path: "",
  areaPath: "",
  width: 0,
  height: 0,
  trend: "flat",
  changePercent: 0,
  min: 0,
  max: 0,
  lastPositionInRange: 0,
  empty: true,
});

/** Public API — compute sparkline geometry from a value series. */
export function renderSparkline(
  values: readonly number[],
  options: SparklineOptions = {},
): SparklineRender {
  const series = values.filter((value) => Number.isFinite(value));
  const width = options.width ?? 96;
  const height = options.height ?? 28;
  const padding = options.padding ?? 2;

  if (series.length < 2) return { ...EMPTY, width, height };

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min;

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const stepX = innerWidth / (series.length - 1);

  const points = series.map((value, index) => {
    const x = padding + index * stepX;
    const normalized = range === 0 ? 0.5 : (value - min) / range;
    const y = padding + (1 - normalized) * innerHeight;
    return { x: round2(x), y: round2(y) };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${path} L${points[points.length - 1].x} ${height - padding} L${points[0].x} ${height - padding} Z`;

  const first = series[0];
  const last = series[series.length - 1];
  const changePercent = first === 0 ? 0 : round2(((last - first) / Math.abs(first)) * 100);
  const trend: TrendDirection =
    changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";

  return Object.freeze({
    path,
    areaPath,
    width,
    height,
    trend,
    changePercent,
    min,
    max,
    lastPositionInRange: range === 0 ? 0.5 : round2((last - min) / range),
    empty: false,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
