/**
 * Metadata and composed value objects for immutable recommendation snapshots.
 * Values are supplied by existing engines; this module never recalculates them.
 */

import type { ValidationResponse } from "../dataIntegrity/orchestrator/ValidationResponse";

export type RecommendationStorageStatus =
  | "ACTIVE"
  | "HISTORICAL"
  | "EXPIRED"
  | "INVALIDATED"
  | "ARCHIVED";

/** Canonical recommendation strategies (display labels). */
export const RECOMMENDATION_STRATEGIES = [
  "Intraday",
  "Swing",
  "Positional",
  "Long Term",
  "Dividend",
  "Value",
  "Turnaround",
  "Momentum",
] as const;

export type RecommendationStrategy = (typeof RECOMMENDATION_STRATEGIES)[number];

/**
 * Mandatory expected holding periods.
 * Targets without a time horizon are incomplete.
 */
export const EXPECTED_HOLDING_PERIODS = {
  Intraday: "Today only",
  Swing: "5–15 Trading Days",
  Positional: "2–8 Weeks",
  "Long Term": "6–24 Months",
  Dividend: "6–24 Months",
  Value: "6–24 Months",
  Turnaround: "2–8 Weeks",
  Momentum: "5–15 Trading Days",
} as const satisfies Record<RecommendationStrategy, string>;

export type ExpectedHoldingPeriod =
  (typeof EXPECTED_HOLDING_PERIODS)[RecommendationStrategy];

/**
 * Recommendation lifecycle status for display.
 * Performance outcomes live on the lifecycle page — not here.
 */
export const RECOMMENDATION_LIFECYCLE_STATUSES = [
  "ENTRY_PENDING",
  "ENTRY_TRIGGERED",
  "ACTIVE",
  "TARGET_1_HIT",
  "TRAILING",
  "EXITED",
  "EXPIRED",
  "INVALIDATED",
] as const;

export type RecommendationLifecycleStatus =
  (typeof RECOMMENDATION_LIFECYCLE_STATUSES)[number];

export const RECOMMENDATION_LIFECYCLE_STATUS_LABELS: Record<
  RecommendationLifecycleStatus,
  string
> = {
  ENTRY_PENDING: "Entry Pending",
  ENTRY_TRIGGERED: "Entry Triggered",
  ACTIVE: "Active",
  TARGET_1_HIT: "Target 1 Hit",
  TRAILING: "Trailing",
  EXITED: "Exited",
  EXPIRED: "Expired",
  INVALIDATED: "Invalidated",
};

export interface RecommendationCompany {
  symbol: string;
  name: string;
  exchange?: string;
}

export interface RecommendationPriceRange {
  low: number;
  high: number;
}

export interface RecommendationTarget {
  price: number;
  label?: string;
}

export type PortfolioRecommendationStatus =
  | "IN_PORTFOLIO"
  | "NOT_IN_PORTFOLIO"
  | "UNKNOWN";

export type WatchlistRecommendationStatus =
  | "IN_WATCHLIST"
  | "NOT_IN_WATCHLIST"
  | "UNKNOWN";

/** Opaque point-in-time output composed from an existing domain engine. */
export type EngineSnapshot = Readonly<Record<string, unknown>>;

/** The original Sprint 9F response, stored without rerunning validation. */
export type RecommendationValidation = ValidationResponse | EngineSnapshot;

export interface RecommendationExplainability {
  convictionDrivers: string[];
  riskFactors: string[];
}

export interface RecommendationMetadata {
  generatedAt: string;
  generatedByEngine: string;
  aiVersion: string;
  strategy: RecommendationStrategy | string;
  expectedHoldingPeriod: string;
  recommendationStatus: RecommendationLifecycleStatus;
  portfolioStatus: PortfolioRecommendationStatus;
  watchlistStatus: WatchlistRecommendationStatus;
}

const STRATEGY_ALIASES: Record<string, RecommendationStrategy> = {
  intraday: "Intraday",
  swing: "Swing",
  positional: "Positional",
  position: "Positional",
  "long term": "Long Term",
  long_term: "Long Term",
  longterm: "Long Term",
  dividend: "Dividend",
  value: "Value",
  turnaround: "Turnaround",
  momentum: "Momentum",
  breakout: "Momentum",
  relative_volume: "Momentum",
  mean_reversion: "Value",
  ai_high_conviction: "Swing",
};

export function normalizeRecommendationStrategy(
  value: string
): RecommendationStrategy | string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const exact = RECOMMENDATION_STRATEGIES.find(
    (strategy) => strategy.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;
  return (
    STRATEGY_ALIASES[trimmed.toLowerCase().replace(/[\s-]+/g, "_")] ??
    STRATEGY_ALIASES[trimmed.toLowerCase()] ??
    trimmed
  );
}

export function expectedHoldingPeriodForStrategy(
  strategy: string
): ExpectedHoldingPeriod | string {
  const normalized = normalizeRecommendationStrategy(strategy);
  if (
    typeof normalized === "string" &&
    normalized in EXPECTED_HOLDING_PERIODS
  ) {
    return EXPECTED_HOLDING_PERIODS[
      normalized as RecommendationStrategy
    ];
  }
  return "Awaiting Holding Period";
}

export function normalizeRecommendationLifecycleStatus(
  value?: string | null
): RecommendationLifecycleStatus {
  if (!value) return "ENTRY_PENDING";
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = RECOMMENDATION_LIFECYCLE_STATUSES.find(
    (status) => status === compact
  );
  if (match) return match;
  const byLabel = (
    Object.entries(RECOMMENDATION_LIFECYCLE_STATUS_LABELS) as Array<
      [RecommendationLifecycleStatus, string]
    >
  ).find(([, label]) => label.toLowerCase() === value.trim().toLowerCase());
  return byLabel?.[0] ?? "ENTRY_PENDING";
}
