"use client";

import type { PortfolioTrustView } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioTrustPanel({ trust }: { trust: PortfolioTrustView }) {
  if (trust.empty) {
    return (
      <div
        className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
        data-testid="portfolio-trust-empty"
      >
        <p className="text-xs font-semibold text-text-primary">Portfolio Trust</p>
        <p className="mt-2 text-[11px] text-text-muted">{trust.emptyMessage}</p>
      </div>
    );
  }

  const rows = [
    { label: "Portfolio Trust", value: trust.portfolioTrust },
    { label: "Holding Trust", value: trust.holdingTrust },
    { label: "Historical Trust", value: trust.historicalTrust },
    { label: "Trust Trend", value: trust.trustTrend },
    { label: "Institutional Grade", value: trust.institutionalGrade },
  ];

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-trust-panel"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">Portfolio Trust</p>
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
          Trust Drivers
        </p>
        <ul className="space-y-1">
          {trust.trustDrivers.map((d) => (
            <li key={d} className="text-[11px] text-text-secondary">
              · {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
