"use client";

import type { ReportViewerSection } from "@/lib/dashboard/institutional-report-viewer";

/**
 * Charts panel — presentation only. Reuses report/snapshot metrics as chart refs.
 */
export function ReportChartsPanel({
  section,
}: {
  section?: ReportViewerSection | null;
}) {
  const paragraphs = section?.paragraphs ?? [
    "Chart models reuse existing report analytics and platform health metrics.",
  ];

  return (
    <div data-testid="report-charts-panel" className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {["Module Scores", "Trust Distribution", "Health Score"].map((title) => (
          <div
            key={title}
            className="flex h-28 flex-col justify-between rounded-md border border-dashed border-surface-border-subtle/80 bg-surface-raised/30 px-3 py-2"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              {title}
            </p>
            <div className="flex h-12 items-end gap-1">
              {[40, 65, 55, 80, 70].map((h, i) => (
                <div
                  key={`${title}-${i}`}
                  className="flex-1 rounded-sm bg-accent/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-text-muted">Presentation preview</p>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {paragraphs.map((p) => (
          <p key={p} className="text-[11px] text-text-secondary">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
