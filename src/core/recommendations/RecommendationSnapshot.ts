/**
 * Immutable point-in-time memory of a recommendation.
 */

import { generateRecommendationId } from "./RecommendationIdentity";
import {
  expectedHoldingPeriodForStrategy,
  normalizeRecommendationLifecycleStatus,
  normalizeRecommendationStrategy,
  type EngineSnapshot,
  type RecommendationCompany,
  type RecommendationLifecycleStatus,
  type RecommendationMetadata,
  type RecommendationPriceRange,
  type RecommendationTarget,
  type RecommendationValidation,
} from "./RecommendationMetadata";

export type Immutable<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly Immutable<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Immutable<T[K]> }
        : T;

export interface RecommendationSnapshot {
  readonly recommendationId: string;
  readonly company: Immutable<RecommendationCompany>;
  readonly strategy: string;
  readonly expectedHoldingPeriod: string;
  readonly recommendationStatus: RecommendationLifecycleStatus;
  readonly generatedAt: string;
  readonly generatedByEngine: string;
  readonly aiVersion: string;
  readonly originalConviction: number;
  readonly originalTrust: number;
  readonly originalValidation: Immutable<RecommendationValidation>;
  readonly entryRange: Immutable<RecommendationPriceRange>;
  readonly stopLoss: number;
  readonly targets: readonly Immutable<RecommendationTarget>[];
  readonly riskReward: number;
  readonly reasons: readonly string[];
  readonly convictionDrivers: readonly string[];
  readonly riskFactors: readonly string[];
  readonly technicalSnapshot: Immutable<EngineSnapshot>;
  readonly fundamentalSnapshot: Immutable<EngineSnapshot>;
  readonly marketSnapshot: Immutable<EngineSnapshot>;
  readonly sectorSnapshot: Immutable<EngineSnapshot>;
  readonly portfolioStatus: RecommendationMetadata["portfolioStatus"];
  readonly watchlistStatus: RecommendationMetadata["watchlistStatus"];
}

export interface CreateRecommendationSnapshotInput {
  company: RecommendationCompany;
  strategy: string;
  expectedHoldingPeriod?: string;
  recommendationStatus?: RecommendationLifecycleStatus | string;
  generatedAt?: string | Date;
  generatedByEngine: string;
  aiVersion: string;
  originalConviction: number;
  originalTrust: number;
  originalValidation: RecommendationValidation;
  entryRange: RecommendationPriceRange;
  stopLoss: number;
  targets: RecommendationTarget[];
  riskReward: number;
  reasons?: string[];
  convictionDrivers?: string[];
  riskFactors?: string[];
  technicalSnapshot: EngineSnapshot;
  fundamentalSnapshot: EngineSnapshot;
  marketSnapshot: EngineSnapshot;
  sectorSnapshot: EngineSnapshot;
  portfolioStatus?: RecommendationMetadata["portfolioStatus"];
  watchlistStatus?: RecommendationMetadata["watchlistStatus"];
}

export function createRecommendationSnapshot(
  input: CreateRecommendationSnapshotInput
): RecommendationSnapshot {
  const generatedAt = normalizeTimestamp(input.generatedAt);
  const company = {
    ...input.company,
    symbol: requiredText(input.company.symbol, "Company symbol"),
    name: requiredText(input.company.name, "Company name"),
  };
  const generatedByEngine = requiredText(
    input.generatedByEngine,
    "Recommendation engine"
  );
  const strategy = normalizeRecommendationStrategy(
    requiredText(input.strategy, "Recommendation strategy")
  );
  const expectedHoldingPeriod = requiredText(
    input.expectedHoldingPeriod?.trim() ||
      expectedHoldingPeriodForStrategy(strategy),
    "Expected holding period"
  );
  const convictionDrivers = normalizeFactorList(
    input.convictionDrivers ?? input.reasons,
    "Conviction drivers"
  );
  const riskFactors = normalizeOptionalList(input.riskFactors);
  const reasons =
    input.reasons && input.reasons.length > 0
      ? normalizeOptionalList(input.reasons)
      : [...convictionDrivers];

  const snapshot: RecommendationSnapshot = {
    recommendationId: generateRecommendationId({
      symbol: company.symbol,
      engine: generatedByEngine,
      generatedAt,
    }),
    company,
    strategy,
    expectedHoldingPeriod,
    recommendationStatus: normalizeRecommendationLifecycleStatus(
      input.recommendationStatus
    ),
    generatedAt,
    generatedByEngine,
    aiVersion: requiredText(input.aiVersion, "AI version"),
    originalConviction: input.originalConviction,
    originalTrust: input.originalTrust,
    originalValidation: input.originalValidation,
    entryRange: input.entryRange,
    stopLoss: input.stopLoss,
    targets: input.targets,
    riskReward: input.riskReward,
    reasons,
    convictionDrivers,
    riskFactors,
    technicalSnapshot: input.technicalSnapshot,
    fundamentalSnapshot: input.fundamentalSnapshot,
    marketSnapshot: input.marketSnapshot,
    sectorSnapshot: input.sectorSnapshot,
    portfolioStatus: input.portfolioStatus ?? "UNKNOWN",
    watchlistStatus: input.watchlistStatus ?? "UNKNOWN",
  };

  return cloneAndFreeze(snapshot);
}

function normalizeTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Recommendation generated timestamp is invalid");
  }
  return date.toISOString();
}

function requiredText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function normalizeOptionalList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean);
}

function normalizeFactorList(
  values: string[] | undefined,
  label: string
): string[] {
  const normalized = normalizeOptionalList(values);
  if (normalized.length === 0) {
    throw new Error(`${label} are required`);
  }
  return normalized;
}

function cloneAndFreeze<T>(
  value: T,
  clones = new WeakMap<object, unknown>(),
  visiting = new WeakSet<object>()
): T {
  if (value === null || typeof value !== "object") return value;
  if (visiting.has(value)) {
    throw new Error("Recommendation snapshots cannot contain circular values");
  }
  if (clones.has(value)) return clones.get(value) as T;
  visiting.add(value);

  if (value instanceof Date) {
    const clone = Object.freeze(new Date(value.getTime())) as T;
    clones.set(value, clone);
    visiting.delete(value);
    return clone;
  }

  if (Array.isArray(value)) {
    const clone = value.map((item) =>
      cloneAndFreeze(item, clones, visiting)
    );
    const frozen = Object.freeze(clone) as T;
    clones.set(value, frozen);
    visiting.delete(value);
    return frozen;
  }

  const clone: Record<PropertyKey, unknown> = {};
  clones.set(value, clone);
  for (const key of Reflect.ownKeys(value)) {
    clone[key] = cloneAndFreeze(
      (value as Record<PropertyKey, unknown>)[key],
      clones,
      visiting
    );
  }
  const frozen = Object.freeze(clone) as T;
  clones.set(value, frozen);
  visiting.delete(value);
  return frozen;
}
