"use client";

import type { PortfolioHeatCell } from "@/lib/dashboard/institutional-portfolio-presentation";
import { PORTFOLIO_TONE_CLASS } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioHeatmap({ cells }: { cells: PortfolioHeatCell[] }) {
  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-heatmap"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">Portfolio Heatmap</p>
      {cells.length === 0 ? (
        <p className="text-[11px] text-text-muted">Insufficient Data</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {cells.map((cell) => (
            <div
              key={cell.id}
              className="rounded-md border border-surface-border-subtle/70 px-2.5 py-2"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-accent, #3b82f6) ${Math.round(cell.intensity * 0.45)}%, transparent)`,
              }}
            >
              <p className="text-[10px] font-medium text-text-secondary">{cell.label}</p>
              <p className={`mt-0.5 text-xs font-semibold ${PORTFOLIO_TONE_CLASS[cell.tone]}`}>
                {cell.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
