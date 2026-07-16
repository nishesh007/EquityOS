/**
 * Query and creation registry over immutable recommendation storage.
 */

import type { RecommendationStorageStatus } from "./RecommendationMetadata";
import {
  createRecommendationSnapshot,
  type CreateRecommendationSnapshotInput,
  type RecommendationSnapshot,
} from "./RecommendationSnapshot";
import { RecommendationStorage } from "./RecommendationStorage";

export interface RecommendationQuery {
  company?: string;
  strategy?: string;
  status?: RecommendationStorageStatus | RecommendationStorageStatus[];
}

export class RecommendationRegistry {
  constructor(
    private readonly storage: RecommendationStorage = new RecommendationStorage()
  ) {}

  create(
    input: CreateRecommendationSnapshotInput,
    status: RecommendationStorageStatus = "ACTIVE"
  ): RecommendationSnapshot {
    return this.storage.store(createRecommendationSnapshot(input), status);
  }

  load(recommendationId: string): RecommendationSnapshot | undefined {
    return this.storage.load(recommendationId);
  }

  find(recommendationId: string): RecommendationSnapshot | undefined;
  find(query: RecommendationQuery): RecommendationSnapshot | undefined;
  find(
    identityOrQuery: string | RecommendationQuery
  ): RecommendationSnapshot | undefined {
    if (typeof identityOrQuery === "string") {
      return this.load(identityOrQuery);
    }
    return this.list(identityOrQuery)[0];
  }

  findByCompany(company: string): RecommendationSnapshot[] {
    return this.list({ company });
  }

  findByStrategy(strategy: string): RecommendationSnapshot[] {
    return this.list({ strategy });
  }

  findActive(): RecommendationSnapshot[] {
    return this.list({ status: "ACTIVE" });
  }

  findHistorical(): RecommendationSnapshot[] {
    return this.list({ status: "HISTORICAL" });
  }

  findExpired(): RecommendationSnapshot[] {
    return this.list({ status: "EXPIRED" });
  }

  findInvalidated(): RecommendationSnapshot[] {
    return this.list({ status: "INVALIDATED" });
  }

  latest(query: Omit<RecommendationQuery, "status"> = {}): RecommendationSnapshot | undefined {
    return this.list(query)[0];
  }

  history(company?: string): RecommendationSnapshot[] {
    return this.list(company ? { company } : {});
  }

  list(query: RecommendationQuery = {}): RecommendationSnapshot[] {
    const statuses = query.status
      ? new Set(
          Array.isArray(query.status) ? query.status : [query.status]
        )
      : undefined;
    const company = query.company?.trim().toUpperCase();
    const strategy = query.strategy?.trim().toUpperCase();

    return this.storage
      .list()
      .filter((snapshot) => {
        const status = this.storage.statusOf(snapshot.recommendationId);
        const companyMatches =
          !company ||
          snapshot.company.symbol.toUpperCase() === company ||
          snapshot.company.name.toUpperCase() === company;
        const strategyMatches =
          !strategy || snapshot.strategy.toUpperCase() === strategy;
        return (
          companyMatches &&
          strategyMatches &&
          (!statuses || (status !== undefined && statuses.has(status)))
        );
      })
      .sort(compareNewestFirst);
  }

  archive(recommendationId: string): RecommendationSnapshot | undefined {
    return this.storage.archive(recommendationId);
  }

  exists(recommendationId: string): boolean {
    return this.storage.exists(recommendationId);
  }

  statusOf(
    recommendationId: string
  ): RecommendationStorageStatus | undefined {
    return this.storage.statusOf(recommendationId);
  }

  clear(): void {
    this.storage.clear();
  }
}

function compareNewestFirst(
  left: RecommendationSnapshot,
  right: RecommendationSnapshot
): number {
  return (
    Date.parse(right.generatedAt) - Date.parse(left.generatedAt) ||
    right.recommendationId.localeCompare(left.recommendationId)
  );
}
