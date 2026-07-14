"use client";

import type { TomorrowWatchlistMeta } from "@/lib/opportunity-engine/institutional-presentation";
import { MetricGrid } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";

function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function TomorrowWatchlistMetaHeader({
  meta,
}: {
  meta: TomorrowWatchlistMeta;
}) {
  return (
    <div className="mb-3 rounded-lg border border-surface-border-subtle/70 bg-surface-hover/30 p-3">
      <MetricGrid
        items={[
          { label: "Generated", value: formatStamp(meta.generatedAt) },
          { label: "Valid For", value: meta.validFromLabel },
          { label: "Valid Until", value: meta.validUntilLabel },
          { label: "AI Version", value: meta.aiVersion },
          { label: "Market Regime", value: meta.marketRegime },
          {
            label: "Expected Success",
            value:
              meta.expectedSuccess != null ? `${meta.expectedSuccess}%` : null,
          },
          { label: "Expected Holding", value: meta.expectedHolding },
          { label: "Data Freshness", value: meta.dataFreshness },
          {
            label: "Final Closing Scan",
            value: formatStamp(meta.finalClosingScan),
          },
        ]}
      />
    </div>
  );
}
