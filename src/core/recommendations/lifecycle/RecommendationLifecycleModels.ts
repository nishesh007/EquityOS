/**
 * Living recommendation lifecycle models.
 * Snapshots from R1 remain immutable — only lifecycle state evolves here.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";

/** Happy-path lifecycle sequence (immutable snapshots never change). */
export const RECOMMENDATION_LIFECYCLE_STATES = [
  "GENERATED",
  "ENTRY_PENDING",
  "ENTRY_TRIGGERED",
  "ACTIVE",
  "TARGET_1_HIT",
  "TARGET_2_HIT",
  "TRAILING",
  "EXITED",
  "EXPIRED",
  "ARCHIVED",
] as const;

export type RecommendationLifecycleState =
  (typeof RECOMMENDATION_LIFECYCLE_STATES)[number];

/** Terminal / exception outcomes that branch off the happy path. */
export const RECOMMENDATION_ALTERNATIVE_STATES = [
  "INVALIDATED",
  "STOP_LOSS_HIT",
  "MANUAL_EXIT",
  "CANCELLED",
  "REJECTED",
] as const;

export type RecommendationAlternativeState =
  (typeof RECOMMENDATION_ALTERNATIVE_STATES)[number];

export type RecommendationLivingState =
  | RecommendationLifecycleState
  | RecommendationAlternativeState;

export const RECOMMENDATION_LIVING_STATES = [
  ...RECOMMENDATION_LIFECYCLE_STATES,
  ...RECOMMENDATION_ALTERNATIVE_STATES,
] as const;

/** Display statuses produced by the Status Engine (not raw state codes). */
export const RECOMMENDATION_DISPLAY_STATUSES = [
  "Entry Pending",
  "Entry Triggered",
  "Running",
  "Near Target",
  "Target 1 Completed",
  "Target 2 Completed",
  "Trailing",
  "Stopped Out",
  "Expired",
  "Archived",
  "Invalidated",
  "Manual Exit",
  "Cancelled",
  "Rejected",
  "Exited",
  "Generated",
] as const;

export type RecommendationDisplayStatus =
  (typeof RECOMMENDATION_DISPLAY_STATUSES)[number];

export const RECOMMENDATION_TIMELINE_EVENT_TYPES = [
  "Recommendation Generated",
  "Entry Triggered",
  "Target 1 Hit",
  "Target 2 Hit",
  "SL Hit",
  "Manual Exit",
  "Expired",
  "Archived",
  "Invalidated",
  "Cancelled",
  "Rejected",
  "Status Advanced",
  "Exited",
] as const;

export type RecommendationTimelineEventType =
  (typeof RECOMMENDATION_TIMELINE_EVENT_TYPES)[number];

export interface RecommendationTimelineEvent {
  readonly eventId: string;
  readonly recommendationId: string;
  readonly type: RecommendationTimelineEventType;
  readonly state: RecommendationLivingState;
  readonly occurredAt: string;
  readonly note?: string;
}

export interface RecommendationMarketQuote {
  readonly price: number;
  readonly asOf?: string;
  /** Optional session count override; otherwise derived from holding days. */
  readonly sessionsHeld?: number;
}

export interface RecommendationHealthInput {
  readonly currentHealth?: number | null;
  readonly currentTrust?: number | null;
  readonly currentValidation?: number | null;
  readonly currentRisk?: number | null;
}

export interface RecommendationProgressMetrics {
  readonly entryPercent: number | null;
  readonly currentReturnPercent: number | null;
  readonly distanceToEntry: number | null;
  readonly distanceToStopLoss: number | null;
  readonly distanceToTarget1: number | null;
  readonly distanceToTarget2: number | null;
  readonly rewardAchievedPercent: number | null;
  readonly holdingDays: number;
  readonly holdingSessions: number;
  readonly progressPercent: number | null;
}

export interface RecommendationCurrentHealth {
  readonly originalConviction: number;
  readonly currentHealth: number | null;
  readonly currentTrust: number | null;
  readonly currentValidation: number | null;
  readonly currentRisk: number | null;
  readonly lifecycleStatus: RecommendationLivingState;
  readonly displayStatus: RecommendationDisplayStatus;
}

export interface RecommendationStatusView {
  readonly recommendationId: string;
  readonly state: RecommendationLivingState;
  readonly displayStatus: RecommendationDisplayStatus;
  readonly updatedAt: string;
  readonly isTerminal: boolean;
  readonly isActive: boolean;
}

/**
 * Living record layered on an immutable R1 snapshot.
 * The snapshot reference is never rewritten.
 */
export interface LivingRecommendation {
  readonly recommendationId: string;
  readonly snapshot: RecommendationSnapshot;
  readonly state: RecommendationLivingState;
  readonly displayStatus: RecommendationDisplayStatus;
  readonly timeline: readonly RecommendationTimelineEvent[];
  readonly health: RecommendationCurrentHealth;
  readonly progress: RecommendationProgressMetrics;
  readonly lastQuote: RecommendationMarketQuote | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdvanceRecommendationInput {
  readonly recommendationId: string;
  readonly quote?: RecommendationMarketQuote;
  readonly health?: RecommendationHealthInput;
  readonly note?: string;
  readonly occurredAt?: string | Date;
  /** Force a specific next state (validated against allowed transitions). */
  readonly toState?: RecommendationLivingState;
}

export interface UpdateRecommendationStatusInput {
  readonly recommendationId: string;
  readonly status: RecommendationLivingState;
  readonly quote?: RecommendationMarketQuote;
  readonly health?: RecommendationHealthInput;
  readonly note?: string;
  readonly occurredAt?: string | Date;
}

/** Ordered happy-path transitions used by advanceRecommendation(). */
export const LIFECYCLE_ADVANCE_ORDER: readonly RecommendationLifecycleState[] = [
  "GENERATED",
  "ENTRY_PENDING",
  "ENTRY_TRIGGERED",
  "ACTIVE",
  "TARGET_1_HIT",
  "TARGET_2_HIT",
  "TRAILING",
  "EXITED",
  "EXPIRED",
  "ARCHIVED",
];

export const TERMINAL_LIFECYCLE_STATES: ReadonlySet<RecommendationLivingState> =
  new Set([
    "ARCHIVED",
    "INVALIDATED",
    "CANCELLED",
    "REJECTED",
  ]);

export const ACTIVE_LIFECYCLE_STATES: ReadonlySet<RecommendationLivingState> =
  new Set([
    "GENERATED",
    "ENTRY_PENDING",
    "ENTRY_TRIGGERED",
    "ACTIVE",
    "TARGET_1_HIT",
    "TARGET_2_HIT",
    "TRAILING",
  ]);

export function isRecommendationLivingState(
  value: string
): value is RecommendationLivingState {
  return (RECOMMENDATION_LIVING_STATES as readonly string[]).includes(value);
}

export function normalizeTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Lifecycle timestamp is invalid");
  }
  return date.toISOString();
}
