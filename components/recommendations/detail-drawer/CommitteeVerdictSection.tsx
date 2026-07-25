"use client";

import type { CommitteeVerdictView } from "@/lib/recommendations/executive-decision-presenter";
import {
  OverallBadge,
  SectionShell,
  VerdictBadge,
} from "./SectionChrome";

export function CommitteeVerdictSection({
  view,
}: {
  view: CommitteeVerdictView;
}) {
  const consensus = view.consensusPercent;

  return (
    <SectionShell
      index={2}
      title="Investment Committee Verdict"
      description="Independent desk opinions synthesized from published engine outputs."
    >
      <div className="space-y-2">
        {view.members.map((member) => (
          <div
            key={member.role}
            className="rounded-lg border border-surface-border-subtle/80 bg-surface/35 px-3 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-text-primary">
                {member.role}
              </p>
              <div className="flex items-center gap-2">
                <VerdictBadge verdict={member.verdict} />
                <span className="font-mono text-[10px] tabular-nums text-text-muted">
                  {member.confidence != null
                    ? `${member.confidence.toFixed(0)}%`
                    : "—"}
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-text-secondary">
              {member.rationale}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-violet-500/25 bg-violet-500/8 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300/90">
              Overall Committee Verdict
            </p>
            <div className="mt-1.5">
              <OverallBadge label={view.overallLabel} />
            </div>
          </div>
          <div className="min-w-[9rem] flex-1 sm:max-w-[14rem]">
            <div className="flex items-center justify-between text-[10px] text-text-muted">
              <span>Consensus</span>
              <span className="font-mono tabular-nums">
                {consensus != null ? `${consensus}%` : "—"}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-border/70"
              role="progressbar"
              aria-valuenow={consensus ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Committee consensus"
            >
              <div
                className="h-full rounded-full bg-violet-500/75 transition-[width] duration-500"
                style={{
                  width: consensus == null ? "0%" : `${Math.max(0, Math.min(100, consensus))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
