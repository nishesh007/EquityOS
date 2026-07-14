"use client";

import type { PortfolioRiskView } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioRiskPanel({ risk }: { risk: PortfolioRiskView }) {
  if (risk.empty) {
    return (
      <div
        className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
        data-testid="portfolio-risk-empty"
      >
        <p className="text-xs font-semibold text-text-primary">Portfolio Risk</p>
        <p className="mt-2 text-[11px] text-text-muted">{risk.emptyMessage}</p>
      </div>
    );
  }

  const rows = [
    { label: "Sector Concentration", value: risk.sectorConcentration },
    { label: "Market Cap Distribution", value: risk.marketCapDistribution },
    { label: "Position Size Risk", value: risk.positionSizeRisk },
    { label: "Single Stock Risk", value: risk.singleStockRisk },
    { label: "Liquidity Risk", value: risk.liquidityRisk },
    { label: "Volatility Risk", value: risk.volatilityRisk },
  ];

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-risk-panel"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">Portfolio Risk</p>
      <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">
        {risk.riskSummary}
      </p>
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
      {risk.metrics.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {risk.metrics.map((m) => (
            <div
              key={m.id}
              className="rounded-md border border-surface-border-subtle/60 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-text-primary">{m.label}</p>
                <p className={`text-[11px] font-semibold ${m.toneClass}`}>{m.value}</p>
              </div>
              {m.detail ? (
                <p className="mt-1 text-[10px] text-text-faint">{m.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
