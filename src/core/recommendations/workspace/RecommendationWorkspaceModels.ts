/**
 * Institutional Recommendation Workspace models.
 * Composes immutable R1–R6 evidence — never recalculates conviction or outcomes.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { LivingRecommendation } from "../lifecycle";
import type {
  RecommendationHealthAssessment,
  RecommendationHealthState,
} from "../health";
import type {
  InstitutionalVerdict,
  RecommendationOutcomeAssessment,
} from "../outcomes";
import type {
  RecommendationAILessons,
  RecommendationLearningSummary,
} from "../learning";

export const WORKSPACE_STATUS_FILTERS = [
  "Active",
  "Pending",
  "Running",
  "Completed",
  "Expired",
  "Archived",
] as const;

export type WorkspaceStatusFilter = (typeof WORKSPACE_STATUS_FILTERS)[number];

export const WORKSPACE_HOLDING_FILTERS = [
  "Intraday",
  "Swing",
  "Medium Term",
  "Long Term",
] as const;

export type WorkspaceHoldingFilter = (typeof WORKSPACE_HOLDING_FILTERS)[number];

export const WORKSPACE_HEALTH_FILTERS = [
  "Very Strong",
  "Strong",
  "Healthy",
  "Neutral",
  "Weak",
  "Critical",
] as const;

export type WorkspaceHealthFilter = (typeof WORKSPACE_HEALTH_FILTERS)[number];

export const WORKSPACE_OUTCOME_FILTERS = [
  "Outstanding",
  "Successful",
  "Partially Successful",
  "Neutral",
  "Failed",
  "Invalidated",
] as const;

export type WorkspaceOutcomeFilter =
  (typeof WORKSPACE_OUTCOME_FILTERS)[number];

export const WORKSPACE_STRATEGY_FILTERS = [
  "Momentum",
  "Breakout",
  "Value",
  "Growth",
  "Turnaround",
  "Dividend",
  "Mean Reversion",
] as const;

export type WorkspaceStrategyFilter =
  (typeof WORKSPACE_STRATEGY_FILTERS)[number];

export interface RecommendationSearchCriteria {
  readonly companyName?: string;
  readonly ticker?: string;
  readonly sector?: string;
  readonly industry?: string;
  readonly strategy?: string;
  readonly lifecycleStatus?: string;
  readonly holdingPeriod?: string;
  readonly recommendationDate?: string;
  readonly outcome?: string;
  readonly institutionalVerdict?: string;
  readonly tags?: string | readonly string[];
  readonly aiVersion?: string;
  readonly query?: string;
}

export interface RecommendationFilterCriteria {
  readonly status?: WorkspaceStatusFilter | WorkspaceStatusFilter[];
  readonly holdingPeriod?: WorkspaceHoldingFilter | WorkspaceHoldingFilter[];
  readonly health?: WorkspaceHealthFilter | WorkspaceHealthFilter[];
  readonly outcome?: WorkspaceOutcomeFilter | WorkspaceOutcomeFilter[];
  readonly strategy?: WorkspaceStrategyFilter | WorkspaceStrategyFilter[];
}

/** Flattened institutional record composed from R1–R6 engines. */
export interface RecommendationWorkspaceRecord {
  readonly recommendationId: string;
  readonly snapshot: RecommendationSnapshot;
  readonly companyName: string;
  readonly ticker: string;
  readonly sector: string;
  readonly industry: string;
  readonly strategy: string;
  readonly holdingPeriod: string;
  readonly recommendationDate: string;
  readonly aiVersion: string;
  readonly tags: readonly string[];
  readonly lifecycleStatus: string;
  readonly workspaceStatus: WorkspaceStatusFilter;
  readonly originalConviction: number;
  readonly currentHealth: number | null;
  readonly healthState: RecommendationHealthState | null;
  readonly outcomeState: string | null;
  readonly institutionalVerdict: InstitutionalVerdict | null;
  readonly currentReturnPercent: number | null;
  readonly maximumGainPercent: number | null;
  readonly maximumDrawdownPercent: number | null;
  readonly aiLessons: readonly string[];
  readonly lifecycle: LivingRecommendation | null;
  readonly health: RecommendationHealthAssessment | null;
  readonly outcome: RecommendationOutcomeAssessment | null;
}

export interface RecommendationComparisonRow {
  readonly recommendationId: string;
  readonly symbol: string;
  readonly company: string;
  readonly originalConviction: number;
  readonly currentHealth: number | null;
  readonly outcome: string;
  readonly currentReturn: number | null;
  readonly maximumGain: number | null;
  readonly maximumDrawdown: number | null;
  readonly holdingPeriod: string;
  readonly strategy: string;
  readonly lifecycle: string;
  readonly institutionalVerdict: InstitutionalVerdict | "Pending";
  readonly aiLessons: readonly string[];
}

export interface RecommendationComparisonView {
  readonly recommendationIds: readonly string[];
  readonly rows: readonly RecommendationComparisonRow[];
  readonly empty: boolean;
}

export interface RecommendationDistributionBucket {
  readonly key: string;
  readonly count: number;
  readonly percent: number;
}

export interface RecommendationWorkspaceAnalytics {
  readonly recommendationCount: number;
  readonly activeCount: number;
  readonly completedCount: number;
  readonly successRate: number;
  readonly failureRate: number;
  readonly averageReturn: number | null;
  readonly averageHoldingPeriod: string | null;
  readonly bestStrategy: string | null;
  readonly worstStrategy: string | null;
  readonly bestSector: string | null;
  readonly worstSector: string | null;
  readonly bestMarketRegime: string | null;
  readonly recommendationDistribution: readonly RecommendationDistributionBucket[];
}

export interface ExecutiveRecommendationPanel {
  readonly title: string;
  readonly recommendationIds: readonly string[];
  readonly empty: boolean;
}

export interface RecommendationWorkspaceSections {
  readonly overview: readonly RecommendationWorkspaceRecord[];
  readonly active: readonly RecommendationWorkspaceRecord[];
  readonly completed: readonly RecommendationWorkspaceRecord[];
  readonly archived: readonly RecommendationWorkspaceRecord[];
  readonly replayHistory: readonly RecommendationWorkspaceRecord[];
  readonly analytics: RecommendationWorkspaceAnalytics;
  readonly learningSummary: RecommendationLearningSummary;
  readonly aiLessons: RecommendationAILessons;
}

export interface RecommendationWorkspace {
  readonly generatedAt: string;
  readonly sections: RecommendationWorkspaceSections;
  readonly records: readonly RecommendationWorkspaceRecord[];
  readonly panels: {
    readonly topPerforming: ExecutiveRecommendationPanel;
    readonly highestConviction: ExecutiveRecommendationPanel;
    readonly mostImproved: ExecutiveRecommendationPanel;
    readonly mostDeteriorated: ExecutiveRecommendationPanel;
    readonly recentlyCompleted: ExecutiveRecommendationPanel;
    readonly needsReview: ExecutiveRecommendationPanel;
  };
  readonly analytics: RecommendationWorkspaceAnalytics;
  readonly learningSummary: RecommendationLearningSummary;
  readonly aiLessons: RecommendationAILessons;
}

export type RecommendationWorkspaceExportFormat = "PDF" | "CSV" | "MARKDOWN";

export interface RecommendationWorkspaceExportResult {
  readonly format: RecommendationWorkspaceExportFormat;
  readonly filename: string;
  readonly contentType: string;
  readonly body: string | Uint8Array;
  readonly generatedAt: string;
}

export function normalizeWorkspaceTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Workspace timestamp is invalid");
  }
  return date.toISOString();
}

export function roundWorkspace(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function asArray<T>(value?: T | readonly T[]): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? [...value] : [value as T];
}

export function readSnapshotText(
  record: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  fallback = "Unknown"
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

export function resolveWorkspaceStatus(
  lifecycleStatus: string | null | undefined,
  storageHint?: string | null
): WorkspaceStatusFilter {
  const state = (lifecycleStatus ?? storageHint ?? "GENERATED").toUpperCase();
  if (state === "ARCHIVED") return "Archived";
  if (state === "EXPIRED") return "Expired";
  if (
    state === "GENERATED" ||
    state === "ENTRY_PENDING" ||
    state === "PENDING"
  ) {
    return "Pending";
  }
  if (
    state === "EXITED" ||
    state === "STOP_LOSS_HIT" ||
    state === "MANUAL_EXIT" ||
    state === "CANCELLED" ||
    state === "REJECTED" ||
    state === "INVALIDATED"
  ) {
    return "Completed";
  }
  if (
    state === "ENTRY_TRIGGERED" ||
    state === "ACTIVE" ||
    state === "TARGET_1_HIT" ||
    state === "TARGET_2_HIT" ||
    state === "TRAILING"
  ) {
    return state === "ENTRY_TRIGGERED" || state === "ACTIVE"
      ? "Running"
      : "Active";
  }
  return "Active";
}

export function holdingFilterForPeriod(
  holdingPeriod: string
): WorkspaceHoldingFilter | null {
  const value = holdingPeriod.toLowerCase();
  if (value.includes("today") || value.includes("intraday")) return "Intraday";
  if (value.includes("5") || value.includes("swing") || value.includes("day")) {
    return "Swing";
  }
  if (value.includes("week") || value.includes("positional")) {
    return "Medium Term";
  }
  if (value.includes("month") || value.includes("long")) return "Long Term";
  return null;
}
