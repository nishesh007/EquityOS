/**
 * AI Accountability + Audit + Outcome Review + Executive Review.
 * Composes R1 snapshot, R2 lifecycle, and R3 health — no recalculation.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  LivingRecommendation,
  RecommendationLivingState,
  RecommendationTimelineEvent,
} from "../lifecycle/RecommendationLifecycleModels";
import type { RecommendationHealthAssessment } from "../health/RecommendationHealthModels";
import { buildDecisionJournal } from "./RecommendationDecisionJournal";
import type {
  CurrentMarketReplayInput,
  RecommendationAccountabilityView,
  RecommendationAuditRecord,
  RecommendationComparisonView,
  RecommendationExecutiveReview,
  RecommendationOutcome,
  RecommendationVerdict,
} from "./RecommendationReplayModels";
import { normalizeReplayTimestamp } from "./RecommendationReplayModels";

const OUTCOME_BY_STATE: Partial<
  Record<RecommendationLivingState, RecommendationOutcome>
> = {
  TARGET_1_HIT: "Target 1 Hit",
  TARGET_2_HIT: "Target 2 Hit",
  STOP_LOSS_HIT: "Stop Loss Hit",
  MANUAL_EXIT: "Manual Exit",
  INVALIDATED: "Invalidated",
  EXPIRED: "Expired",
  EXITED: "Successful",
  ARCHIVED: "Expired",
};

export function resolveRecommendationOutcome(
  lifecycle: LivingRecommendation | null | undefined,
  health: RecommendationHealthAssessment | null | undefined
): RecommendationOutcome | "Pending" {
  if (health?.invalidated) return "Invalidated";
  const state = lifecycle?.state;
  if (!state) return "Pending";
  if (OUTCOME_BY_STATE[state]) return OUTCOME_BY_STATE[state]!;

  if (state === "TRAILING" || state === "ACTIVE" || state === "ENTRY_TRIGGERED") {
    const healthScore = health?.current.currentHealth;
    if (healthScore != null && healthScore >= 80) return "Partially Successful";
    return "Pending";
  }

  if (
    state === "GENERATED" ||
    state === "ENTRY_PENDING" ||
    state === "CANCELLED" ||
    state === "REJECTED"
  ) {
    if (state === "CANCELLED" || state === "REJECTED") return "Failed";
    return "Pending";
  }

  return "Pending";
}

function originalTrendLabel(snapshot: RecommendationSnapshot): string {
  const tech = snapshot.technicalSnapshot as Record<string, unknown>;
  const trend = tech.trend;
  if (typeof trend === "string") return trend;
  if (trend && typeof trend === "object" && "direction" in trend) {
    return String((trend as { direction: unknown }).direction);
  }
  return "Unknown";
}

export function buildComparisonView(
  snapshot: RecommendationSnapshot,
  health: RecommendationHealthAssessment | null | undefined,
  market?: CurrentMarketReplayInput
): RecommendationComparisonView {
  const currentFactors =
    health?.factors
      .filter((factor) => factor.currentScore != null)
      .map((factor) => `${factor.label} (${factor.currentScore})`) ?? [];

  return Object.freeze({
    originalConviction: snapshot.originalConviction,
    currentHealth: health?.current.currentHealth ?? null,
    originalReasons: Object.freeze([...snapshot.reasons]),
    currentFactors: Object.freeze(currentFactors),
    originalTrend: market?.trendLabel?.trim() || originalTrendLabel(snapshot),
    currentTrend: health?.trend ?? "Unknown",
    originalRisk: Object.freeze([...snapshot.riskFactors]),
    currentRisk: health?.current.currentRisk ?? null,
    originalEntryLow: snapshot.entryRange.low,
    originalEntryHigh: snapshot.entryRange.high,
    originalStop: snapshot.stopLoss,
    originalTargets: Object.freeze(snapshot.targets.map((t) => t.price)),
  });
}

export function buildAccountabilityView(
  snapshot: RecommendationSnapshot,
  health: RecommendationHealthAssessment | null | undefined,
  outcome: RecommendationOutcome | "Pending"
): RecommendationAccountabilityView {
  const explanation = health?.explanation;
  const whatAiSaw = [
    `Conviction ${snapshot.originalConviction}`,
    `Trust ${snapshot.originalTrust}`,
    ...Object.entries(snapshot.technicalSnapshot as Record<string, unknown>)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${summarizeValue(value)}`),
    `Market: ${summarizeValue(snapshot.marketSnapshot)}`,
    `Sector: ${summarizeValue(snapshot.sectorSnapshot)}`,
  ].slice(0, 6);

  return Object.freeze({
    whatAiSaw: Object.freeze(whatAiSaw),
    whyAiRecommended: Object.freeze([
      ...(snapshot.convictionDrivers.length > 0
        ? snapshot.convictionDrivers
        : snapshot.reasons),
    ]),
    whatChanged: Object.freeze([
      ...(explanation?.healthDeclinedBecause.filter(
        (line) => !/No material decline/i.test(line)
      ) ?? []),
      ...(explanation?.healthImprovedBecause.filter(
        (line) => !/No material improvement/i.test(line)
      ) ?? []),
    ].slice(0, 6)),
    whatStayedValid: Object.freeze([
      ...(explanation?.stillValidBecause ?? snapshot.reasons.slice(0, 3)),
    ]),
    whyHealthImproved: Object.freeze([
      ...(explanation?.healthImprovedBecause ?? ["No material improvement detected"]),
    ]),
    whyHealthDeclined: Object.freeze([
      ...(explanation?.healthDeclinedBecause ?? ["No material decline detected"]),
    ]),
    finalOutcome: outcome,
  });
}

function summarizeValue(value: unknown): string {
  if (value == null) return "n/a";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[complex]";
  }
}

export function buildAiLessons(
  snapshot: RecommendationSnapshot,
  health: RecommendationHealthAssessment | null | undefined,
  timeline: readonly RecommendationTimelineEvent[],
  outcome: RecommendationOutcome | "Pending"
): string[] {
  const lessons: string[] = [];
  if (outcome === "Stop Loss Hit") {
    lessons.push("Respect original stop discipline when momentum fails");
  }
  if (outcome === "Target 1 Hit" || outcome === "Target 2 Hit" || outcome === "Successful") {
    lessons.push("Original conviction drivers aligned with realized path");
  }
  if (outcome === "Expired") {
    lessons.push("Time-based expiry remains necessary when setups stall");
  }
  if (health?.trend === "Weakening") {
    lessons.push("Monitor sector and relative strength drift after publication");
  }
  if (health?.trend === "Improving") {
    lessons.push("Health improvements can validate holding through noise");
  }
  if (timeline.some((event) => event.state === "INVALIDATED")) {
    lessons.push("Invalidation events must remain permanent in the audit trail");
  }
  if (lessons.length === 0) {
    lessons.push(
      `Preserve immutable snapshot ${snapshot.recommendationId} for accountability`
    );
  }
  return lessons.slice(0, 5);
}

export function resolveVerdict(
  outcome: RecommendationOutcome | "Pending",
  health: RecommendationHealthAssessment | null | undefined
): RecommendationVerdict {
  switch (outcome) {
    case "Successful":
    case "Target 1 Hit":
    case "Target 2 Hit":
      return "Validated";
    case "Partially Successful":
      return "Partially Validated";
    case "Failed":
    case "Stop Loss Hit":
    case "Invalidated":
      return "Invalidated";
    case "Expired":
    case "Manual Exit":
      return health?.trend === "Improving" ? "Partially Validated" : "Inconclusive";
    default:
      return "Pending";
  }
}

export function buildExecutiveReview(
  snapshot: RecommendationSnapshot,
  health: RecommendationHealthAssessment | null | undefined,
  timeline: readonly RecommendationTimelineEvent[],
  outcome: RecommendationOutcome | "Pending"
): RecommendationExecutiveReview {
  const lessons = buildAiLessons(snapshot, health, timeline, outcome);
  const turningPoints = timeline
    .filter((event) =>
      [
        "ENTRY_TRIGGERED",
        "TARGET_1_HIT",
        "TARGET_2_HIT",
        "STOP_LOSS_HIT",
        "EXPIRED",
        "INVALIDATED",
        "MANUAL_EXIT",
      ].includes(event.state)
    )
    .map((event) => `${event.type} @ ${event.occurredAt}`);

  const original = snapshot.originalConviction;
  const current = health?.current.currentHealth;
  const confidenceEvolution =
    current == null
      ? `Original conviction ${original} — current health awaiting update`
      : `Original conviction ${original} → current health ${current} (${health?.trend ?? "Stable"})`;

  return Object.freeze({
    recommendationSummary: `${snapshot.company.symbol} ${snapshot.strategy} · conviction ${original}`,
    decisionSummary:
      snapshot.convictionDrivers.slice(0, 2).join("; ") ||
      snapshot.reasons.slice(0, 2).join("; ") ||
      "Decision captured in immutable snapshot",
    confidenceEvolution,
    majorTurningPoints: Object.freeze(
      turningPoints.length > 0
        ? turningPoints
        : (["No major turning points recorded yet"] as const)
    ),
    aiLessons: Object.freeze(lessons),
    recommendationVerdict: resolveVerdict(outcome, health),
  });
}

export function buildRecommendationAudit(
  snapshot: RecommendationSnapshot,
  lifecycle: LivingRecommendation | null | undefined,
  health: RecommendationHealthAssessment | null | undefined,
  timeline: readonly RecommendationTimelineEvent[] = [],
  market?: CurrentMarketReplayInput,
  auditedAt?: string | Date
): RecommendationAuditRecord {
  const outcome = resolveRecommendationOutcome(lifecycle, health);
  const journal = buildDecisionJournal(snapshot);
  const accountability = buildAccountabilityView(snapshot, health, outcome);
  const comparison = buildComparisonView(snapshot, health, market);
  const executiveReview = buildExecutiveReview(
    snapshot,
    health,
    timeline,
    outcome
  );

  return Object.freeze({
    recommendationId: snapshot.recommendationId,
    journal,
    accountability,
    comparison,
    executiveReview,
    outcome,
    auditedAt: normalizeReplayTimestamp(auditedAt),
    snapshotFrozen: true as const,
  });
}

export class RecommendationAuditEngine {
  audit = buildRecommendationAudit;
  outcome = resolveRecommendationOutcome;
  compare = buildComparisonView;
  lessons = buildAiLessons;
  executive = buildExecutiveReview;
}
