/**
 * Institutional recommendation search over composed workspace records.
 */

import type {
  RecommendationSearchCriteria,
  RecommendationWorkspaceRecord,
} from "./RecommendationWorkspaceModels";

function includesText(haystack: string, needle?: string): boolean {
  if (!needle?.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function includesAny(
  values: readonly string[],
  needle?: string | readonly string[]
): boolean {
  if (needle == null) return true;
  const needles = Array.isArray(needle)
    ? needle.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : [String(needle).trim().toLowerCase()].filter(Boolean);
  if (needles.length === 0) return true;
  const haystack = values.map((value) => value.toLowerCase());
  return needles.some((item) =>
    haystack.some((value) => value.includes(item) || item.includes(value))
  );
}

function matchesDate(
  generatedAt: string,
  recommendationDate?: string
): boolean {
  if (!recommendationDate?.trim()) return true;
  const needle = recommendationDate.trim();
  return (
    generatedAt.startsWith(needle) ||
    generatedAt.slice(0, 10) === needle.slice(0, 10)
  );
}

export function searchRecommendationRecords(
  records: readonly RecommendationWorkspaceRecord[],
  criteria: RecommendationSearchCriteria = {}
): RecommendationWorkspaceRecord[] {
  const query = criteria.query?.trim().toLowerCase();

  return records.filter((record) => {
    if (query) {
      const haystack = [
        record.companyName,
        record.ticker,
        record.sector,
        record.industry,
        record.strategy,
        record.lifecycleStatus,
        record.holdingPeriod,
        record.recommendationDate,
        record.outcomeState ?? "",
        record.institutionalVerdict ?? "",
        record.aiVersion,
        ...record.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return (
      includesText(record.companyName, criteria.companyName) &&
      includesText(record.ticker, criteria.ticker) &&
      includesText(record.sector, criteria.sector) &&
      includesText(record.industry, criteria.industry) &&
      includesText(record.strategy, criteria.strategy) &&
      includesText(record.lifecycleStatus, criteria.lifecycleStatus) &&
      includesText(record.holdingPeriod, criteria.holdingPeriod) &&
      matchesDate(record.recommendationDate, criteria.recommendationDate) &&
      includesText(record.outcomeState ?? "", criteria.outcome) &&
      includesText(
        record.institutionalVerdict ?? "",
        criteria.institutionalVerdict
      ) &&
      includesAny(record.tags, criteria.tags) &&
      includesText(record.aiVersion, criteria.aiVersion)
    );
  });
}

export class RecommendationSearchEngine {
  search = searchRecommendationRecords;
}
