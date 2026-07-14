"use client";

import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import type { PostMarketReport } from "@/lib/opportunity-engine/types";
import { CheckCircle2 } from "lucide-react";

export function PostMarketCertificationStrip({
  report,
  snapshot,
}: {
  report: PostMarketReport;
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  const chips = [
    { label: "Generated", value: formatStamp(report.generatedAt) },
    { label: "Market Close", value: report.sessionDate },
    { label: "Final AI Run", value: formatStamp(report.generatedAt) },
    {
      label: "Validation Completed",
      value:
        snapshot?.dashboard?.health.overallHealthScore != null
          ? `${Math.round(snapshot.dashboard.health.overallHealthScore)}`
          : snapshot?.platform?.overallValidationStatus ?? null,
    },
    {
      label: "Trust Certified",
      value:
        snapshot?.trust?.averageTrustScore != null
          ? `${Math.round(snapshot.trust.averageTrustScore)}`
          : snapshot?.platform?.overallTrustScore != null
            ? `${Math.round(snapshot.platform.overallTrustScore)}`
            : null,
    },
    {
      label: "Quality Badge",
      value:
        snapshot?.dashboard?.summary.recommendationQuality != null
          ? `${Math.round(snapshot.dashboard.summary.recommendationQuality)}`
          : null,
    },
    {
      label: "Production Ready",
      value:
        snapshot?.platform?.overallReadiness != null
          ? `${Math.round(snapshot.platform.overallReadiness)}`
          : snapshot?.platform?.overallCertification != null
            ? `${Math.round(snapshot.platform.overallCertification)}`
            : null,
    },
  ].filter((chip) => chip.value != null);

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-3 py-2.5">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="inline-flex items-center gap-1.5 rounded-md border border-surface-border-subtle/70 bg-surface-raised/60 px-2 py-1"
        >
          <CheckCircle2 className="h-3 w-3 text-gain" />
          <span className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            {chip.label}
          </span>
          <span className="font-mono text-[11px] text-text-secondary tabular-nums">
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
