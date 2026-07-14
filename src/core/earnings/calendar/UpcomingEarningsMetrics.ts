/**
 * Upcoming earnings metrics tracker — operational counters for the calendar.
 */

import { buildCoverageMetrics } from "./EarningsCoverageEngine";
import type {
  EarningsCalendarEvent,
  EarningsCalendarMetrics,
} from "./InstitutionalEarningsModels";

export interface MetricsTrackerSnapshot extends EarningsCalendarMetrics {
  lastUpdatedAt: string | null;
  universeSize: number;
}

export class UpcomingEarningsMetricsTracker {
  private lastUpdatedAt: string | null = null;
  private universeSize = 0;
  private snapshot: EarningsCalendarMetrics | null = null;

  reset(): void {
    this.lastUpdatedAt = null;
    this.universeSize = 0;
    this.snapshot = null;
  }

  record(
    events: readonly EarningsCalendarEvent[],
    options: {
      universeSize: number;
      portfolioSymbols?: readonly string[];
      watchlistSymbols?: readonly string[];
      now?: Date;
    }
  ): EarningsCalendarMetrics {
    this.universeSize = options.universeSize;
    this.snapshot = buildCoverageMetrics({
      universeSize: options.universeSize,
      events,
      portfolioSymbols: options.portfolioSymbols,
      watchlistSymbols: options.watchlistSymbols,
      now: options.now,
    });
    this.lastUpdatedAt = new Date().toISOString();
    return this.snapshot;
  }

  getSnapshot(): MetricsTrackerSnapshot {
    return {
      companiesCovered: this.snapshot?.companiesCovered ?? 0,
      todaysEarnings: this.snapshot?.todaysEarnings ?? 0,
      tomorrowsEarnings: this.snapshot?.tomorrowsEarnings ?? 0,
      nextWeekEarnings: this.snapshot?.nextWeekEarnings ?? 0,
      portfolioEarnings: this.snapshot?.portfolioEarnings ?? 0,
      watchlistEarnings: this.snapshot?.watchlistEarnings ?? 0,
      highImpactResults: this.snapshot?.highImpactResults ?? 0,
      coveragePercent: this.snapshot?.coveragePercent ?? 0,
      coverageLabel: this.snapshot?.coverageLabel ?? "Awaiting Exchange Schedule",
      lastUpdatedAt: this.lastUpdatedAt,
      universeSize: this.universeSize,
    };
  }
}

export function formatMetricValue(
  value: number | null | undefined,
  emptyLabel = "—"
): string {
  if (value == null || !Number.isFinite(value)) return emptyLabel;
  return String(Math.max(0, Math.round(value)));
}
