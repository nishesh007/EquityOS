"use client";

import type { AiConvictionView } from "@/lib/recommendations/executive-decision-presenter";
import { ScoreBar, SectionShell } from "./SectionChrome";

export function AiConvictionSection({ view }: { view: AiConvictionView }) {
  return (
    <SectionShell
      index={4}
      title="AI Conviction Breakdown"
      description="Explainable component scores from existing research outputs."
      badge="AI"
    >
      <div className="space-y-2.5">
        {view.rows.map((row) => (
          <div
            key={row.id}
            className={
              row.id === "overall"
                ? "rounded-lg border border-violet-500/25 bg-violet-500/8 px-3 py-2.5"
                : "rounded-lg border border-surface-border-subtle/70 bg-surface/30 px-3 py-2"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <p
                className={
                  row.id === "overall"
                    ? "text-[11px] font-semibold text-violet-200"
                    : "text-[11px] font-semibold text-text-primary"
                }
              >
                {row.label}
              </p>
            </div>
            <div className="mt-1.5">
              <ScoreBar value={row.score} tone={row.tone} />
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-text-muted">
              {row.explanation}
            </p>
          </div>
        ))}
      </div>
      {!view.available ? (
        <p className="mt-2 text-[11px] text-text-muted">
          Component scores will appear once a full recommendation package is
          loaded.
        </p>
      ) : null}
    </SectionShell>
  );
}
