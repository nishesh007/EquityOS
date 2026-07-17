/**
 * Performance metrics and institutional verdicts from complete recommendation lifecycle.
 * Does not regenerate conviction — uses snapshot entry/targets + supplied path + lifecycle.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { LivingRecommendation } from "../lifecycle/RecommendationLifecycleModels";
import type { RecommendationHealthAssessment } from "../health/RecommendationHealthModels";
import { trackRecommendationTargets } from "./RecommendationTargetTracker";
import type {
  InstitutionalVerdict,
  RecommendationOutcomeAttribution,
  RecommendationOutcomeState,
  RecommendationOutcomeSummary,
  RecommendationPerformanceMetrics,
  RecommendationPricePathInput,
  RecommendationTargetProgress,
} from "./RecommendationOutcomeModels";
import {
  holdingDaysBetween,
  normalizeOutcomeTimestamp,
  roundMetric,
} from "./RecommendationOutcomeModels";

function midEntry(snapshot: RecommendationSnapshot): number {
  return (snapshot.entryRange.low + snapshot.entryRange.high) / 2;
}

function isLong(snapshot: RecommendationSnapshot): boolean {
  return snapshot.entryRange.high >= snapshot.stopLoss;
}

function percentMove(from: number, to: number, long: boolean): number {
  if (from <= 0) return 0;
  const raw = ((to - from) / from) * 100;
  return long ? raw : -raw;
}

export function resolveOutcomeState(
  lifecycle?: LivingRecommendation | null,
  targets?: RecommendationTargetProgress
): RecommendationOutcomeState {
  const state = lifecycle?.state;
  switch (state) {
    case "GENERATED":
    case "ENTRY_PENDING":
      return "Pending Entry";
    case "ENTRY_TRIGGERED":
      return "Entry Triggered";
    case "ACTIVE":
      return "Running";
    case "TARGET_1_HIT":
      return "Target 1 Hit";
    case "TARGET_2_HIT":
      return "Target 2 Hit";
    case "TRAILING":
      return "Trailing";
    case "STOP_LOSS_HIT":
      return "Stop Loss Hit";
    case "MANUAL_EXIT":
      return "Manual Exit";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
    case "REJECTED":
      return "Cancelled";
    case "ARCHIVED":
      return "Archived";
    case "EXITED":
      return targets?.target2Hit
        ? "Target 2 Hit"
        : targets?.target1Hit
          ? "Target 1 Hit"
          : "Manual Exit";
    case "INVALIDATED":
      return "Cancelled";
    default:
      if (targets?.stopLossHit) return "Stop Loss Hit";
      if (targets?.target2Hit) return "Target 2 Hit";
      if (targets?.target1Hit) return "Target 1 Hit";
      if (targets?.entryTriggered) return "Running";
      return "Pending Entry";
  }
}

export function getInstitutionalVerdict(
  outcomeState: RecommendationOutcomeState,
  performance: RecommendationPerformanceMetrics,
  health?: RecommendationHealthAssessment | null
): InstitutionalVerdict {
  if (health?.invalidated || outcomeState === "Cancelled") {
    return health?.invalidated ? "Invalidated" : "Failed";
  }

  switch (outcomeState) {
    case "Target 2 Hit":
      return "Outstanding";
    case "Target 1 Hit":
    case "Trailing":
      return performance.maximumGainPercent != null &&
        performance.maximumGainPercent >= 3
        ? "Successful"
        : "Partially Successful";
    case "Stop Loss Hit":
      return "Failed";
    case "Manual Exit":
      if ((performance.currentReturnPercent ?? 0) > 1) return "Partially Successful";
      if ((performance.currentReturnPercent ?? 0) < -1) return "Failed";
      return "Neutral";
    case "Expired":
    case "Archived":
      if ((performance.maximumGainPercent ?? 0) >= 2) return "Partially Successful";
      if ((performance.maximumDrawdownPercent ?? 0) <= -2) return "Failed";
      return "Neutral";
    case "Running":
    case "Entry Triggered":
      if ((performance.currentReturnPercent ?? 0) >= 2) return "Partially Successful";
      return "Neutral";
    case "Pending Entry":
    default:
      return "Neutral";
  }
}

export function computeRecommendationPerformance(
  snapshot: RecommendationSnapshot,
  targets: RecommendationTargetProgress,
  lifecycle?: LivingRecommendation | null,
  path?: RecommendationPricePathInput,
  evaluatedAt?: string | Date
): RecommendationPerformanceMetrics {
  const asOf = normalizeOutcomeTimestamp(path?.asOf ?? evaluatedAt);
  const daysActive = holdingDaysBetween(snapshot.generatedAt, asOf);
  const sessionsActive =
    path?.sessionsActive != null && Number.isFinite(path.sessionsActive)
      ? Math.max(0, Math.floor(path.sessionsActive))
      : daysActive;

  const entry = midEntry(snapshot);
  const long = isLong(snapshot);
  const price = path?.currentPrice ?? null;
  const high = path?.highSinceEntry ?? price;
  const low = path?.lowSinceEntry ?? price;

  const currentReturnPercent =
    price == null ? null : roundMetric(percentMove(entry, price, long));
  const maximumGainPercent =
    high == null ? null : roundMetric(Math.max(0, percentMove(entry, high, long)));
  const maximumDrawdownPercent =
    low == null ? null : roundMetric(Math.min(0, percentMove(entry, low, long)));

  const plannedRisk = Math.abs(entry - snapshot.stopLoss);
  const riskRewardAchieved =
    maximumGainPercent == null || plannedRisk <= 0 || entry <= 0
      ? null
      : roundMetric((Math.abs(maximumGainPercent) / 100) * entry / plannedRisk);

  const distanceToTarget =
    targets.distanceToTarget2 ?? targets.distanceToTarget1;

  return Object.freeze({
    maximumGainPercent,
    maximumDrawdownPercent,
    currentReturnPercent,
    daysActive,
    sessionsActive,
    holdingPeriod: snapshot.expectedHoldingPeriod,
    holdingHorizon: snapshot.expectedHoldingPeriod,
    riskRewardAchieved,
    targetProgressPercent: targets.targetProgressPercent,
    distanceToTarget,
    distanceToStop: targets.distanceToStop,
  });
}

export function buildOutcomeAttribution(
  outcomeState: RecommendationOutcomeState,
  snapshot: RecommendationSnapshot,
  health?: RecommendationHealthAssessment | null
): RecommendationOutcomeAttribution {
  const drivers = snapshot.convictionDrivers.slice(0, 3);
  const risks = snapshot.riskFactors.slice(0, 3);
  const declined = health?.explanation.healthDeclinedBecause.slice(0, 3) ?? [];
  const improved = health?.explanation.healthImprovedBecause.slice(0, 3) ?? [];

  const succeededBecause =
    outcomeState === "Target 1 Hit" ||
    outcomeState === "Target 2 Hit" ||
    outcomeState === "Trailing"
      ? drivers.length > 0
        ? drivers
        : improved
      : (["Targets not yet fully realized"] as const);

  const failedBecause =
    outcomeState === "Stop Loss Hit" || outcomeState === "Cancelled"
      ? risks.length > 0
        ? risks
        : declined
      : (["No failure recorded"] as const);

  const stillRunningBecause =
    outcomeState === "Running" ||
    outcomeState === "Entry Triggered" ||
    outcomeState === "Pending Entry"
      ? [
          `Within expected holding period (${snapshot.expectedHoldingPeriod})`,
          ...drivers.slice(0, 2),
        ]
      : (["Not an active running recommendation"] as const);

  const missedTargetBecause =
    outcomeState === "Expired" || outcomeState === "Archived"
      ? [
          "Setup did not reach target within expected holding period",
          ...declined.slice(0, 2),
        ]
      : (["Targets still available or already hit"] as const);

  const stoppedOutBecause =
    outcomeState === "Stop Loss Hit"
      ? [
          "Price violated original stop loss",
          ...risks.slice(0, 2),
        ]
      : (["Stop loss not hit"] as const);

  const expiredBecause =
    outcomeState === "Expired" || outcomeState === "Archived"
      ? [
          `Exceeded or closed after expected holding (${snapshot.expectedHoldingPeriod})`,
          ...declined.slice(0, 2),
        ]
      : (["Not expired"] as const);

  return Object.freeze({
    succeededBecause: Object.freeze([...succeededBecause].slice(0, 4)),
    failedBecause: Object.freeze([...failedBecause].slice(0, 4)),
    stillRunningBecause: Object.freeze([...stillRunningBecause].slice(0, 4)),
    missedTargetBecause: Object.freeze([...missedTargetBecause].slice(0, 4)),
    stoppedOutBecause: Object.freeze([...stoppedOutBecause].slice(0, 4)),
    expiredBecause: Object.freeze([...expiredBecause].slice(0, 4)),
  });
}

export function resolveExitReason(
  outcomeState: RecommendationOutcomeState
): string | null {
  switch (outcomeState) {
    case "Stop Loss Hit":
      return "Stop Loss Hit";
    case "Manual Exit":
      return "Manual Exit";
    case "Expired":
      return "Expired";
    case "Cancelled":
      return "Cancelled";
    case "Target 1 Hit":
      return "Target 1 Achieved";
    case "Target 2 Hit":
      return "Target 2 Achieved";
    case "Trailing":
      return "Trailing";
    case "Archived":
      return "Archived";
    default:
      return null;
  }
}

export function resolveTargetAchieved(
  targets: RecommendationTargetProgress
): string | null {
  if (targets.target2Hit) return "Target 2";
  if (targets.target1Hit) return "Target 1";
  return null;
}

export function summarizeRecommendationOutcomes(
  assessments: readonly {
    state: RecommendationOutcomeState;
    verdict: InstitutionalVerdict;
    performance: RecommendationPerformanceMetrics;
  }[]
): RecommendationOutcomeSummary {
  const total = assessments.length;
  const runningStates = new Set([
    "Pending Entry",
    "Entry Triggered",
    "Running",
    "Trailing",
  ]);
  const completed = assessments.filter((item) => !runningStates.has(item.state));
  const running = assessments.filter((item) => runningStates.has(item.state));

  const target1Hits = assessments.filter(
    (item) =>
      item.state === "Target 1 Hit" ||
      item.state === "Target 2 Hit" ||
      item.state === "Trailing"
  ).length;
  const target2Hits = assessments.filter(
    (item) => item.state === "Target 2 Hit"
  ).length;
  const stopLosses = assessments.filter(
    (item) => item.state === "Stop Loss Hit"
  ).length;
  const successes = assessments.filter((item) =>
    ["Outstanding", "Successful", "Partially Successful"].includes(item.verdict)
  ).length;

  const returns = assessments
    .map((item) => item.performance.currentReturnPercent)
    .filter((value): value is number => value != null);
  const drawdowns = assessments
    .map((item) => item.performance.maximumDrawdownPercent)
    .filter((value): value is number => value != null);
  const gains = assessments
    .map((item) => item.performance.maximumGainPercent)
    .filter((value): value is number => value != null);
  const days = assessments.map((item) => item.performance.daysActive);

  const denom = Math.max(1, completed.length || total);

  return Object.freeze({
    total,
    completed: completed.length,
    running: running.length,
    hitRate: roundMetric((target1Hits / denom) * 100, 1),
    target1Rate: roundMetric((target1Hits / denom) * 100, 1),
    target2Rate: roundMetric((target2Hits / denom) * 100, 1),
    stopLossRate: roundMetric((stopLosses / denom) * 100, 1),
    averageReturn:
      returns.length === 0
        ? null
        : roundMetric(returns.reduce((a, b) => a + b, 0) / returns.length),
    averageHoldingPeriodDays:
      days.length === 0
        ? null
        : roundMetric(days.reduce((a, b) => a + b, 0) / days.length, 1),
    averageDrawdown:
      drawdowns.length === 0
        ? null
        : roundMetric(drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length),
    averageMaximumGain:
      gains.length === 0
        ? null
        : roundMetric(gains.reduce((a, b) => a + b, 0) / gains.length),
    recommendationSuccessRate: roundMetric((successes / Math.max(1, total)) * 100, 1),
  });
}

export function evaluateTargetsAndPerformance(
  snapshot: RecommendationSnapshot,
  lifecycle?: LivingRecommendation | null,
  path?: RecommendationPricePathInput,
  evaluatedAt?: string | Date
) {
  const targets = trackRecommendationTargets(snapshot, lifecycle, path);
  const performance = computeRecommendationPerformance(
    snapshot,
    targets,
    lifecycle,
    path,
    evaluatedAt
  );
  return { targets, performance };
}

export class RecommendationPerformanceEngine {
  compute = computeRecommendationPerformance;
  verdict = getInstitutionalVerdict;
  summarize = summarizeRecommendationOutcomes;
  attribution = buildOutcomeAttribution;
}
