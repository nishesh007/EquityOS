"use client";

import type { PortfolioDiversificationView } from "@/lib/dashboard/institutional-portfolio-presentation";
import { PORTFOLIO_TONE_CLASS } from "@/lib/dashboard/institutional-portfolio-presentation";

export function PortfolioDiversificationPanel({
  diversification,
}: {
  diversification: PortfolioDiversificationView;
}) {
  if (diversification.empty) {
    return (
      <div
        className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
        data-testid="portfolio-diversification-empty"
      >
        <p className="text-xs font-semibold text-text-primary">Portfolio Diversification</p>
        <p className="mt-2 text-[11px] text-text-muted">{diversification.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-diversification-panel"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">
        Portfolio Diversification
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Holdings" value={diversification.numberOfHoldings} />
        <Stat label="Large Cap" value={diversification.largeCap} />
        <Stat label="Mid Cap" value={diversification.midCap} />
        <Stat label="Small Cap" value={diversification.smallCap} />
        <Stat label="Top Concentration" value={diversification.topConcentration} />
        <Stat label="Diversification Rating" value={diversification.diversificationRating} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AllocationList title="Sector Allocation" items={diversification.sectorAllocation} />
        <AllocationList
          title="Industry Allocation"
          items={diversification.industryAllocation}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function AllocationList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; percent: string; tone: keyof typeof PORTFOLIO_TONE_CLASS }>;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={`${title}-${item.label}`}
            className="flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="text-text-secondary">{item.label}</span>
            <span className={`font-semibold tabular-nums ${PORTFOLIO_TONE_CLASS[item.tone]}`}>
              {item.percent}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
