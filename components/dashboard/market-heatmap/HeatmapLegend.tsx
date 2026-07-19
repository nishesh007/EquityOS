"use client";

import { BAND_BG, BAND_LABEL } from "./color";
import type { PerformanceBand } from "@/lib/market-heatmap";

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
      className="flex flex-wrap items-center gap-2"
      role="list"
      aria-label="Heatmap performance legend"
    >
      {ORDER.map((band) => (
        <div
          key={band}
          role="listitem"
          className="flex items-center gap-1.5 rounded-md border border-surface-border-subtle px-2 py-1"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: BAND_BG[band] }}
            aria-hidden
          />
          <span className="text-[10px] font-medium text-text-muted">
            {BAND_LABEL[band]}
          </span>
        </div>
      ))}
    </div>
  );
}
