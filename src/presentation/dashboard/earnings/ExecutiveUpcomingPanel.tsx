"use client";

import { InstitutionalEarningsDashboardPanel } from "@/components/dashboard/earnings";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { EarningsDashboardMetrics } from "@/src/core/earnings/dashboard";
import { EXECUTIVE_EARNINGS_EMPTY } from "@/lib/dashboard/executive-earnings-presentation";
import { ExecutiveEmptyState } from "@/src/presentation/dashboard/earnings/ExecutiveEmptyState";

/** Composes R5 institutional dashboard — no duplicate ranking logic. */
export function ExecutiveUpcomingPanel({
  events,
  metrics = null,
}: {
  events: EarningsCalendarEvent[];
  metrics?: EarningsDashboardMetrics | null;
}) {
  if (events.length === 0) {
    return (
      <div id="executive-upcoming" data-testid="executive-upcoming-panel">
        <ExecutiveEmptyState message={EXECUTIVE_EARNINGS_EMPTY.noUpcoming} />
      </div>
    );
  }

  return (
    <div id="executive-upcoming" data-testid="executive-upcoming-panel">
      <InstitutionalEarningsDashboardPanel
        events={events}
        initialMetrics={metrics}
        pageSize={6}
      />
    </div>
  );
}
