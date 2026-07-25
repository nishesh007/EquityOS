"use client";

import { EventAwarenessBadgeRow } from "@/components/events/EventAwarenessBadges";
import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { buildPortfolioEventInsights } from "@/src/core/events/integration";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import type { PortfolioHolding } from "@/types";
import { Briefcase } from "lucide-react";
import { useMemo } from "react";

interface PortfolioEventImpactPanelProps {
  holdings: PortfolioHolding[];
}

/** Portfolio holdings × upcoming event catalysts (Sprint 10D.5). */
export function PortfolioEventImpactPanel({
  holdings,
}: PortfolioEventImpactPanelProps) {
  const drawer = useOptionalGlobalEventDrawer();
  const today = useMemo(() => toDateKey(new Date()), []);
  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);
  const insights = useMemo(
    () =>
      buildPortfolioEventInsights(
        catalog,
        holdings.map((h) => ({ symbol: h.symbol, name: h.name })),
        today
      ).filter((i) => i.primary != null),
    [catalog, holdings, today]
  );

  const risks = insights.flatMap((i) =>
    i.risks.slice(0, 1).map((m) => ({ insight: i, match: m }))
  );
  const opportunities = insights.flatMap((i) =>
    i.opportunities.slice(0, 1).map((m) => ({ insight: i, match: m }))
  );

  if (insights.length === 0) {
    return (
      <Card padding="md" data-testid="portfolio-event-impact">
        <CardHeader
          title="Portfolio Event Impact"
          subtitle="No upcoming catalysts mapped to your holdings"
        />
      </Card>
    );
  }

  return (
    <Card padding="md" data-testid="portfolio-event-impact">
      <CardHeader
        title="Portfolio Event Impact"
        subtitle="Upcoming risks and opportunities on your holdings"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Briefcase className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
            Your Holdings
          </p>
          <ul className="space-y-1.5">
            {insights.slice(0, 8).map((insight) => {
              const primary = insight.primary!;
              return (
                <li key={insight.symbol}>
                  <button
                    type="button"
                    onClick={() => drawer?.openEvent(primary.event)}
                    className="flex w-full items-start justify-between gap-2 rounded-md border border-surface-border-subtle/80 bg-surface/30 px-2.5 py-2 text-left transition-colors hover:bg-surface-hover/50"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-text-primary">
                        {insight.symbol}
                        <span className="ml-1.5 font-normal text-text-secondary">
                          {insight.name}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                        {primary.event.title}
                      </p>
                      <EventAwarenessBadgeRow
                        kinds={primary.awareness}
                        max={2}
                        className="mt-1.5"
                      />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[11px] font-semibold text-text-primary">
                        {primary.countdown.label}
                      </p>
                      {primary.impactScore != null ? (
                        <p className="text-[10px] text-text-secondary">
                          Impact {primary.impactScore}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-red-200">
              Potential Risks
            </p>
            {risks.length === 0 ? (
              <p className="mt-1 text-[11px] text-text-secondary">None flagged.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {risks.slice(0, 4).map(({ insight, match }) => (
                  <li key={`${insight.symbol}-${match.event.id}`}>
                    <button
                      type="button"
                      onClick={() => drawer?.openEvent(match.event)}
                      className="text-left text-[11px] text-text-primary hover:underline"
                    >
                      {insight.symbol} · {match.event.title} ·{" "}
                      {match.countdown.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
              Potential Opportunities
            </p>
            {opportunities.length === 0 ? (
              <p className="mt-1 text-[11px] text-text-secondary">None flagged.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {opportunities.slice(0, 4).map(({ insight, match }) => (
                  <li key={`${insight.symbol}-${match.event.id}`}>
                    <button
                      type="button"
                      onClick={() => drawer?.openEvent(match.event)}
                      className="text-left text-[11px] text-text-primary hover:underline"
                    >
                      {insight.symbol} · {match.event.title} ·{" "}
                      {match.countdown.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
