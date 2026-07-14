"use client";

import type { ReactNode } from "react";
import type { PortfolioValidationView } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioValidationPanel({
  validation,
}: {
  validation: PortfolioValidationView;
}) {
  if (validation.empty) {
    return (
      <PanelShell title="Portfolio Validation" testId="portfolio-validation-empty">
        <p className="text-[11px] text-text-muted">{validation.emptyMessage}</p>
      </PanelShell>
    );
  }

  const rows = [
    { label: "Portfolio Validation", value: validation.portfolioValidation },
    { label: "Holding Validation", value: validation.holdingValidation },
    { label: "Data Quality", value: validation.dataQuality },
    { label: "Execution Quality", value: validation.executionQuality },
    { label: "Historical Validation", value: validation.historicalValidation },
    { label: "Validation Status", value: validation.validationStatus },
  ];

  return (
    <PanelShell title="Portfolio Validation" testId="portfolio-validation-panel">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2"
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
              {r.label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-text-primary">{r.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
          Validation Timeline
        </p>
        {validation.timeline.length === 0 ? (
          <p className="text-[11px] text-text-muted">Awaiting Validation</p>
        ) : (
          <ul className="space-y-1">
            {validation.timeline.map((t) => (
              <li
                key={t.id}
                className="flex justify-between gap-2 text-[11px] text-text-secondary"
              >
                <span>{t.label}</span>
                <span className="text-text-faint">{t.at}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelShell>
  );
}

function PanelShell({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid={testId}
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">{title}</p>
      {children}
    </div>
  );
}
