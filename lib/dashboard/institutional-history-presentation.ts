/**
 * Institutional historical visibility — presentation only.
 * Reuses candidate timelines, platform/ops audit, and existing scores.
 * No new storage, no scoring changes, no validation mutations.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
  TimelineEvent,
} from "@/lib/opportunity-engine/institutional-presentation";
import { formatOptionalTimestamp } from "@/lib/dashboard/display-value";

const NA = "N/A";
const NO_HISTORY = "No History Yet";
const AWAITING = "Awaiting Validation";
const ARCHIVED = "Archived";
const UNAVAILABLE = "History Unavailable";

export type TimelineFilterSource =
  | "All"
  | "Validation"
  | "Trust"
  | "Recommendation"
  | "AI"
  | "Platform"
  | "Security"
  | "Compliance";

export type InstitutionalTimelineSection =
  | "Recommendation Created"
  | "Validation Passed"
  | "Trust Updated"
  | "AI Analysis Generated"
  | "Confidence Changed"
  | "Target Updated"
  | "Stop Loss Updated"
  | "Recommendation Upgraded"
  | "Recommendation Downgraded"
  | "Expired"
  | "Archived";

export interface InstitutionalTimelineEvent {
  id: string;
  section: InstitutionalTimelineSection | string;
  label: string;
  timestamp: string | null;
  engine: string;
  source: TimelineFilterSource;
  oldValue: string;
  newValue: string;
  reason: string;
  evidence: string;
  confidence: string;
  validationGrade: string;
  trustGrade: string;
  available: boolean;
}

export interface DecisionAuditView {
  decisionTime: string;
  decisionVersion: string;
  recommendationVersion: string;
  validationVersion: string;
  trustVersion: string;
  aiVersion: string;
  platformVersion: string;
  executionId: string;
  snapshotId: string;
  empty: boolean;
  emptyMessage: string;
}

export interface ConfidenceHistoryPoint {
  id: string;
  label: string;
  at: string | null;
  confidence: number | null;
  validation: number | null;
  trust: number | null;
  composite: number | null;
  institutionalGrade: string;
  status: string;
}

export interface ConfidenceHistoryView {
  points: ConfidenceHistoryPoint[];
  confidenceTrend: string;
  validationTrend: string;
  trustTrend: string;
  compositeTrend: string;
  gradeTrend: string;
  statusChanges: string[];
  empty: boolean;
  emptyMessage: string;
}

export interface GroupedTimeline {
  source: TimelineFilterSource;
  label: string;
  events: InstitutionalTimelineEvent[];
}

export interface InstitutionalHistoryView {
  events: InstitutionalTimelineEvent[];
  filtered: InstitutionalTimelineEvent[];
  grouped: GroupedTimeline[];
  audit: DecisionAuditView;
  confidenceHistory: ConfidenceHistoryView;
  filter: TimelineFilterSource;
  empty: boolean;
  emptyMessage: string;
}

function disp(value: number | null | undefined, fallback = NA): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  if (value === 0) return fallback;
  return String(Math.round(value));
}

function grade(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score) || score === 0) return AWAITING;
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  return "D";
}

function compositeOf(
  confidence: number | null | undefined,
  validation: number | null | undefined,
  trust: number | null | undefined
): number | null {
  const parts = [confidence, validation, trust].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > 0
  );
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function trendFromPoints(
  points: ConfidenceHistoryPoint[],
  key: "confidence" | "validation" | "trust" | "composite"
): string {
  const series = points
    .map((p) => p[key])
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  if (series.length < 2) return UNAVAILABLE;
  const delta = series[series.length - 1]! - series[0]!;
  if (delta > 1) return "Improving";
  if (delta < -1) return "Deteriorating";
  return "Stable";
}

function mapSource(engine: string, section: string): TimelineFilterSource {
  const blob = `${engine} ${section}`.toLowerCase();
  if (/validat/.test(blob)) return "Validation";
  if (/trust/.test(blob)) return "Trust";
  if (/recommend|rank|target|stop|expired|archiv/.test(blob)) return "Recommendation";
  if (/ai|confidence|explain|analysis/.test(blob)) return "AI";
  if (/secur/.test(blob)) return "Security";
  if (/complian/.test(blob)) return "Compliance";
  if (/platform|certif|snapshot|health|scheduler/.test(blob)) return "Platform";
  return "Recommendation";
}

function event(
  partial: Omit<InstitutionalTimelineEvent, "available"> & { available?: boolean }
): InstitutionalTimelineEvent {
  return {
    ...partial,
    oldValue: partial.oldValue || NA,
    newValue: partial.newValue || NA,
    reason: partial.reason || NA,
    evidence: partial.evidence || NA,
    confidence: partial.confidence || NA,
    validationGrade: partial.validationGrade || AWAITING,
    trustGrade: partial.trustGrade || AWAITING,
    available: partial.available ?? Boolean(partial.timestamp),
  };
}

/** Build institutional timeline from existing candidate + platform audit (read-only). */
export function buildTimeline(input: {
  view?: InstitutionalCandidateView | null;
  candidate?: OpportunityCandidate | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): InstitutionalTimelineEvent[] {
  const view = input.view ?? null;
  const candidate = input.candidate ?? null;
  const snapshot = input.snapshot ?? null;
  const events: InstitutionalTimelineEvent[] = [];

  const conf = view?.confidence ?? candidate?.confidencePercent ?? null;
  const validation = view?.validationScore ?? null;
  const trust = view?.trustScore ?? null;
  const vGrade = grade(validation);
  const tGrade = grade(trust);
  const confDisp = disp(conf, AWAITING);

  if (candidate?.firstDetectedAt || view?.generatedAt) {
    events.push(
      event({
        id: "rec-created",
        section: "Recommendation Created",
        label: "Recommendation Created",
        timestamp: candidate?.firstDetectedAt ?? view?.generatedAt ?? null,
        engine: "Opportunity Engine",
        source: "Recommendation",
        oldValue: NA,
        newValue: candidate
          ? `${candidate.symbol} · ${candidate.category} · ${candidate.side}`
          : "Recommendation published",
        reason: view?.primaryReasons[0] ?? candidate?.reason?.split("\n")[0] ?? NA,
        evidence: view?.decisionTrace[0] ?? NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  if (
    (candidate?.confidenceReasonContributions?.length ?? 0) > 0 ||
    (view?.validationTrace.length ?? 0) > 0
  ) {
    events.push(
      event({
        id: "validation-passed",
        section: "Validation Passed",
        label: "Validation Passed",
        timestamp: candidate?.firstDetectedAt ?? view?.generatedAt ?? null,
        engine: "Validation Engine",
        source: "Validation",
        oldValue: AWAITING,
        newValue: disp(validation, "Passed"),
        reason: "Rule contributions / validation trace attached",
        evidence: view?.validationTrace.join("; ") || NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  if (candidate?.convictionComponents || trust != null) {
    events.push(
      event({
        id: "trust-updated",
        section: "Trust Updated",
        label: "Trust Updated",
        timestamp: candidate?.lastDetectedAt ?? view?.lastUpdatedAt ?? null,
        engine: "Trust Engine",
        source: "Trust",
        oldValue: AWAITING,
        newValue: disp(trust, AWAITING),
        reason: "Trust score from institutional trust metrics",
        evidence:
          view?.badges.find((b) => b.id === "HIGH_TRUST")?.label ?? NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  if (
    (candidate?.confidenceReasons?.length ?? 0) > 0 ||
    (view?.explainabilityScore != null && view.explainabilityScore > 0)
  ) {
    events.push(
      event({
        id: "ai-analysis",
        section: "AI Analysis Generated",
        label: "AI Analysis Generated",
        timestamp: candidate?.firstDetectedAt ?? view?.generatedAt ?? null,
        engine: "AI / Explainability Engine",
        source: "AI",
        oldValue: NA,
        newValue: disp(view?.explainabilityScore ?? candidate?.aiConvictionScore, AWAITING),
        reason: view?.primaryReasons[0] ?? NA,
        evidence: view?.decisionTrace.slice(0, 2).join("; ") || NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  if (candidate?.lastUpdatedAt && candidate.lastUpdatedAt !== candidate.firstDetectedAt) {
    events.push(
      event({
        id: "confidence-changed",
        section: "Confidence Changed",
        label: "Confidence Changed",
        timestamp: candidate.lastUpdatedAt,
        engine: "Explainability Engine",
        source: "AI",
        oldValue: UNAVAILABLE,
        newValue: confDisp,
        reason: "Confidence refreshed on last update",
        evidence:
          view?.confidenceDistribution
            .slice(0, 2)
            .map((r) => `${r.label} (${r.contribution})`)
            .join("; ") || NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  if (candidate?.target1 != null) {
    events.push(
      event({
        id: "target-updated",
        section: "Target Updated",
        label: "Target Updated",
        timestamp: candidate.lastUpdatedAt ?? candidate.lastDetectedAt ?? null,
        engine: "Opportunity Engine",
        source: "Recommendation",
        oldValue: NA,
        newValue: `T1 ${candidate.target1} · T2 ${candidate.target2}`,
        reason: "Target levels from ranked opportunity setup",
        evidence: `R/R ${candidate.riskReward}`,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
        available: true,
      })
    );
  }

  if (candidate?.stopLoss != null) {
    events.push(
      event({
        id: "stop-updated",
        section: "Stop Loss Updated",
        label: "Stop Loss Updated",
        timestamp: candidate.lastUpdatedAt ?? candidate.lastDetectedAt ?? null,
        engine: "Opportunity Engine",
        source: "Recommendation",
        oldValue: NA,
        newValue: String(candidate.stopLoss),
        reason: "Stop loss from opportunity setup",
        evidence: `Entry ${candidate.entryZone.low}-${candidate.entryZone.high}`,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
        available: true,
      })
    );
  }

  if (
    candidate?.previousRank != null &&
    candidate.rank != null &&
    candidate.previousRank !== candidate.rank
  ) {
    const upgraded = candidate.rank < candidate.previousRank;
    events.push(
      event({
        id: upgraded ? "rec-upgraded" : "rec-downgraded",
        section: upgraded ? "Recommendation Upgraded" : "Recommendation Downgraded",
        label: upgraded ? "Recommendation Upgraded" : "Recommendation Downgraded",
        timestamp: candidate.lastUpdatedAt ?? candidate.lastDetectedAt ?? null,
        engine: "Opportunity Engine",
        source: "Recommendation",
        oldValue: `Rank #${candidate.previousRank}`,
        newValue: `Rank #${candidate.rank}`,
        reason: upgraded ? "Rank improved" : "Rank declined",
        evidence: view?.primaryReasons[0] ?? NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  if (candidate?.expiredOutcome || candidate?.expiredReason) {
    events.push(
      event({
        id: "expired",
        section: "Expired",
        label: "Expired",
        timestamp: candidate.peakTime ?? candidate.lastUpdatedAt ?? null,
        engine: "Opportunity Engine",
        source: "Recommendation",
        oldValue: "Active",
        newValue: String(candidate.expiredOutcome ?? ARCHIVED),
        reason: candidate.expiredReason ?? NA,
        evidence: NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  // Existing recommendation timeline events (normalized)
  for (const te of view?.timeline ?? []) {
    if (!te.available) continue;
    events.push(
      event({
        id: `view-${te.id}`,
        section: te.label,
        label: te.label,
        timestamp: te.at,
        engine: "Recommendation Timeline",
        source: mapSource("Recommendation", te.label),
        oldValue: NA,
        newValue: te.label,
        reason: "Lifecycle event from institutional recommendation timeline",
        evidence: NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
      })
    );
  }

  // Platform / ops audit (read-only, already fetched)
  for (const entry of snapshot?.operations?.audit ?? []) {
    events.push(
      event({
        id: `audit-${entry.timestamp}-${entry.event}`,
        section: entry.event,
        label: entry.event,
        timestamp: entry.timestamp,
        engine: "Platform Engine",
        source: mapSource("Platform", entry.event),
        oldValue: NA,
        newValue: entry.event,
        reason:
          entry.errors?.[0] ?? entry.warnings?.[0] ?? "Platform audit event",
        evidence:
          entry.errors?.length || entry.warnings?.length
            ? [...(entry.errors ?? []), ...(entry.warnings ?? [])].join("; ")
            : NA,
        confidence: NA,
        validationGrade: grade(snapshot?.platform?.overallHealthScore),
        trustGrade: grade(
          snapshot?.trust?.averageTrustScore ?? snapshot?.platform?.overallTrustScore
        ),
      })
    );
  }

  // Archived marker when day snapshot context is absent but expired
  if (!candidate?.expiredOutcome && candidate?.reasonMissed) {
    events.push(
      event({
        id: "archived-missed",
        section: "Archived",
        label: "Archived",
        timestamp: candidate.lastUpdatedAt ?? null,
        engine: "Opportunity Engine",
        source: "Recommendation",
        oldValue: "Active watch",
        newValue: ARCHIVED,
        reason: candidate.reasonMissed,
        evidence: NA,
        confidence: confDisp,
        validationGrade: vGrade,
        trustGrade: tGrade,
        available: Boolean(candidate.reasonMissed),
      })
    );
  }

  return sortTimelineEvents(events);
}

export function sortTimelineEvents(
  events: InstitutionalTimelineEvent[]
): InstitutionalTimelineEvent[] {
  return [...events].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });
}

export function filterTimelineEvents(
  events: InstitutionalTimelineEvent[],
  filter: TimelineFilterSource
): InstitutionalTimelineEvent[] {
  if (filter === "All") return events;
  return events.filter((e) => e.source === filter);
}

/** Group timeline events by source engine domain. */
export function groupTimelineEvents(
  events: InstitutionalTimelineEvent[]
): GroupedTimeline[] {
  const order: TimelineFilterSource[] = [
    "Recommendation",
    "Validation",
    "Trust",
    "AI",
    "Platform",
    "Security",
    "Compliance",
  ];
  const map = new Map<TimelineFilterSource, InstitutionalTimelineEvent[]>();
  for (const e of events) {
    const list = map.get(e.source) ?? [];
    list.push(e);
    map.set(e.source, list);
  }
  return order
    .filter((source) => (map.get(source)?.length ?? 0) > 0)
    .map((source) => ({
      source,
      label: source,
      events: map.get(source) ?? [],
    }));
}

/** Decision audit metadata from existing snapshot / candidate fields. */
export function buildDecisionAudit(input: {
  view?: InstitutionalCandidateView | null;
  candidate?: OpportunityCandidate | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): DecisionAuditView {
  const view = input.view ?? null;
  const candidate = input.candidate ?? null;
  const snapshot = input.snapshot ?? null;
  const ops = snapshot?.operations;

  const decisionTime = formatOptionalTimestamp(
    candidate?.lastUpdatedAt ?? view?.lastUpdatedAt ?? ops?.metrics?.lastRunAt,
    AWAITING
  );

  const hasAny =
    Boolean(candidate || view || ops?.status || snapshot?.platform);

  if (!hasAny) {
    return {
      decisionTime: AWAITING,
      decisionVersion: UNAVAILABLE,
      recommendationVersion: UNAVAILABLE,
      validationVersion: UNAVAILABLE,
      trustVersion: UNAVAILABLE,
      aiVersion: UNAVAILABLE,
      platformVersion: UNAVAILABLE,
      executionId: UNAVAILABLE,
      snapshotId: UNAVAILABLE,
      empty: true,
      emptyMessage: NO_HISTORY,
    };
  }

  return {
    decisionTime,
    decisionVersion: ops?.status?.engineVersion ?? snapshot?.dashboard?.engineVersion ?? NA,
    recommendationVersion: disp(view?.recommendationQuality, NA),
    validationVersion: disp(
      view?.validationScore ?? snapshot?.platform?.overallHealthScore,
      NA
    ),
    trustVersion: disp(
      view?.trustScore ?? snapshot?.trust?.averageTrustScore,
      NA
    ),
    aiVersion: "Sprint 9E",
    platformVersion: ops?.status?.engineVersion ?? NA,
    executionId: candidate?.id ?? view?.timeline[0]?.id ?? NA,
    snapshotId:
      ops?.metrics?.snapshotCount != null && ops.metrics.snapshotCount > 0
        ? `ops-snapshots:${ops.metrics.snapshotCount}`
        : UNAVAILABLE,
    empty: false,
    emptyMessage: NO_HISTORY,
  };
}

/** Confidence / validation / trust evolution from existing timestamps (presentation). */
export function buildConfidenceHistory(input: {
  view?: InstitutionalCandidateView | null;
  candidate?: OpportunityCandidate | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): ConfidenceHistoryView {
  const view = input.view ?? null;
  const candidate = input.candidate ?? null;
  const snapshot = input.snapshot ?? null;

  const points: ConfidenceHistoryPoint[] = [];

  const conf = view?.confidence ?? candidate?.confidencePercent ?? null;
  const validation =
    view?.validationScore ??
    snapshot?.dashboard?.health.overallHealthScore ??
    snapshot?.platform?.overallHealthScore ??
    null;
  const trust =
    view?.trustScore ??
    snapshot?.trust?.averageTrustScore ??
    snapshot?.platform?.overallTrustScore ??
    null;

  const createdAt = candidate?.firstDetectedAt ?? view?.generatedAt ?? null;
  if (createdAt) {
    points.push({
      id: "created",
      label: "Created",
      at: createdAt,
      confidence: conf,
      validation,
      trust,
      composite: compositeOf(conf, validation, trust),
      institutionalGrade: grade(compositeOf(conf, validation, trust)),
      status: "Created",
    });
  }

  if (
    candidate?.lastDetectedAt &&
    candidate.lastDetectedAt !== createdAt
  ) {
    points.push({
      id: "detected",
      label: "Last Detected",
      at: candidate.lastDetectedAt,
      confidence: conf,
      validation,
      trust,
      composite: compositeOf(conf, validation, trust),
      institutionalGrade: grade(compositeOf(conf, validation, trust)),
      status: "Active",
    });
  }

  const updatedAt = candidate?.lastUpdatedAt ?? view?.lastUpdatedAt ?? null;
  if (updatedAt && updatedAt !== createdAt && updatedAt !== candidate?.lastDetectedAt) {
    points.push({
      id: "updated",
      label: "Last Updated",
      at: updatedAt,
      confidence: conf,
      validation,
      trust,
      composite: compositeOf(conf, validation, trust),
      institutionalGrade: grade(compositeOf(conf, validation, trust)),
      status:
        candidate?.previousRank != null && candidate.rank < candidate.previousRank
          ? "Upgraded"
          : candidate?.previousRank != null && candidate.rank > candidate.previousRank
            ? "Downgraded"
            : "Updated",
    });
  }

  // Platform health audit points with healthScore if present in summary timestamps
  if (snapshot?.operations?.metrics?.lastRunAt) {
    points.push({
      id: "platform",
      label: "Platform Sync",
      at: snapshot.operations.metrics.lastRunAt,
      confidence: conf,
      validation: snapshot.platform?.overallHealthScore ?? validation,
      trust: snapshot.platform?.overallTrustScore ?? trust,
      composite: compositeOf(
        conf,
        snapshot.platform?.overallHealthScore ?? validation,
        snapshot.platform?.overallTrustScore ?? trust
      ),
      institutionalGrade: grade(snapshot.platform?.overallHealthScore),
      status: snapshot.platform?.overallValidationStatus ?? "Synced",
    });
  }

  if (candidate?.expiredOutcome) {
    points.push({
      id: "expired",
      label: "Expired",
      at: candidate.peakTime ?? candidate.lastUpdatedAt ?? null,
      confidence: conf,
      validation,
      trust,
      composite: compositeOf(conf, validation, trust),
      institutionalGrade: grade(compositeOf(conf, validation, trust)),
      status: String(candidate.expiredOutcome),
    });
  }

  const unique = points.filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  );

  if (unique.length === 0) {
    return {
      points: [],
      confidenceTrend: UNAVAILABLE,
      validationTrend: UNAVAILABLE,
      trustTrend: UNAVAILABLE,
      compositeTrend: UNAVAILABLE,
      gradeTrend: UNAVAILABLE,
      statusChanges: [],
      empty: true,
      emptyMessage: NO_HISTORY,
    };
  }

  const statusChanges = unique
    .map((p) => `${p.label}: ${p.status}`)
    .filter(Boolean);

  return {
    points: unique,
    confidenceTrend: trendFromPoints(unique, "confidence"),
    validationTrend: trendFromPoints(unique, "validation"),
    trustTrend: trendFromPoints(unique, "trust"),
    compositeTrend: trendFromPoints(unique, "composite"),
    gradeTrend:
      unique.length >= 2
        ? `${unique[0]!.institutionalGrade} → ${unique[unique.length - 1]!.institutionalGrade}`
        : unique[0]?.institutionalGrade ?? UNAVAILABLE,
    statusChanges,
    empty: false,
    emptyMessage: NO_HISTORY,
  };
}

/** Full history view with filter applied. */
export function buildInstitutionalHistoryView(input: {
  view?: InstitutionalCandidateView | null;
  candidate?: OpportunityCandidate | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  filter?: TimelineFilterSource;
}): InstitutionalHistoryView {
  const filter = input.filter ?? "All";
  const events = buildTimeline(input);
  const filtered = filterTimelineEvents(events, filter);
  const audit = buildDecisionAudit(input);
  const confidenceHistory = buildConfidenceHistory(input);
  const empty = filtered.length === 0;

  return {
    events,
    filtered,
    grouped: groupTimelineEvents(filtered),
    audit,
    confidenceHistory,
    filter,
    empty,
    emptyMessage: empty
      ? input.candidate || input.view
        ? NO_HISTORY
        : UNAVAILABLE
      : NO_HISTORY,
  };
}

/** Convert to legacy TimelineEvent[] for existing RecommendationTimeline reuse. */
export function toLegacyTimelineEvents(
  events: InstitutionalTimelineEvent[]
): TimelineEvent[] {
  return events.map((e) => ({
    id: e.id,
    label: e.label,
    at: e.timestamp,
    available: e.available,
  }));
}

export const TIMELINE_FILTERS: TimelineFilterSource[] = [
  "All",
  "Validation",
  "Trust",
  "Recommendation",
  "AI",
  "Platform",
  "Security",
  "Compliance",
];

export const HISTORY_EMPTY = {
  NO_HISTORY,
  AWAITING,
  ARCHIVED,
  UNAVAILABLE,
  NA,
} as const;
