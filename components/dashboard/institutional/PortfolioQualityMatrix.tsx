"use client";

import type { PortfolioQualityRow } from "@/lib/dashboard/institutional-portfolio-presentation";
import { PORTFOLIO_TONE_CLASS } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioQualityMatrix({
  rows,
}: {
  rows: PortfolioQualityRow[];
}) {
  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-quality-matrix"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">Portfolio Quality Matrix</p>
      {rows.length === 0 ? (
        <p className="text-[11px] text-text-muted">No Portfolio</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider text-text-faint">
                <th className="px-2 py-1.5 font-medium">Holding</th>
                <th className="px-2 py-1.5 font-medium">Institutional Grade</th>
                <th className="px-2 py-1.5 font-medium">Validation</th>
                <th className="px-2 py-1.5 font-medium">Trust</th>
                <th className="px-2 py-1.5 font-medium">AI Confidence</th>
                <th className="px-2 py-1.5 font-medium">Risk</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.symbol}
                  className="border-t border-surface-border-subtle/50"
                  data-testid={`portfolio-quality-row-${row.symbol}`}
                >
                  <td className="px-2 py-2">
                    <p className="font-semibold text-text-primary">{row.symbol}</p>
                    <p className="text-[10px] text-text-faint">{row.name}</p>
                  </td>
                  <td className={`px-2 py-2 ${PORTFOLIO_TONE_CLASS[row.tone]}`}>
                    {row.institutionalGrade}
                  </td>
                  <td className="px-2 py-2 text-text-secondary">{row.validation}</td>
                  <td className="px-2 py-2 text-text-secondary">{row.trust}</td>
                  <td className="px-2 py-2 text-text-secondary">{row.aiConfidence}</td>
                  <td className="px-2 py-2 text-text-secondary">{row.risk}</td>
                  <td className="px-2 py-2 text-text-secondary">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
