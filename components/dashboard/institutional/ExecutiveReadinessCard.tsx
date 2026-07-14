"use client";

import type { ExecutiveReadinessView } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveReadinessCard({
  readiness,
}: {
  readiness: ExecutiveReadinessView;
}) {
  if (readiness.empty) {
    return (
      <div
        className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10 px-3 py-3"
        data-testid="executive-readiness-empty"
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
          Production Readiness
        </p>
        <p className="mt-2 text-[11px] text-text-muted">{readiness.emptyMessage}</p>
      </div>
    );
  }

  const rows = [
    { label: "Production Ready", value: readiness.productionReady },
    { label: "Certification", value: readiness.certification },
    { label: "Build", value: readiness.build },
    { label: "Release", value: readiness.release },
    { label: "Environment", value: readiness.environment },
    { label: "Audit", value: readiness.audit },
    { label: "Last Validation", value: readiness.lastValidation },
  ];

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10 px-3 py-3"
      data-testid="executive-readiness-card"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Production Readiness
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2"
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
              {row.label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-text-primary">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
