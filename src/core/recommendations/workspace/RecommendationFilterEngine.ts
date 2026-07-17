/**
 * Institutional recommendation filters for the Recommendation Center.
 */

import {
  asArray,
  holdingFilterForPeriod,
  type RecommendationFilterCriteria,
  type RecommendationWorkspaceRecord,
  type WorkspaceHoldingFilter,
  type WorkspaceStatusFilter,
} from "./RecommendationWorkspaceModels";

function matchesStatus(
  record: RecommendationWorkspaceRecord,
  statuses: WorkspaceStatusFilter[]
): boolean {
  if (statuses.length === 0) return true;
  return statuses.some((status) => {
    if (status === "Active") {
      return (
        record.workspaceStatus === "Active" ||
        record.workspaceStatus === "Running"
      );
    }
    if (status === "Running") {
      return (
        record.workspaceStatus === "Running" ||
        record.workspaceStatus === "Active"
      );
    }
    return record.workspaceStatus === status;
  });
}

function matchesHolding(
  record: RecommendationWorkspaceRecord,
  holdings: WorkspaceHoldingFilter[]
): boolean {
  if (holdings.length === 0) return true;
  const mapped = holdingFilterForPeriod(record.holdingPeriod);
  if (!mapped) {
    return holdings.some((holding) =>
      record.strategy.toLowerCase().includes(holding.toLowerCase())
    );
  }
  return holdings.includes(mapped);
}

export function filterRecommendationRecords(
  records: readonly RecommendationWorkspaceRecord[],
  criteria: RecommendationFilterCriteria = {}
): RecommendationWorkspaceRecord[] {
  const statuses = asArray(criteria.status);
  const holdings = asArray(criteria.holdingPeriod);
  const health = asArray(criteria.health);
  const outcomes = asArray(criteria.outcome);
  const strategies = asArray(criteria.strategy);

  return records.filter((record) => {
    if (!matchesStatus(record, statuses)) return false;
    if (!matchesHolding(record, holdings)) return false;
    if (
      health.length > 0 &&
      (record.healthState == null ||
        !health.includes(
          record.healthState as (typeof health)[number]
        ))
    ) {
      return false;
    }
    if (
      outcomes.length > 0 &&
      (record.institutionalVerdict == null ||
        !outcomes.includes(record.institutionalVerdict))
    ) {
      return false;
    }
    if (
      strategies.length > 0 &&
      !strategies.some((strategy) =>
        record.strategy.toLowerCase().includes(strategy.toLowerCase())
      )
    ) {
      return false;
    }
    return true;
  });
}

export class RecommendationFilterEngine {
  filter = filterRecommendationRecords;
}
