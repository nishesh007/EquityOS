/**
 * Maps living lifecycle states + market context to institutional display statuses.
 * Does not recalculate conviction, trust, or validation — those come from R1 / health inputs.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  RecommendationDisplayStatus,
  RecommendationLivingState,
  RecommendationMarketQuote,
} from "./RecommendationLifecycleModels";
import {
  ACTIVE_LIFECYCLE_STATES,
  TERMINAL_LIFECYCLE_STATES,
} from "./RecommendationLifecycleModels";

const STATE_TO_DISPLAY: Record<
  RecommendationLivingState,
  RecommendationDisplayStatus
> = {
  GENERATED: "Generated",
  ENTRY_PENDING: "Entry Pending",
  ENTRY_TRIGGERED: "Entry Triggered",
  ACTIVE: "Running",
  TARGET_1_HIT: "Target 1 Completed",
  TARGET_2_HIT: "Target 2 Completed",
  TRAILING: "Trailing",
  EXITED: "Exited",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
  INVALIDATED: "Invalidated",
  STOP_LOSS_HIT: "Stopped Out",
  MANUAL_EXIT: "Manual Exit",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export function displayStatusForState(
  state: RecommendationLivingState
): RecommendationDisplayStatus {
  return STATE_TO_DISPLAY[state];
}

export function isActiveLifecycleState(state: RecommendationLivingState): boolean {
  return ACTIVE_LIFECYCLE_STATES.has(state);
}

export function isTerminalLifecycleState(
  state: RecommendationLivingState
): boolean {
  return TERMINAL_LIFECYCLE_STATES.has(state);
}

function targetPrice(
  snapshot: RecommendationSnapshot,
  index: number
): number | null {
  const target = snapshot.targets[index];
  return target && Number.isFinite(target.price) ? target.price : null;
}

function midEntry(snapshot: RecommendationSnapshot): number {
  return (snapshot.entryRange.low + snapshot.entryRange.high) / 2;
}

function isLong(snapshot: RecommendationSnapshot): boolean {
  return snapshot.entryRange.high >= snapshot.stopLoss;
}

/**
 * Auto-determine display status from lifecycle state and optional quote.
 * Near Target overlays Running when price is within 1% of Target 1.
 */
export function resolveRecommendationDisplayStatus(
  state: RecommendationLivingState,
  snapshot: RecommendationSnapshot,
  quote?: RecommendationMarketQuote | null
): RecommendationDisplayStatus {
  const base = displayStatusForState(state);

  if (
    (state === "ACTIVE" || state === "ENTRY_TRIGGERED") &&
    quote &&
    Number.isFinite(quote.price)
  ) {
    const t1 = targetPrice(snapshot, 0);
    if (t1 != null) {
      const distancePct = Math.abs(quote.price - t1) / Math.abs(t1);
      if (distancePct <= 0.01) return "Near Target";
    }
  }

  return base;
}

/**
 * Infer the next happy-path / market-driven state from price action.
 * Returns null when the current state should not auto-advance.
 */
export function inferMarketDrivenState(
  state: RecommendationLivingState,
  snapshot: RecommendationSnapshot,
  quote: RecommendationMarketQuote
): RecommendationLivingState | null {
  if (!Number.isFinite(quote.price)) return null;
  if (isTerminalLifecycleState(state) || state === "EXPIRED" || state === "ARCHIVED") {
    return null;
  }
  if (state === "EXITED" || state === "MANUAL_EXIT" || state === "STOP_LOSS_HIT") {
    return null;
  }

  const price = quote.price;
  const long = isLong(snapshot);
  const entryLow = snapshot.entryRange.low;
  const entryHigh = snapshot.entryRange.high;
  const stop = snapshot.stopLoss;
  const t1 = targetPrice(snapshot, 0);
  const t2 = targetPrice(snapshot, 1);

  const stopHit = long ? price <= stop : price >= stop;
  if (stopHit && state !== "STOP_LOSS_HIT") {
    return "STOP_LOSS_HIT";
  }

  const inEntry = price >= entryLow && price <= entryHigh;
  const beyondEntry = long ? price > entryHigh : price < entryLow;

  if (state === "GENERATED" || state === "ENTRY_PENDING") {
    if (inEntry || beyondEntry) return "ENTRY_TRIGGERED";
    return null;
  }

  if (state === "ENTRY_TRIGGERED") {
    if (beyondEntry || inEntry) return "ACTIVE";
    return null;
  }

  if (state === "ACTIVE") {
    if (t1 != null && (long ? price >= t1 : price <= t1)) return "TARGET_1_HIT";
    return null;
  }

  if (state === "TARGET_1_HIT") {
    if (t2 != null && (long ? price >= t2 : price <= t2)) return "TARGET_2_HIT";
    // Price still above T1 but not T2 → trailing candidate once past mid-path
    const entry = midEntry(snapshot);
    if (t1 != null && t2 != null) {
      const midway = (t1 + t2) / 2;
      if (long ? price >= midway : price <= midway) return "TRAILING";
    } else if (t1 != null && (long ? price > t1 : price < t1)) {
      return "TRAILING";
    }
    void entry;
    return null;
  }

  if (state === "TARGET_2_HIT") {
    return "TRAILING";
  }

  return null;
}

export class RecommendationStatusEngine {
  displayStatusForState = displayStatusForState;
  resolve = resolveRecommendationDisplayStatus;
  inferFromMarket = inferMarketDrivenState;
  isActive = isActiveLifecycleState;
  isTerminal = isTerminalLifecycleState;
}
