/**
 * Recommendation Lifecycle Engine — living institutional recommendations.
 *
 * Reuses immutable R1 Recommendation Snapshots.
 * Only lifecycle state, timeline, health overlays, and progress evolve.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import {
  LIFECYCLE_ADVANCE_ORDER,
  normalizeTimestamp,
  type AdvanceRecommendationInput,
  type LivingRecommendation,
  type RecommendationCurrentHealth,
  type RecommendationHealthInput,
  type RecommendationLivingState,
  type RecommendationMarketQuote,
  type RecommendationStatusView,
  type UpdateRecommendationStatusInput,
  isRecommendationLivingState,
} from "./RecommendationLifecycleModels";
import { computeRecommendationProgress } from "./RecommendationProgressEngine";
import {
  displayStatusForState,
  inferMarketDrivenState,
  isActiveLifecycleState,
  isTerminalLifecycleState,
  resolveRecommendationDisplayStatus,
} from "./RecommendationStatusEngine";
import {
  appendTimelineEvent,
  createTimelineEvent,
} from "./RecommendationTimelineEngine";

const ALLOWED_TRANSITIONS: Record<
  RecommendationLivingState,
  ReadonlySet<RecommendationLivingState>
> = {
  GENERATED: new Set([
    "ENTRY_PENDING",
    "ENTRY_TRIGGERED",
    "INVALIDATED",
    "CANCELLED",
    "REJECTED",
    "EXPIRED",
  ]),
  ENTRY_PENDING: new Set([
    "ENTRY_TRIGGERED",
    "INVALIDATED",
    "CANCELLED",
    "REJECTED",
    "EXPIRED",
  ]),
  ENTRY_TRIGGERED: new Set([
    "ACTIVE",
    "STOP_LOSS_HIT",
    "INVALIDATED",
    "CANCELLED",
    "MANUAL_EXIT",
    "EXPIRED",
  ]),
  ACTIVE: new Set([
    "TARGET_1_HIT",
    "TRAILING",
    "STOP_LOSS_HIT",
    "MANUAL_EXIT",
    "EXITED",
    "INVALIDATED",
    "EXPIRED",
  ]),
  TARGET_1_HIT: new Set([
    "TARGET_2_HIT",
    "TRAILING",
    "STOP_LOSS_HIT",
    "MANUAL_EXIT",
    "EXITED",
    "EXPIRED",
  ]),
  TARGET_2_HIT: new Set([
    "TRAILING",
    "EXITED",
    "MANUAL_EXIT",
    "STOP_LOSS_HIT",
    "EXPIRED",
  ]),
  TRAILING: new Set([
    "EXITED",
    "MANUAL_EXIT",
    "STOP_LOSS_HIT",
    "EXPIRED",
  ]),
  EXITED: new Set(["EXPIRED", "ARCHIVED"]),
  EXPIRED: new Set(["ARCHIVED"]),
  ARCHIVED: new Set(),
  INVALIDATED: new Set(["ARCHIVED"]),
  STOP_LOSS_HIT: new Set(["EXITED", "EXPIRED", "ARCHIVED"]),
  MANUAL_EXIT: new Set(["EXITED", "EXPIRED", "ARCHIVED"]),
  CANCELLED: new Set(["ARCHIVED"]),
  REJECTED: new Set(["ARCHIVED"]),
};

function assertTransition(
  from: RecommendationLivingState,
  to: RecommendationLivingState
): void {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.has(to)) {
    throw new Error(
      `Invalid lifecycle transition ${from} → ${to}`
    );
  }
}

function nextAdvanceState(
  state: RecommendationLivingState
): RecommendationLivingState | null {
  const index = LIFECYCLE_ADVANCE_ORDER.indexOf(
    state as (typeof LIFECYCLE_ADVANCE_ORDER)[number]
  );
  if (index < 0 || index >= LIFECYCLE_ADVANCE_ORDER.length - 1) return null;
  return LIFECYCLE_ADVANCE_ORDER[index + 1];
}

function buildHealth(
  snapshot: RecommendationSnapshot,
  state: RecommendationLivingState,
  displayStatus: ReturnType<typeof displayStatusForState>,
  health?: RecommendationHealthInput
): RecommendationCurrentHealth {
  return {
    originalConviction: snapshot.originalConviction,
    currentHealth: health?.currentHealth ?? null,
    currentTrust: health?.currentTrust ?? snapshot.originalTrust,
    currentValidation:
      health?.currentValidation ??
      (typeof snapshot.originalValidation === "object" &&
      snapshot.originalValidation &&
      "overallValidationScore" in snapshot.originalValidation &&
      typeof (snapshot.originalValidation as { overallValidationScore?: unknown })
        .overallValidationScore === "number"
        ? ((snapshot.originalValidation as { overallValidationScore: number })
            .overallValidationScore)
        : null),
    currentRisk: health?.currentRisk ?? null,
    lifecycleStatus: state,
    displayStatus,
  };
}

function materialize(input: {
  snapshot: RecommendationSnapshot;
  state: RecommendationLivingState;
  timeline: LivingRecommendation["timeline"];
  healthInput?: RecommendationHealthInput;
  quote?: RecommendationMarketQuote | null;
  createdAt: string;
  updatedAt: string;
}): LivingRecommendation {
  const displayStatus = resolveRecommendationDisplayStatus(
    input.state,
    input.snapshot,
    input.quote
  );
  return Object.freeze({
    recommendationId: input.snapshot.recommendationId,
    snapshot: input.snapshot,
    state: input.state,
    displayStatus,
    timeline: input.timeline,
    health: buildHealth(
      input.snapshot,
      input.state,
      displayStatus,
      input.healthInput
    ),
    progress: computeRecommendationProgress(
      input.snapshot,
      input.state,
      input.quote,
      input.updatedAt
    ),
    lastQuote: input.quote ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
}

export class RecommendationLifecycleEngine {
  private readonly living = new Map<string, LivingRecommendation>();

  /**
   * Register an immutable R1 snapshot as a living recommendation.
   * Starts at GENERATED → immediately advances to ENTRY_PENDING unless overridden.
   */
  register(
    snapshot: RecommendationSnapshot,
    options?: {
      initialState?: RecommendationLivingState;
      occurredAt?: string | Date;
      note?: string;
      health?: RecommendationHealthInput;
    }
  ): LivingRecommendation {
    if (this.living.has(snapshot.recommendationId)) {
      throw new Error(
        `Lifecycle already registered for ${snapshot.recommendationId}`
      );
    }

    const occurredAt = normalizeTimestamp(
      options?.occurredAt ?? snapshot.generatedAt
    );
    const generated = createTimelineEvent({
      recommendationId: snapshot.recommendationId,
      state: "GENERATED",
      occurredAt,
      note: options?.note ?? "Recommendation Generated",
      type: "Recommendation Generated",
    });

    let state: RecommendationLivingState = options?.initialState ?? "ENTRY_PENDING";
    if (!isRecommendationLivingState(state)) {
      throw new Error(`Unknown lifecycle state: ${String(state)}`);
    }

    let timeline = appendTimelineEvent([], generated);
    if (state !== "GENERATED") {
      assertTransition("GENERATED", state);
      timeline = appendTimelineEvent(
        timeline,
        createTimelineEvent({
          recommendationId: snapshot.recommendationId,
          state,
          occurredAt,
          note: `Initialized as ${state}`,
        })
      );
    }

    const record = materialize({
      snapshot,
      state,
      timeline,
      healthInput: options?.health,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    this.living.set(snapshot.recommendationId, record);
    return record;
  }

  get(recommendationId: string): LivingRecommendation | undefined {
    return this.living.get(recommendationId);
  }

  list(): LivingRecommendation[] {
    return [...this.living.values()].sort(
      (a, b) =>
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        b.recommendationId.localeCompare(a.recommendationId)
    );
  }

  listActive(): LivingRecommendation[] {
    return this.list().filter((item) => isActiveLifecycleState(item.state));
  }

  getStatus(recommendationId: string): RecommendationStatusView | undefined {
    const living = this.living.get(recommendationId);
    if (!living) return undefined;
    return {
      recommendationId,
      state: living.state,
      displayStatus: living.displayStatus,
      updatedAt: living.updatedAt,
      isTerminal: isTerminalLifecycleState(living.state),
      isActive: isActiveLifecycleState(living.state),
    };
  }

  getProgress(recommendationId: string) {
    return this.living.get(recommendationId)?.progress;
  }

  getTimeline(recommendationId: string) {
    return this.living.get(recommendationId)?.timeline;
  }

  advance(input: AdvanceRecommendationInput): LivingRecommendation {
    const current = this.require(input.recommendationId);
    const occurredAt = normalizeTimestamp(input.occurredAt);
    const quote = input.quote ?? current.lastQuote ?? undefined;

    let toState = input.toState ?? null;
    if (!toState && quote) {
      toState = inferMarketDrivenState(current.state, current.snapshot, quote);
    }
    if (!toState) {
      toState = nextAdvanceState(current.state);
    }
    if (!toState) {
      throw new Error(
        `Recommendation ${input.recommendationId} cannot advance from ${current.state}`
      );
    }

    return this.transition(current, toState, {
      occurredAt,
      note: input.note,
      quote,
      health: input.health,
    });
  }

  updateStatus(input: UpdateRecommendationStatusInput): LivingRecommendation {
    const current = this.require(input.recommendationId);
    if (!isRecommendationLivingState(input.status)) {
      throw new Error(`Unknown lifecycle status: ${input.status}`);
    }
    return this.transition(current, input.status, {
      occurredAt: normalizeTimestamp(input.occurredAt),
      note: input.note,
      quote: input.quote ?? current.lastQuote ?? undefined,
      health: input.health,
    });
  }

  expire(
    recommendationId: string,
    note = "Recommendation expired",
    occurredAt?: string | Date
  ): LivingRecommendation {
    return this.updateStatus({
      recommendationId,
      status: "EXPIRED",
      note,
      occurredAt,
    });
  }

  archive(
    recommendationId: string,
    note = "Recommendation archived",
    occurredAt?: string | Date
  ): LivingRecommendation {
    const current = this.require(recommendationId);
    const at = normalizeTimestamp(occurredAt);
    let working = current;

    if (working.state === "ARCHIVED") return working;

    // Canonical path: … → EXPIRED → ARCHIVED whenever EXPIRED is reachable.
    if (working.state !== "EXPIRED") {
      if (ALLOWED_TRANSITIONS[working.state].has("EXPIRED")) {
        working = this.transition(working, "EXPIRED", {
          occurredAt: at,
          note: "Expired before archival",
          quote: working.lastQuote ?? undefined,
        });
      } else if (ALLOWED_TRANSITIONS[working.state].has("ARCHIVED")) {
        return this.transition(working, "ARCHIVED", {
          occurredAt: at,
          note,
          quote: working.lastQuote ?? undefined,
        });
      } else {
        throw new Error(
          `Cannot archive recommendation from ${working.state}`
        );
      }
    }

    if (working.state === "ARCHIVED") return working;
    return this.transition(working, "ARCHIVED", {
      occurredAt: at,
      note,
      quote: working.lastQuote ?? undefined,
    });
  }

  clear(): void {
    this.living.clear();
  }

  private require(recommendationId: string): LivingRecommendation {
    const living = this.living.get(recommendationId);
    if (!living) {
      throw new Error(`Lifecycle not found for ${recommendationId}`);
    }
    return living;
  }

  private transition(
    current: LivingRecommendation,
    toState: RecommendationLivingState,
    options: {
      occurredAt: string;
      note?: string;
      quote?: RecommendationMarketQuote;
      health?: RecommendationHealthInput;
    }
  ): LivingRecommendation {
    assertTransition(current.state, toState);
    if (current.state === toState) {
      // Refresh quote/health without duplicating timeline noise.
      const refreshed = materialize({
        snapshot: current.snapshot,
        state: current.state,
        timeline: current.timeline,
        healthInput: options.health ?? {
          currentHealth: current.health.currentHealth,
          currentTrust: current.health.currentTrust,
          currentValidation: current.health.currentValidation,
          currentRisk: current.health.currentRisk,
        },
        quote: options.quote ?? current.lastQuote,
        createdAt: current.createdAt,
        updatedAt: options.occurredAt,
      });
      this.living.set(current.recommendationId, refreshed);
      return refreshed;
    }

    const event = createTimelineEvent({
      recommendationId: current.recommendationId,
      state: toState,
      occurredAt: options.occurredAt,
      note: options.note,
    });
    const next = materialize({
      snapshot: current.snapshot,
      state: toState,
      timeline: appendTimelineEvent(current.timeline, event),
      healthInput: options.health ?? {
        currentHealth: current.health.currentHealth,
        currentTrust: current.health.currentTrust,
        currentValidation: current.health.currentValidation,
        currentRisk: current.health.currentRisk,
      },
      quote: options.quote ?? current.lastQuote,
      createdAt: current.createdAt,
      updatedAt: options.occurredAt,
    });
    this.living.set(current.recommendationId, next);
    return next;
  }
}
