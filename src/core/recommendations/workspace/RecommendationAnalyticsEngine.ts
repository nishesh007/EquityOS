/**
 * Recommendation Center analytics derived from composed workspace records.
 * Reuses stored outcomes/health — no duplicated conviction math.
 */

import type {
  RecommendationDistributionBucket,
  RecommendationWorkspaceAnalytics,
  RecommendationWorkspaceRecord,
} from "./RecommendationWorkspaceModels";
import { roundWorkspace } from "./RecommendationWorkspaceModels";

const SUCCESS_VERDICTS = new Set([
  "Outstanding",
  "Successful",
  "Partially Successful",
]);
const FAILURE_VERDICTS = new Set(["Failed", "Invalidated"]);

function groupRates(
  records: readonly RecommendationWorkspaceRecord[],
  selector: (record: RecommendationWorkspaceRecord) => string
): Array<{ key: string; successRate: number; count: number }> {
  const groups = new Map<string, RecommendationWorkspaceRecord[]>();
  for (const record of records) {
    const key = selector(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()]
    .map(([key, items]) => {
      const judged = items.filter((item) => item.institutionalVerdict != null);
      const successes = judged.filter(
        (item) =>
          item.institutionalVerdict != null &&
          SUCCESS_VERDICTS.has(item.institutionalVerdict)
      ).length;
      return {
        key,
        count: items.length,
        successRate:
          judged.length === 0
            ? 0
            : roundWorkspace((successes / judged.length) * 100),
      };
    })
    .sort(
      (left, right) =>
        right.successRate - left.successRate ||
        right.count - left.count ||
        left.key.localeCompare(right.key)
    );
}

function bestAndWorst(
  groups: Array<{ key: string; successRate: number; count: number }>
): { best: string | null; worst: string | null } {
  const eligible = groups.filter((group) => group.count >= 1);
  if (eligible.length === 0) return { best: null, worst: null };
  return {
    best: eligible[0].key,
    worst: eligible[eligible.length - 1].key,
  };
}

function distribution(
  records: readonly RecommendationWorkspaceRecord[]
): RecommendationDistributionBucket[] {
  const total = records.length || 1;
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = record.workspaceStatus;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) =>
      Object.freeze({
        key,
        count,
        percent: roundWorkspace((count / total) * 100),
      })
    )
    .sort((left, right) => right.count - left.count);
}

function averageHoldingLabel(
  records: readonly RecommendationWorkspaceRecord[]
): string | null {
  if (records.length === 0) return null;
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(
      record.holdingPeriod,
      (counts.get(record.holdingPeriod) ?? 0) + 1
    );
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildRecommendationAnalytics(
  records: readonly RecommendationWorkspaceRecord[]
): RecommendationWorkspaceAnalytics {
  const activeCount = records.filter(
    (record) =>
      record.workspaceStatus === "Active" ||
      record.workspaceStatus === "Running" ||
      record.workspaceStatus === "Pending"
  ).length;
  const completed = records.filter(
    (record) =>
      record.workspaceStatus === "Completed" ||
      record.workspaceStatus === "Expired" ||
      record.workspaceStatus === "Archived"
  );
  const judged = records.filter((record) => record.institutionalVerdict != null);
  const successes = judged.filter(
    (record) =>
      record.institutionalVerdict != null &&
      SUCCESS_VERDICTS.has(record.institutionalVerdict)
  ).length;
  const failures = judged.filter(
    (record) =>
      record.institutionalVerdict != null &&
      FAILURE_VERDICTS.has(record.institutionalVerdict)
  ).length;
  const returns = records
    .map((record) => record.currentReturnPercent)
    .filter((value): value is number => value != null && Number.isFinite(value));

  const strategies = groupRates(records, (record) => record.strategy);
  const sectors = groupRates(records, (record) => record.sector);
  const regimes = groupRates(records, (record) =>
    readRegime(record)
  );
  const strategyPair = bestAndWorst(strategies);
  const sectorPair = bestAndWorst(sectors);
  const regimePair = bestAndWorst(regimes);

  return Object.freeze({
    recommendationCount: records.length,
    activeCount,
    completedCount: completed.length,
    successRate:
      judged.length === 0
        ? 0
        : roundWorkspace((successes / judged.length) * 100),
    failureRate:
      judged.length === 0
        ? 0
        : roundWorkspace((failures / judged.length) * 100),
    averageReturn:
      returns.length === 0
        ? null
        : roundWorkspace(
            returns.reduce((sum, value) => sum + value, 0) / returns.length
          ),
    averageHoldingPeriod: averageHoldingLabel(records),
    bestStrategy: strategyPair.best,
    worstStrategy: strategyPair.worst,
    bestSector: sectorPair.best,
    worstSector: sectorPair.worst,
    bestMarketRegime: regimePair.best,
    recommendationDistribution: Object.freeze(distribution(records)),
  });
}

function readRegime(record: RecommendationWorkspaceRecord): string {
  const market = record.snapshot.marketSnapshot as Readonly<
    Record<string, unknown>
  >;
  const value = market.regime ?? market.marketRegime;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Unknown Regime";
}

export class RecommendationAnalyticsEngine {
  build = buildRecommendationAnalytics;
}
