"use client";

import type { PortfolioRecommendationItem } from "@/lib/dashboard/institutional-portfolio-presentation";
import { PORTFOLIO_TONE_CLASS } from "@/lib/dashboard/institutional-portfolio-presentation";

const CATEGORY_ORDER = [
  "Reduce Exposure",
  "Increase Exposure",
  "Review Position",
  "Watch Closely",
  "High Conviction",
  "Low Trust",
  "Validation Pending",
] as const;

export function PortfolioRecommendationPanel({
  recommendations,
}: {
  recommendations: PortfolioRecommendationItem[];
}) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: recommendations.filter((r) => r.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="portfolio-recommendation-panel"
    >
      <p className="mb-3 text-xs font-semibold text-text-primary">
        Portfolio Recommendations
      </p>
      {grouped.length === 0 ? (
        <p className="text-[11px] text-text-muted">Awaiting Validation</p>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                {group.category}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-surface-border-subtle/60 bg-surface-raised/30 px-2.5 py-2"
                    data-testid={`portfolio-rec-${item.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-[11px] font-semibold ${PORTFOLIO_TONE_CLASS[item.tone]}`}>
                        {item.title}
                      </p>
                      <span className="text-[9px] uppercase tracking-wider text-text-faint">
                        {item.priority}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-text-muted">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
