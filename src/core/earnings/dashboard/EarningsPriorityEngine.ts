/**
 * Priority engine — attention / priority tier helpers for institutional ranking.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import { daysUntilResult } from "@/src/core/earnings/calendar";
import type { EarningsScorecard, RankedEarningsItem } from "./EarningsDashboardModels";

export function computePriorityBoost(
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard,
  now = new Date()
): number {
  let boost = 0;
  const days = daysUntilResult(event.resultDate, now);
  if (days === 0) boost += 12;
  else if (days === 1) boost += 8;
  else if (days != null && days <= 7) boost += 4;

  if (event.inPortfolio) boost += 10;
  if (event.inWatchlist) boost += 6;
  if (event.highImpact) boost += 8;
  if (event.highConviction) boost += 7;
  if (scorecard.transcriptAvailable) boost += 3;
  if (scorecard.resultsReleased) boost += 2;
  return boost;
}

export function applyPriorityBoost(
  items: RankedEarningsItem[],
  now = new Date()
): RankedEarningsItem[] {
  return items.map((item) => {
    const boost = computePriorityBoost(item.event, item.scorecard, now);
    const institutionalScore = Math.min(
      100,
      item.scorecard.institutionalScore + boost
    );
    return {
      ...item,
      scorecard: {
        ...item.scorecard,
        institutionalScore,
      },
    };
  });
}

export function isHighConvictionItem(item: RankedEarningsItem): boolean {
  return (
    item.event.highConviction ||
    (item.scorecard.aiConfidence >= 70 &&
      item.scorecard.beatProbability >= 55 &&
      item.scorecard.outlook === "Bullish")
  );
}
