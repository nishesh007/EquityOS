"use client";

import type { PortfolioDiversificationView } from "@/lib/dashboard/institutional-portfolio-presentation";
import { PORTFOLIO_TONE_CLASS } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioSectorExposure({
  diversification,
}: {
  diversification: PortfolioDiversificationView;
}) {
  const items = diversification.sectorAllocation;

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-sector-exposure"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">Sector Exposure</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          {diversification.emptyMessage || "Insufficient Data"}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const width = Number.parseFloat(item.percent) || 0;
            return (
              <div key={item.label}>
                <div className="mb-0.5 flex justify-between text-[11px]">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className={PORTFOLIO_TONE_CLASS[item.tone]}>{item.percent}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-accent/60"
                    style={{ width: `${Math.min(100, Math.max(0, width))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
