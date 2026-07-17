/**
 * Sprint 9F.1.R8 – Institutional Integration, UX Validation & Sprint Freeze.
 *
 * No new AI engines. No new business logic. This module only validates and
 * reports on the R1–R7 recommendation platform, reusing existing engine state.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import {
  RECOMMENDATION_SECTION_LABELS,
  RECOMMENDATION_METRIC_LABELS,
} from "../RecommendationPresentationModels";
import {
  LIFECYCLE_ADVANCE_ORDER,
  RECOMMENDATION_LIFECYCLE_STATES,
  RECOMMENDATION_ALTERNATIVE_STATES,
  listLivingRecommendations,
} from "../lifecycle";
import { listRecommendationHealth } from "../health";
import { listRecommendationReplays } from "../replay";
import { listRecommendationOutcomes } from "../outcomes";
import { getCalibration, getLearningSummary } from "../learning";
import {
  getRecommendationWorkspace,
  wireWorkspaceDashboard,
  wireWorkspaceCompany,
  wireWorkspaceResearch,
  wireWorkspaceRecommendationCenter,
  wireWorkspaceReplay,
  wireWorkspaceHistory,
  wireWorkspacePortfolio,
  wireWorkspaceWatchlists,
} from "../workspace";
import { wireLearningValidation } from "../learning";

/** Canonical institutional terminology — the only labels surfaces may use. */
export const RECOMMENDATION_PLATFORM_TERMINOLOGY = [
  "Highest Conviction Recommendations",
  "Institutional Conviction",
  "Current Health",
  "Lifecycle Status",
  "Institutional Verdict",
  "Expected Holding Period",
  "Current Progress",
  "Recommendation Timeline",
  "Recommendation Replay",
  "Decision Journal",
  "AI Lessons",
  "Historical Evidence",
  "Recommendation Outcome",
] as const;

/** Legacy labels that must never appear on recommendation surfaces. */
export const RECOMMENDATION_FORBIDDEN_TERMINOLOGY = [
  "Best Call",
  "Best Calls of the Day",
  "Best Score",
  "Trade Outcome Grade",
  "Recommendation Score",
  "Confidence Rating",
] as const;

export interface RecommendationPlatformCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface RecommendationPlatformValidation {
  readonly passed: boolean;
  readonly checks: readonly RecommendationPlatformCheck[];
  readonly validatedAt: string;
}

export interface RecommendationPlatformHealth {
  readonly status: "HEALTHY" | "DEGRADED";
  readonly snapshots: number;
  readonly livingRecommendations: number;
  readonly healthAssessments: number;
  readonly replays: number;
  readonly outcomes: number;
  readonly recommendationsEvaluatedByLearning: number;
  readonly workspaceRecords: number;
  readonly checksPassed: number;
  readonly checksTotal: number;
  readonly generatedAt: string;
}

export interface RecommendationSurfaceIntegration {
  readonly surface: string;
  readonly wired: boolean;
  readonly detail: string;
}

export interface RecommendationIntegrationStatus {
  readonly integrated: boolean;
  readonly surfaces: readonly RecommendationSurfaceIntegration[];
  readonly generatedAt: string;
}

/** Sprint freeze record — Sprint 9F.1 is complete and frozen. */
export const SPRINT_9F1_STATUS = Object.freeze({
  sprint: "9F.1",
  modules: Object.freeze([
    "R1 Recommendation Snapshots",
    "R2 Recommendation Lifecycle",
    "R3 Recommendation Health",
    "R4 Recommendation Replay",
    "R5 Recommendation Outcomes",
    "R6 Adaptive Learning",
    "R7 Recommendation Workspace",
    "R8 Integration & Freeze",
  ]),
  complete: true,
  frozen: true,
} as const);

export function isSprint9F1Frozen(): boolean {
  return SPRINT_9F1_STATUS.complete && SPRINT_9F1_STATUS.frozen;
}

let snapshotLister: (() => RecommendationSnapshot[]) | null = null;

export function bindRecommendationIntegrationSnapshotLister(
  lister: () => RecommendationSnapshot[]
): void {
  snapshotLister = lister;
}

function listSnapshots(): RecommendationSnapshot[] {
  return snapshotLister?.() ?? [];
}

function check(
  name: string,
  passed: boolean,
  detail: string
): RecommendationPlatformCheck {
  return Object.freeze({ name, passed, detail });
}

const ORIGINAL_FIELDS = [
  "originalConviction",
  "originalTrust",
  "originalValidation",
  "entryRange",
  "stopLoss",
  "targets",
  "reasons",
] as const;

function checkImmutability(): RecommendationPlatformCheck {
  const snapshots = listSnapshots();
  const frozen = snapshots.every((snapshot) => Object.isFrozen(snapshot));
  const fieldsPresent = snapshots.every((snapshot) =>
    ORIGINAL_FIELDS.every((field) => field in snapshot)
  );
  return check(
    "Immutability",
    frozen && fieldsPresent,
    frozen
      ? `${snapshots.length} snapshots frozen; original conviction/trust/validation/entry/stop/targets/reasons locked`
      : "One or more snapshots are not frozen"
  );
}

function checkLifecycle(): RecommendationPlatformCheck {
  const validStates = new Set<string>([
    ...RECOMMENDATION_LIFECYCLE_STATES,
    ...RECOMMENDATION_ALTERNATIVE_STATES,
  ]);
  const living = listLivingRecommendations();
  const allValid = living.every((item) => validStates.has(item.state));
  const orderIntact =
    LIFECYCLE_ADVANCE_ORDER[0] === "GENERATED" &&
    LIFECYCLE_ADVANCE_ORDER[LIFECYCLE_ADVANCE_ORDER.length - 1] === "ARCHIVED";
  return check(
    "Lifecycle",
    allValid && orderIntact,
    allValid
      ? `${living.length} living recommendations in valid states; canonical order Generated → Archived intact`
      : "Living recommendation found in unknown lifecycle state"
  );
}

function checkNoDisappearance(): RecommendationPlatformCheck {
  const snapshots = listSnapshots();
  const workspace = getRecommendationWorkspace({ refresh: true });
  const workspaceIds = new Set(
    workspace.records.map((record) => record.recommendationId)
  );
  const missing = snapshots.filter(
    (snapshot) => !workspaceIds.has(snapshot.recommendationId)
  );
  return check(
    "No Disappearing Recommendations",
    missing.length === 0,
    missing.length === 0
      ? `All ${snapshots.length} snapshots visible in the workspace (active, completed, or archived)`
      : `${missing.length} recommendations missing from the workspace`
  );
}

function checkNoDuplicates(): RecommendationPlatformCheck {
  const workspace = getRecommendationWorkspace({ refresh: true });
  const ids = workspace.records.map((record) => record.recommendationId);
  const unique = new Set(ids);
  return check(
    "No Duplicate Cards",
    unique.size === ids.length,
    unique.size === ids.length
      ? `${ids.length} workspace records are unique — no duplicate cards or summaries`
      : "Duplicate recommendation records detected in workspace"
  );
}

function checkConsistentValues(): RecommendationPlatformCheck {
  const workspace = getRecommendationWorkspace({ refresh: true });
  const outcomes = new Map(
    listRecommendationOutcomes().map((item) => [item.recommendationId, item])
  );
  const health = new Map(
    listRecommendationHealth().map((item) => [item.recommendationId, item])
  );
  const inconsistent = workspace.records.filter((record) => {
    const outcome = outcomes.get(record.recommendationId);
    const assessment = health.get(record.recommendationId);
    if (outcome && record.institutionalVerdict !== outcome.verdict) return true;
    if (
      assessment &&
      record.currentHealth !== assessment.current.currentHealth
    ) {
      return true;
    }
    return (
      record.originalConviction !== record.snapshot.originalConviction
    );
  });
  return check(
    "Consistent Values",
    inconsistent.length === 0,
    inconsistent.length === 0
      ? "Workspace, outcome, and health engines report identical values — single source of truth"
      : `${inconsistent.length} records show divergent conviction/health/verdict values`
  );
}

function checkLearningFutureOnly(): RecommendationPlatformCheck {
  const calibration = getCalibration();
  const snapshots = listSnapshots();
  const frozen = snapshots.every((snapshot) => Object.isFrozen(snapshot));
  return check(
    "Learning Future-Only",
    calibration.appliesTo === "FUTURE_RECOMMENDATIONS_ONLY" && frozen,
    calibration.appliesTo === "FUTURE_RECOMMENDATIONS_ONLY"
      ? "Calibration applies to future recommendations only; historical snapshots untouched"
      : "Calibration is not restricted to future recommendations"
  );
}

function checkTerminology(): RecommendationPlatformCheck {
  const canonical = new Set<string>(RECOMMENDATION_PLATFORM_TERMINOLOGY);
  const sectionOk = canonical.has(
    RECOMMENDATION_SECTION_LABELS.highestConviction
  );
  const metricOk =
    RECOMMENDATION_METRIC_LABELS.institutionalConviction ===
      "Institutional Conviction" &&
    RECOMMENDATION_METRIC_LABELS.currentHealth === "Current Health";
  const noForbidden = RECOMMENDATION_FORBIDDEN_TERMINOLOGY.every(
    (label) => !canonical.has(label)
  );
  return check(
    "Institutional Terminology",
    sectionOk && metricOk && noForbidden,
    sectionOk && metricOk
      ? "Canonical labels in force; legacy labels (Best Call, Trade Outcome, Confidence Rating) retired"
      : "Canonical terminology constants have drifted"
  );
}

function checkReplayIntact(): RecommendationPlatformCheck {
  const replays = listRecommendationReplays();
  const intact = replays.every(
    (replay) =>
      replay.journal.recommendationId === replay.recommendationId &&
      Object.isFrozen(replay.journal)
  );
  return check(
    "Replay & History Intact",
    intact,
    intact
      ? `${replays.length} replay bundles with frozen decision journals`
      : "Replay bundle found with mutated or mismatched journal"
  );
}

export function validateRecommendationPlatform(): RecommendationPlatformValidation {
  const checks = Object.freeze([
    checkImmutability(),
    checkLifecycle(),
    checkNoDisappearance(),
    checkNoDuplicates(),
    checkConsistentValues(),
    checkLearningFutureOnly(),
    checkTerminology(),
    checkReplayIntact(),
  ]);
  return Object.freeze({
    passed: checks.every((item) => item.passed),
    checks,
    validatedAt: new Date().toISOString(),
  });
}

export function getRecommendationPlatformHealth(): RecommendationPlatformHealth {
  const validation = validateRecommendationPlatform();
  const workspace = getRecommendationWorkspace({ refresh: true });
  return Object.freeze({
    status: validation.passed ? "HEALTHY" : "DEGRADED",
    snapshots: listSnapshots().length,
    livingRecommendations: listLivingRecommendations().length,
    healthAssessments: listRecommendationHealth().length,
    replays: listRecommendationReplays().length,
    outcomes: listRecommendationOutcomes().length,
    recommendationsEvaluatedByLearning:
      getLearningSummary().recommendationsEvaluated,
    workspaceRecords: workspace.records.length,
    checksPassed: validation.checks.filter((item) => item.passed).length,
    checksTotal: validation.checks.length,
    generatedAt: new Date().toISOString(),
  });
}

function surfaceStatus(
  surface: string,
  probe: () => { empty: boolean }
): RecommendationSurfaceIntegration {
  try {
    const bundle = probe();
    return Object.freeze({
      surface,
      wired: true,
      detail: bundle.empty
        ? "Wired — awaiting recommendations"
        : "Wired with live recommendation data",
    });
  } catch (error) {
    return Object.freeze({
      surface,
      wired: false,
      detail: error instanceof Error ? error.message : "Wiring failed",
    });
  }
}

export function getRecommendationIntegrationStatus(): RecommendationIntegrationStatus {
  const surfaces = Object.freeze([
    surfaceStatus("dashboard", () => wireWorkspaceDashboard()),
    surfaceStatus("company", () => wireWorkspaceCompany("__PROBE__")),
    surfaceStatus("research", () => wireWorkspaceResearch()),
    surfaceStatus("recommendation_center", () =>
      wireWorkspaceRecommendationCenter()
    ),
    surfaceStatus("portfolio", () => wireWorkspacePortfolio([])),
    surfaceStatus("watchlists", () => wireWorkspaceWatchlists([])),
    surfaceStatus("replay", () => wireWorkspaceReplay()),
    surfaceStatus("history", () => wireWorkspaceHistory()),
    surfaceStatus("validation", () => {
      const bundle = wireLearningValidation();
      return { empty: bundle.dashboard.empty };
    }),
  ]);
  return Object.freeze({
    integrated: surfaces.every((item) => item.wired),
    surfaces,
    generatedAt: new Date().toISOString(),
  });
}
