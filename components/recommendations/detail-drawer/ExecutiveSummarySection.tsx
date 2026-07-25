"use client";

import type { ExecutiveSummaryView } from "@/lib/recommendations/executive-decision-presenter";
import {
  ConvictionBadge,
  SectionShell,
  VerdictBadge,
} from "./SectionChrome";

export function ExecutiveSummarySection({
  view,
}: {
  view: ExecutiveSummaryView;
}) {
  return (
    <SectionShell
      index={1}
      title="Executive Summary"
      description="Should you buy, sell, or hold — and why."
    >
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={view.action} />
        <ConvictionBadge band={view.convictionBand} />
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
          Confidence{" "}
          {view.confidence != null ? `${view.confidence.toFixed(1)}%` : "—"}
        </span>
        <span className="rounded-full border border-surface-border-subtle bg-surface/40 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          Hold {view.holdingPeriod}
        </span>
      </div>

      <p
        className={
          view.available
            ? "mt-3 text-[12.5px] leading-relaxed text-text-primary"
            : "mt-3 text-[12.5px] leading-relaxed text-text-muted"
        }
      >
        {view.narrative}
      </p>
    </SectionShell>
  );
}
