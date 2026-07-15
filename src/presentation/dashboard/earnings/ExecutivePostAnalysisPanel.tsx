"use client";

import { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsIntelligenceHost } from "@/components/dashboard/earnings/EarningsIntelligenceHost";
import {
  toEarningsCardView,
  type EarningsCalendarEvent,
} from "@/src/core/earnings/calendar";
import { getEarningsDashboardEngine } from "@/src/core/earnings/dashboard";
import { EXECUTIVE_EARNINGS_EMPTY } from "@/lib/dashboard/executive-earnings-presentation";
import { ExecutiveEmptyState } from "@/src/presentation/dashboard/earnings/ExecutiveEmptyState";
import { LineChart } from "lucide-react";

/** Surfaces released results via existing post-earnings host path. */
export function ExecutivePostAnalysisPanel({
  events,
}: {
  events: EarningsCalendarEvent[];
}) {
  const cards = useMemo(() => {
    const engine = getEarningsDashboardEngine();
    const scored = engine.scoreAll(events);
    return scored
      .filter((item) => item.scorecard.resultsReleased)
      .slice(0, 8)
      .map((item) => toEarningsCardView(item.event));
  }, [events]);

  return (
    <div id="executive-post-analysis" data-testid="executive-post-analysis-panel">
      <Card padding="lg">
        <CardHeader
          title="Post Earnings Analysis"
          subtitle="Reuses Sprint 9B post-analysis drawers"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <LineChart className="h-4 w-4 text-accent" />
            </div>
          }
        />
        {cards.length === 0 ? (
          <ExecutiveEmptyState message={EXECUTIVE_EARNINGS_EMPTY.awaitingAi} />
        ) : (
          <EarningsIntelligenceHost
            cards={cards}
            compact
            emptyMessage={EXECUTIVE_EARNINGS_EMPTY.awaitingAi}
          />
        )}
      </Card>
    </div>
  );
}
