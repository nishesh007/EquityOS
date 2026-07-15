/**
 * Ranking / sort engine for institutional earnings dashboard.
 */

import type {
  DashboardSortKey,
  RankedEarningsItem,
} from "./EarningsDashboardModels";

function marketCapOrder(bucket: RankedEarningsItem["event"]["marketCapBucket"]): number {
  switch (bucket) {
    case "large":
      return 0;
    case "mid":
      return 1;
    case "small":
      return 2;
    case "micro":
      return 3;
    default:
      return 4;
  }
}

export function sortEarnings(
  items: readonly RankedEarningsItem[],
  sortBy: DashboardSortKey = "institutional_rank"
): RankedEarningsItem[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "ai_score":
      case "institutional_rank":
        cmp = b.scorecard.institutionalScore - a.scorecard.institutionalScore;
        break;
      case "beat_probability":
        cmp = b.scorecard.beatProbability - a.scorecard.beatProbability;
        break;
      case "confidence":
        cmp = b.scorecard.aiConfidence - a.scorecard.aiConfidence;
        break;
      case "expected_volatility":
        cmp =
          b.scorecard.expectedVolatilityScore -
          a.scorecard.expectedVolatilityScore;
        break;
      case "historical_beat_rate":
        cmp = b.scorecard.historicalBeatRate - a.scorecard.historicalBeatRate;
        break;
      case "market_cap":
        cmp =
          marketCapOrder(a.event.marketCapBucket) -
          marketCapOrder(b.event.marketCapBucket);
        break;
      case "alphabetical":
        cmp = a.event.companyName.localeCompare(b.event.companyName);
        break;
      case "date":
      default:
        cmp = a.event.resultDate.localeCompare(b.event.resultDate);
        break;
    }
    if (cmp === 0) {
      cmp = b.scorecard.institutionalScore - a.scorecard.institutionalScore;
    }
    if (cmp === 0) cmp = a.event.ticker.localeCompare(b.event.ticker);
    return cmp;
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export function getRankedEarnings(
  items: readonly RankedEarningsItem[],
  sortBy: DashboardSortKey = "institutional_rank"
): RankedEarningsItem[] {
  return sortEarnings(items, sortBy);
}
