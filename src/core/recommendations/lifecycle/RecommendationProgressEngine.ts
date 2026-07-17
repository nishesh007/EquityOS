/**
 * Progress intelligence over an immutable recommendation snapshot + live quote.
 * Pure arithmetic only — no conviction/trust/validation recalculation.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  RecommendationLivingState,
  RecommendationMarketQuote,
  RecommendationProgressMetrics,
} from "./RecommendationLifecycleModels";

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

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function holdingDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.max(0, Math.floor((to - from) / (24 * 60 * 60 * 1000)));
}

function progressForState(state: RecommendationLivingState): number {
  switch (state) {
    case "GENERATED":
      return 0;
    case "ENTRY_PENDING":
      return 5;
    case "ENTRY_TRIGGERED":
      return 15;
    case "ACTIVE":
      return 35;
    case "TARGET_1_HIT":
      return 60;
    case "TARGET_2_HIT":
      return 80;
    case "TRAILING":
      return 90;
    case "EXITED":
    case "MANUAL_EXIT":
      return 100;
    case "STOP_LOSS_HIT":
      return 100;
    case "EXPIRED":
      return 100;
    case "ARCHIVED":
      return 100;
    case "INVALIDATED":
    case "CANCELLED":
    case "REJECTED":
      return 0;
    default:
      return 0;
  }
}

export function computeRecommendationProgress(
  snapshot: RecommendationSnapshot,
  state: RecommendationLivingState,
  quote?: RecommendationMarketQuote | null,
  asOf?: string
): RecommendationProgressMetrics {
  const now = asOf ?? quote?.asOf ?? new Date().toISOString();
  const days = holdingDaysBetween(snapshot.generatedAt, now);
  const sessions =
    quote?.sessionsHeld != null && Number.isFinite(quote.sessionsHeld)
      ? Math.max(0, Math.floor(quote.sessionsHeld))
      : days;

  if (!quote || !Number.isFinite(quote.price)) {
    return {
      entryPercent: null,
      currentReturnPercent: null,
      distanceToEntry: null,
      distanceToStopLoss: null,
      distanceToTarget1: null,
      distanceToTarget2: null,
      rewardAchievedPercent: null,
      holdingDays: days,
      holdingSessions: sessions,
      progressPercent: progressForState(state),
    };
  }

  const price = quote.price;
  const entry = midEntry(snapshot);
  const long = isLong(snapshot);
  const t1 = targetPrice(snapshot, 0);
  const t2 = targetPrice(snapshot, 1);
  const stop = snapshot.stopLoss;

  const entrySpan = Math.abs(snapshot.entryRange.high - snapshot.entryRange.low);
  const entryPercent =
    entrySpan === 0
      ? price === entry
        ? 100
        : 0
      : round(
          Math.max(
            0,
            Math.min(
              100,
              ((price - snapshot.entryRange.low) / entrySpan) * 100
            )
          )
        );

  const currentReturnPercent = round(((price - entry) / entry) * 100 * (long ? 1 : -1));
  const distanceToEntry = round(price - entry);
  const distanceToStopLoss = round(price - stop);
  const distanceToTarget1 = t1 == null ? null : round(t1 - price);
  const distanceToTarget2 = t2 == null ? null : round(t2 - price);

  const rewardPath = t2 ?? t1;
  let rewardAchievedPercent: number | null = null;
  if (rewardPath != null && rewardPath !== entry) {
    const achieved = long ? price - entry : entry - price;
    const total = Math.abs(rewardPath - entry);
    rewardAchievedPercent = round(Math.max(0, (achieved / total) * 100));
  }

  // Blend structural lifecycle progress with reward achieved when available.
  const structural = progressForState(state);
  const progressPercent =
    rewardAchievedPercent == null
      ? structural
      : round(Math.min(100, structural * 0.5 + rewardAchievedPercent * 0.5));

  return {
    entryPercent,
    currentReturnPercent,
    distanceToEntry,
    distanceToStopLoss,
    distanceToTarget1,
    distanceToTarget2,
    rewardAchievedPercent,
    holdingDays: days,
    holdingSessions: sessions,
    progressPercent,
  };
}

export class RecommendationProgressEngine {
  compute = computeRecommendationProgress;
}
