/**
 * Recommendation Snapshot Engine & Immutable AI Memory public API.
 */

import type { RecommendationStorageStatus } from "./RecommendationMetadata";
import {
  RecommendationRegistry,
  type RecommendationQuery,
} from "./RecommendationRegistry";
import type {
  CreateRecommendationSnapshotInput,
  RecommendationSnapshot,
} from "./RecommendationSnapshot";

export * from "./RecommendationIdentity";
export * from "./RecommendationMetadata";
export * from "./RecommendationPresentationModels";
export * from "./RecommendationRegistry";
export * from "./RecommendationSnapshot";
export * from "./RecommendationStorage";

const recommendationRegistry = new RecommendationRegistry();

export function createRecommendation(
  input: CreateRecommendationSnapshotInput,
  status: RecommendationStorageStatus = "ACTIVE"
): RecommendationSnapshot {
  return recommendationRegistry.create(input, status);
}

export function loadRecommendation(
  recommendationId: string
): RecommendationSnapshot | undefined {
  return recommendationRegistry.load(recommendationId);
}

export function findRecommendation(
  recommendationId: string
): RecommendationSnapshot | undefined;
export function findRecommendation(
  query: RecommendationQuery
): RecommendationSnapshot | undefined;
export function findRecommendation(
  identityOrQuery: string | RecommendationQuery
): RecommendationSnapshot | undefined {
  return typeof identityOrQuery === "string"
    ? recommendationRegistry.find(identityOrQuery)
    : recommendationRegistry.find(identityOrQuery);
}

export function findCompanyRecommendations(
  company: string
): RecommendationSnapshot[] {
  return recommendationRegistry.findByCompany(company);
}

export function listRecommendations(
  query: RecommendationQuery = {}
): RecommendationSnapshot[] {
  return recommendationRegistry.list(query);
}

export function archiveRecommendation(
  recommendationId: string
): RecommendationSnapshot | undefined {
  return recommendationRegistry.archive(recommendationId);
}

export function getLatestRecommendation(
  query: Omit<RecommendationQuery, "status"> = {}
): RecommendationSnapshot | undefined {
  return recommendationRegistry.latest(query);
}

export function recommendationExists(recommendationId: string): boolean {
  return recommendationRegistry.exists(recommendationId);
}

/** Clears the process-local registry, primarily for isolated application/test scopes. */
export function resetRecommendationRegistry(): void {
  recommendationRegistry.clear();
}
