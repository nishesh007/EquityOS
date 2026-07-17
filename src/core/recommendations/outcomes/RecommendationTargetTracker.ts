/**
 * Target tracking across the recommendation lifecycle — not today's candle alone.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  LivingRecommendation,
  RecommendationLivingState,
} from "../lifecycle/RecommendationLifecycleModels";
import type {
  RecommendationPricePathInput,
  RecommendationTargetProgress,
} from "./RecommendationOutcomeModels";
import { roundMetric } from "./RecommendationOutcomeModels";

function midEntry(snapshot: RecommendationSnapshot): number {
  return (snapshot.entryRange.low + snapshot.entryRange.high) / 2;
}

function isLong(snapshot: RecommendationSnapshot): boolean {
  return snapshot.entryRange.high >= snapshot.stopLoss;
}

function targetPrice(snapshot: RecommendationSnapshot, index: number): number | null {
  const target = snapshot.targets[index];
  return target && Number.isFinite(target.price) ? target.price : null;
}

function lifecycleFlags(state: RecommendationLivingState | null | undefined) {
  return {
    entryTriggered:
      state === "ENTRY_TRIGGERED" ||
      state === "ACTIVE" ||
      state === "TARGET_1_HIT" ||
      state === "TARGET_2_HIT" ||
      state === "TRAILING" ||
      state === "EXITED" ||
      state === "STOP_LOSS_HIT" ||
      state === "MANUAL_EXIT",
    target1Hit:
      state === "TARGET_1_HIT" ||
      state === "TARGET_2_HIT" ||
      state === "TRAILING" ||
      state === "EXITED",
    target2Hit: state === "TARGET_2_HIT" || state === "TRAILING" || state === "EXITED",
    trailing: state === "TRAILING",
    stopLossHit: state === "STOP_LOSS_HIT",
  };
}

function pathFlags(
  snapshot: RecommendationSnapshot,
  path?: RecommendationPricePathInput
) {
  if (!path) {
    return {
      entryTriggered: false,
      target1Hit: false,
      target2Hit: false,
      stopLossHit: false,
    };
  }

  const long = isLong(snapshot);
  const entryLow = snapshot.entryRange.low;
  const entryHigh = snapshot.entryRange.high;
  const stop = snapshot.stopLoss;
  const t1 = targetPrice(snapshot, 0);
  const t2 = targetPrice(snapshot, 1);
  const high = path.highSinceEntry ?? path.currentPrice ?? null;
  const low = path.lowSinceEntry ?? path.currentPrice ?? null;
  const price = path.currentPrice ?? null;

  const touchedEntry =
    (price != null && price >= entryLow && price <= entryHigh) ||
    (high != null && low != null && low <= entryHigh && high >= entryLow);

  const stopHit =
    long
      ? (low != null && low <= stop) || (price != null && price <= stop)
      : (high != null && high >= stop) || (price != null && price >= stop);

  const t1Hit =
    t1 != null &&
    (long
      ? (high != null && high >= t1) || (price != null && price >= t1)
      : (low != null && low <= t1) || (price != null && price <= t1));

  const t2Hit =
    t2 != null &&
    (long
      ? (high != null && high >= t2) || (price != null && price >= t2)
      : (low != null && low <= t2) || (price != null && price <= t2));

  return {
    entryTriggered: Boolean(touchedEntry || t1Hit || t2Hit || stopHit),
    target1Hit: Boolean(t1Hit || t2Hit),
    target2Hit: Boolean(t2Hit),
    stopLossHit: Boolean(stopHit),
  };
}

export function trackRecommendationTargets(
  snapshot: RecommendationSnapshot,
  lifecycle?: LivingRecommendation | null,
  path?: RecommendationPricePathInput
): RecommendationTargetProgress {
  const fromLifecycle = lifecycleFlags(lifecycle?.state);
  const fromPath = pathFlags(snapshot, path);

  const entryTriggered = fromLifecycle.entryTriggered || fromPath.entryTriggered;
  const target1Hit = fromLifecycle.target1Hit || fromPath.target1Hit;
  const target2Hit = fromLifecycle.target2Hit || fromPath.target2Hit;
  const stopLossHit = fromLifecycle.stopLossHit || fromPath.stopLossHit;
  const trailing = fromLifecycle.trailing || (target1Hit && !target2Hit && !stopLossHit && entryTriggered && lifecycle?.state === "TRAILING");

  const entry = midEntry(snapshot);
  const long = isLong(snapshot);
  const t1 = targetPrice(snapshot, 0);
  const t2 = targetPrice(snapshot, 1);
  const price = path?.currentPrice ?? null;

  let targetProgressPercent = 0;
  if (target2Hit) targetProgressPercent = 100;
  else if (trailing) targetProgressPercent = 85;
  else if (target1Hit) targetProgressPercent = 60;
  else if (entryTriggered && t1 != null && price != null && entry !== t1) {
    const achieved = long ? price - entry : entry - price;
    const total = Math.abs(t1 - entry);
    targetProgressPercent = roundMetric(
      Math.max(0, Math.min(59, (achieved / total) * 60))
    );
  } else if (entryTriggered) {
    targetProgressPercent = 15;
  }

  const distanceToTarget1 =
    t1 == null || price == null ? null : roundMetric(long ? t1 - price : price - t1);
  const distanceToTarget2 =
    t2 == null || price == null ? null : roundMetric(long ? t2 - price : price - t2);
  const distanceToStop =
    price == null ? null : roundMetric(long ? price - snapshot.stopLoss : snapshot.stopLoss - price);

  let nextMilestone = "Awaiting Entry";
  if (stopLossHit) nextMilestone = "Stopped";
  else if (target2Hit) nextMilestone = "Complete";
  else if (trailing) nextMilestone = "Trailing Exit";
  else if (target1Hit) nextMilestone = "Target 2";
  else if (entryTriggered) nextMilestone = "Target 1";
  else nextMilestone = "Entry";

  return Object.freeze({
    entryTriggered,
    target1Hit,
    target2Hit,
    trailing: Boolean(trailing),
    stopLossHit,
    targetProgressPercent,
    distanceToTarget1,
    distanceToTarget2,
    distanceToStop,
    nextMilestone,
  });
}

export class RecommendationTargetTracker {
  track = trackRecommendationTargets;
}
