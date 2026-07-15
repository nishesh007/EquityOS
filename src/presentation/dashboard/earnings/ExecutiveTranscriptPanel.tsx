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
import { FileText } from "lucide-react";

/** Surfaces transcript-ready / pending namesake via existing intelligence host. */
export function ExecutiveTranscriptPanel({
  events,
}: {
  events: EarningsCalendarEvent[];
}) {
  const cards = useMemo(() => {
    const engine = getEarningsDashboardEngine();
    const scored = engine.scoreAll(events);
    const withSignal = scored.filter(
      (item) =>
        item.scorecard.transcriptAvailable || item.scorecard.resultsReleased
    );
    return withSignal
      .slice(0, 8)
      .map((item) => toEarningsCardView(item.event));
  }, [events]);

  return (
    <div id="executive-transcript" data-testid="executive-transcript-panel">
      <Card padding="lg">
        <CardHeader
          title="Transcript Intelligence"
          subtitle="Reuses Sprint 9B transcript + AI preview drawers"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <FileText className="h-4 w-4 text-accent" />
            </div>
          }
        />
        {cards.length === 0 ? (
          <ExecutiveEmptyState
            message={EXECUTIVE_EARNINGS_EMPTY.transcriptPending}
          />
        ) : (
          <EarningsIntelligenceHost
            cards={cards}
            compact
            emptyMessage={EXECUTIVE_EARNINGS_EMPTY.transcriptPending}
          />
        )}
      </Card>
    </div>
  );
}
