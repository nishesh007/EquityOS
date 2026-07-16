/**
 * In-memory storage abstraction for immutable snapshots.
 * Bucket transitions move references; snapshot contents are never rewritten.
 */

import type { RecommendationStorageStatus } from "./RecommendationMetadata";
import type { RecommendationSnapshot } from "./RecommendationSnapshot";

export class RecommendationStorage {
  private readonly snapshots = new Map<string, RecommendationSnapshot>();
  private readonly statuses = new Map<string, RecommendationStorageStatus>();

  store(
    snapshot: RecommendationSnapshot,
    status: RecommendationStorageStatus = "ACTIVE"
  ): RecommendationSnapshot {
    if (this.snapshots.has(snapshot.recommendationId)) {
      throw new Error(
        `Recommendation ${snapshot.recommendationId} already exists`
      );
    }
    this.snapshots.set(snapshot.recommendationId, snapshot);
    this.statuses.set(snapshot.recommendationId, status);
    return snapshot;
  }

  load(recommendationId: string): RecommendationSnapshot | undefined {
    return this.snapshots.get(recommendationId);
  }

  exists(recommendationId: string): boolean {
    return this.snapshots.has(recommendationId);
  }

  statusOf(
    recommendationId: string
  ): RecommendationStorageStatus | undefined {
    return this.statuses.get(recommendationId);
  }

  list(status?: RecommendationStorageStatus): RecommendationSnapshot[] {
    const snapshots = [...this.snapshots.values()];
    if (!status) return snapshots;
    return snapshots.filter(
      (snapshot) => this.statuses.get(snapshot.recommendationId) === status
    );
  }

  move(
    recommendationId: string,
    status: RecommendationStorageStatus
  ): RecommendationSnapshot | undefined {
    const snapshot = this.snapshots.get(recommendationId);
    if (!snapshot) return undefined;
    this.statuses.set(recommendationId, status);
    return snapshot;
  }

  archive(recommendationId: string): RecommendationSnapshot | undefined {
    return this.move(recommendationId, "ARCHIVED");
  }

  active(): RecommendationSnapshot[] {
    return this.list("ACTIVE");
  }

  historical(): RecommendationSnapshot[] {
    return this.list("HISTORICAL");
  }

  expired(): RecommendationSnapshot[] {
    return this.list("EXPIRED");
  }

  invalidated(): RecommendationSnapshot[] {
    return this.list("INVALIDATED");
  }

  archived(): RecommendationSnapshot[] {
    return this.list("ARCHIVED");
  }

  clear(): void {
    this.snapshots.clear();
    this.statuses.clear();
  }

  get size(): number {
    return this.snapshots.size;
  }
}
