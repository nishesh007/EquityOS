/**
 * Smart filter engine — wraps calendar membership + scorecard signals.
 */

import { daysUntilResult } from "@/src/core/earnings/calendar";
import type {
  EarningsDashboardFilters,
  RankedEarningsItem,
  SmartFilterId,
} from "./EarningsDashboardModels";
import { isHighConvictionItem } from "./EarningsPriorityEngine";

function matchesSmartFilter(
  item: RankedEarningsItem,
  filter: SmartFilterId,
  now: Date
): boolean {
  const days = daysUntilResult(item.event.resultDate, now);
  switch (filter) {
    case "today":
      return days === 0;
    case "tomorrow":
      return days === 1;
    case "this_week":
      return days != null && days >= 0 && days <= 7;
    case "next_month":
      return days != null && days >= 0 && days <= 30;
    case "portfolio":
      return item.event.inPortfolio;
    case "watchlist":
      return item.event.inWatchlist;
    case "high_conviction":
      return isHighConvictionItem(item);
    case "high_impact":
      return item.event.highImpact;
    case "large_cap":
      return item.event.marketCapBucket === "large";
    case "mid_cap":
      return item.event.marketCapBucket === "mid";
    case "small_cap":
      return (
        item.event.marketCapBucket === "small" ||
        item.event.marketCapBucket === "micro"
      );
    case "bullish":
      return item.scorecard.outlook === "Bullish";
    case "bearish":
      return item.scorecard.outlook === "Bearish";
    case "high_risk":
      return item.scorecard.riskScore >= 65;
    case "low_risk":
      return item.scorecard.riskScore <= 40;
    case "high_beat_probability":
      return item.scorecard.beatProbability >= 60;
    case "transcript_available":
      return item.scorecard.transcriptAvailable;
    case "results_released":
      return item.scorecard.resultsReleased;
    default:
      return true;
  }
}

export function filterEarnings(
  items: readonly RankedEarningsItem[],
  filters: EarningsDashboardFilters = {},
  now = new Date()
): RankedEarningsItem[] {
  const smart = filters.smartFilters ?? [];
  return items.filter((item) => {
    if (filters.exchange && item.event.exchange !== filters.exchange) {
      return false;
    }
    if (filters.sector && item.event.sector !== filters.sector) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      if (
        q &&
        !item.event.companyName.toLowerCase().includes(q) &&
        !item.event.ticker.toLowerCase().includes(q) &&
        !item.event.sector.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (smart.length > 0) {
      // AND across selected smart filters
      for (const f of smart) {
        if (!matchesSmartFilter(item, f, now)) return false;
      }
    }
    return true;
  });
}
