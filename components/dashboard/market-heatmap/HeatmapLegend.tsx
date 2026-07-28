"use client";

import { BAND_BG, BAND_LABEL } from "./color";
import type { PerformanceBand } from "@/lib/market-heatmap/types";

const ORDER: PerformanceBand[] = [
  "strongGain",
  "moderateGain",
  "neutral",
  "moderateLoss",
  "strongLoss",
];

export function HeatmapLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      role="list"
      aria-label="Heatmap performance legend"
    >
      {ORDER.map((band) => (
        <div
          key={band}
          role="listitem"
          className="flex items-center gap-2"
        >
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: BAND_BG[band] }}
            aria-hidden
          />
          <span className="text-caption font-medium text-text-secondary">
            {BAND_LABEL[band]}
          </span>
        </div>
      ))}
    </div>
  );
}
