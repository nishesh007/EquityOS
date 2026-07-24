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
      className="flex flex-wrap items-center gap-1.5"
      role="list"
      aria-label="Heatmap performance legend"
    >
      {ORDER.map((band) => (
        <div
          key={band}
          role="listitem"
          className="flex items-center gap-1 rounded border border-surface-border-subtle/70 px-1.5 py-0.5"
        >
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: BAND_BG[band] }}
            aria-hidden
          />
          <span className="text-[9px] font-medium text-text-muted">
            {BAND_LABEL[band]}
          </span>
        </div>
      ))}
    </div>
  );
}
