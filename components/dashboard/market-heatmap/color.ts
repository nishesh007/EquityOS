/**
 * Heatmap tile colors — performance bands for sector & stock cells.
 */

import {
  performanceBand,
  type HeatmapColorMetric,
  type HeatmapSectorTile,
  type HeatmapStockCell,
  type PerformanceBand,
} from "@/lib/market-heatmap";

const BAND_BG: Record<PerformanceBand, string> = {
  strongGain: "rgba(34, 197, 94, 0.72)",
  moderateGain: "rgba(34, 197, 94, 0.42)",
  neutral: "rgba(148, 163, 184, 0.28)",
  moderateLoss: "rgba(239, 68, 68, 0.42)",
  strongLoss: "rgba(239, 68, 68, 0.72)",
};

const BAND_LABEL: Record<PerformanceBand, string> = {
  strongGain: "Strong Gain",
  moderateGain: "Moderate Gain",
  neutral: "Neutral",
  moderateLoss: "Moderate Loss",
  strongLoss: "Strong Loss",
};

export { BAND_BG, BAND_LABEL };

export function metricValueForSector(
  tile: HeatmapSectorTile,
  metric: HeatmapColorMetric
): number | null {
  switch (metric) {
    case "dailyChange":
      return tile.dailyChangePercent;
    case "weeklyChange":
      return tile.weeklyChangePercent;
    case "monthlyChange":
      return tile.monthlyChangePercent;
    case "breadth":
      return tile.breadthPercent;
    case "relativeStrength":
      return tile.relativeStrength;
    case "volume":
      return tile.averageVolume;
    case "delivery":
      return tile.averageDeliveryPercent;
    case "marketCap":
      return tile.marketCapCr;
    default:
      return tile.dailyChangePercent;
  }
}

export function metricValueForStock(
  stock: HeatmapStockCell,
  metric: HeatmapColorMetric
): number | null {
  switch (metric) {
    case "dailyChange":
      return stock.changePercent;
    case "weeklyChange":
      return stock.weeklyChangePercent;
    case "monthlyChange":
      return stock.monthlyChangePercent;
    case "breadth":
      return stock.changePercent;
    case "relativeStrength":
      return stock.relativeStrength;
    case "volume":
      return stock.volume;
    case "delivery":
      return stock.deliveryPercent;
    case "marketCap":
      return stock.marketCapCr;
    default:
      return stock.changePercent;
  }
}

function bandKind(
  metric: HeatmapColorMetric
): "change" | "breadth" | "ratio" | "level" {
  if (metric === "breadth") return "breadth";
  if (metric === "volume" || metric === "marketCap" || metric === "delivery") {
    return "level";
  }
  return "change";
}

/** Normalize level metrics onto a change-like scale using log relative to median. */
export function colorForValue(
  value: number | null,
  metric: HeatmapColorMetric,
  levelMedian: number | null
): string {
  if (value == null || !Number.isFinite(value)) {
    return BAND_BG.neutral;
  }
  const kind = bandKind(metric);
  if (kind === "level") {
    if (levelMedian == null || levelMedian <= 0) return BAND_BG.neutral;
    const ratio = value / levelMedian;
    return BAND_BG[performanceBand(ratio, "ratio")];
  }
  return BAND_BG[performanceBand(value, kind)];
}

export function formatMetricDisplay(
  value: number | null,
  metric: HeatmapColorMetric
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (
    metric === "dailyChange" ||
    metric === "weeklyChange" ||
    metric === "monthlyChange" ||
    metric === "relativeStrength" ||
    metric === "breadth" ||
    metric === "delivery"
  ) {
    const sign =
      metric === "breadth" || metric === "delivery"
        ? ""
        : value > 0
          ? "+"
          : "";
    return `${sign}${value.toFixed(1)}${metric === "relativeStrength" ? " pp" : "%"}`;
  }
  if (metric === "volume") {
    if (value >= 1e7) return `${(value / 1e7).toFixed(1)} Cr`;
    if (value >= 1e5) return `${(value / 1e5).toFixed(1)} L`;
    return value.toLocaleString("en-IN");
  }
  if (metric === "marketCap") {
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L Cr`;
    return `₹${value.toFixed(0)} Cr`;
  }
  return String(value);
}
