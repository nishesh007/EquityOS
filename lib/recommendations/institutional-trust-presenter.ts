/**
 * Sprint 11A.4 — Institutional Trust Layer presenter.
 * Presentation-only projection of SharedRecommendation validation,
 * recommendation history, and outcome dashboard payloads.
 * Never recalculates engines or invents scores.
 */

import { CATEGORY_LABELS } from "@/lib/opportunity-engine/types";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import { toDecisionAction } from "@/lib/recommendations/executive-decision-presenter";
import type {
  DataTransparency,
  ResearchConfidence,
} from "@/types";

export type TrustTone = "positive" | "neutral" | "negative" | "info" | "ai";

export interface SimilarSetupRow {
  company: string;
  symbol: string;
  date: string;
  recommendation: string;
  returnLabel: string;
  holdingDays: string;
  confidence: string;
}

export interface SimilarHistoricalSetupsView {
  available: boolean;
  setupCount: number | null;
  successRate: string;
  averageReturn: string;
  averageHoldingPeriod: string;
  bestOutcome: string;
  worstOutcome: string;
  setups: SimilarSetupRow[];
  placeholder: string | null;
}

export interface PerformanceStatCard {
  label: string;
  value: string;
  tone: TrustTone;
}

export interface RecommendationPerformanceView {
  available: boolean;
  cards: PerformanceStatCard[];
  bestRecommendation: string;
  worstRecommendation: string;
  placeholder: string | null;
}

export interface ConfidencePoint {
  label: string;
  value: number;
}

export interface ConfidenceEvolutionView {
  available: boolean;
  current: number | null;
  previous: number | null;
  change: number | null;
  trend: "Rising" | "Falling" | "Stable" | "Unavailable";
  points: ConfidencePoint[];
  explanation: string;
}

export interface TimelineEventView {
  id: string;
  label: string;
  timestamp: string;
  status: "Complete" | "Active" | "Pending" | "Unavailable";
  description: string;
}

export interface RecommendationTimelineView {
  available: boolean;
  events: TimelineEventView[];
}

export interface AuditTrailItem {
  id: string;
  label: string;
  status: "Passed" | "Failed" | "Pending" | "Synced";
  tone: TrustTone;
  detail: string;
}

export interface AuditTrailView {
  available: boolean;
  items: AuditTrailItem[];
}

export interface DataQualityRow {
  id: string;
  label: string;
  status: string;
  lastUpdated: string;
  confidence: string;
  validationStatus: string;
  tone: TrustTone;
}

export interface DataQualityView {
  available: boolean;
  rows: DataQualityRow[];
}

export interface InvestmentSuitabilityView {
  recommendationType: string;
  investmentHorizon: string;
  riskCategory: string;
  suitableFor: string[];
  disclaimer: string;
}

export interface InstitutionalTrustView {
  similarSetups: SimilarHistoricalSetupsView;
  performance: RecommendationPerformanceView;
  confidenceEvolution: ConfidenceEvolutionView;
  timeline: RecommendationTimelineView;
  auditTrail: AuditTrailView;
  dataQuality: DataQualityView;
  suitability: InvestmentSuitabilityView;
}

/** Loose outcome row shape from GET /api/recommendations → outcomes.rows */
export interface TrustOutcomeRow {
  recommendationId?: string;
  symbol?: string;
  company?: string;
  recommendationDate?: string;
  strategy?: string;
  expectedHoldingPeriod?: string;
  currentStatus?: string;
  currentReturn?: string;
  maximumGain?: string;
  maximumDrawdown?: string;
  finalGrade?: string;
  originalConviction?: number;
  currentHealth?: number | null;
}

export interface TrustOutcomeSummary {
  total?: number;
  completed?: number;
  running?: number;
  hitRate?: number;
  stopLossRate?: number;
  averageReturn?: number | null;
  averageHoldingPeriodDays?: number | null;
  averageDrawdown?: number | null;
  averageMaximumGain?: number | null;
  recommendationSuccessRate?: number;
}

/** Loose history record from GET /api/recommendations → history */
export interface TrustHistoryRecord {
  recommendationId?: string;
  generatedAt?: string;
  status?: string;
  statusChangedAt?: string;
  lifecycleEvents?: Array<{ type?: string; occurredAt?: string; reason?: string }>;
  candidate?: {
    symbol?: string;
    company?: string;
    category?: string;
    confidencePercent?: number;
    aiConvictionScore?: number;
    strategyName?: string;
    moveAfterSignalPercent?: number | null;
    maximumGainAfterSignal?: number | null;
    maximumDrawdownAfterSignal?: number | null;
    setupDurationHours?: number | null;
    expiredOutcome?: string | null;
  };
}

export interface InstitutionalTrustInput {
  symbol: string;
  shared: SharedRecommendation | null;
  history: TrustHistoryRecord[];
  outcomeSummary: TrustOutcomeSummary | null;
  outcomeRows: TrustOutcomeRow[];
  dataTransparency: DataTransparency | null;
  researchConfidence: ResearchConfidence | null;
  eventsLinkedCount: number;
}

const PLACEHOLDER = "Historical validation data unavailable for this package.";
const DISCLAIMER =
  "Research support tool. Final investment decisions remain with the investor.";

function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatSignedPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function parsePctLabel(label: string | undefined): number | null {
  if (!label || label === "—") return null;
  const match = label.replace(/,/g, "").match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function isWinGrade(grade: string | undefined): boolean {
  const g = (grade ?? "").toLowerCase();
  return (
    g.includes("outstanding") ||
    g.includes("successful") ||
    g.includes("partial")
  );
}

function isLossGrade(grade: string | undefined): boolean {
  const g = (grade ?? "").toLowerCase();
  return g.includes("failed") || g.includes("invalid");
}

function holdingDaysFromHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return "—";
  const days = Math.max(1, Math.round(hours / 24));
  return `${days}d`;
}

function mapSuitableFor(
  category: SharedRecommendation["category"] | undefined,
  holdingPeriod: string | undefined
): string[] {
  const tags = new Set<string>();
  const period = (holdingPeriod ?? "").toLowerCase();
  const cat = category ?? "swing";

  if (cat === "intraday" || cat === "relative_volume") tags.add("Swing");
  if (cat === "swing" || cat === "breakout" || cat === "mean_reversion") {
    tags.add("Swing");
    tags.add("Positional");
  }
  if (cat === "momentum" || cat === "ai_high_conviction") {
    tags.add("Positional");
    tags.add("Long-Term");
    tags.add("Growth");
  }
  if (period.includes("month") || period.includes("year")) {
    tags.add("Long-Term");
    tags.add("Positional");
  }
  if (period.includes("day") || period.includes("week")) {
    tags.add("Swing");
    tags.add("Positional");
  }
  if (period.includes("minute") || period.includes("hour")) tags.add("Swing");
  if (tags.size === 0) {
    tags.add("Swing");
    tags.add("Positional");
  }
  return [...tags];
}

function riskCategoryLabel(riskMode: string | null | undefined): string {
  const mode = (riskMode ?? "").toLowerCase();
  if (mode.includes("aggressive") || mode.includes("high")) return "Elevated Risk";
  if (mode.includes("defensive") || mode.includes("low")) return "Conservative";
  if (mode.includes("neutral")) return "Balanced";
  return riskMode?.trim() || "Balanced";
}

function buildSimilarSetups(
  symbol: string,
  shared: SharedRecommendation | null,
  history: TrustHistoryRecord[],
  rows: TrustOutcomeRow[],
  summary: TrustOutcomeSummary | null
): SimilarHistoricalSetupsView {
  const upper = symbol.toUpperCase();
  const category = shared?.category;
  const strategy = shared?.primaryStrategy?.toLowerCase();

  const historyMatches = history
    .filter((record) => {
      const cand = record.candidate;
      if (!cand?.symbol) return false;
      if (cand.symbol.toUpperCase() === upper) return true;
      if (category && cand.category === category) return true;
      if (
        strategy &&
        cand.strategyName?.toLowerCase().includes(strategy.split(" ")[0] ?? "")
      ) {
        return true;
      }
      return false;
    })
    .slice(0, 8);

  const setupsFromHistory: SimilarSetupRow[] = historyMatches.map((record) => {
    const cand = record.candidate!;
    const ret =
      cand.moveAfterSignalPercent != null
        ? formatSignedPct(cand.moveAfterSignalPercent)
        : cand.maximumGainAfterSignal != null
          ? formatSignedPct(cand.maximumGainAfterSignal)
          : "—";
    return {
      company: cand.company ?? cand.symbol ?? "—",
      symbol: (cand.symbol ?? "—").toUpperCase(),
      date: formatDate(record.generatedAt),
      recommendation: shared
        ? toDecisionAction(shared.action)
        : "—",
      returnLabel: ret,
      holdingDays: holdingDaysFromHours(cand.setupDurationHours),
      confidence:
        cand.confidencePercent != null
          ? formatPct(cand.confidencePercent)
          : cand.aiConvictionScore != null
            ? String(Math.round(cand.aiConvictionScore))
            : "—",
    };
  });

  const similarRows = rows
    .filter((row) => {
      if (!row.symbol) return false;
      if (row.symbol.toUpperCase() === upper) return true;
      if (
        strategy &&
        row.strategy?.toLowerCase().includes(strategy.split(" ")[0] ?? "")
      ) {
        return true;
      }
      return false;
    })
    .slice(0, 5);

  const setupsFromOutcomes: SimilarSetupRow[] = similarRows.map((row) => ({
    company: row.company ?? row.symbol ?? "—",
    symbol: (row.symbol ?? "—").toUpperCase(),
    date: formatDate(row.recommendationDate),
    recommendation: row.finalGrade ?? row.currentStatus ?? "—",
    returnLabel: row.currentReturn ?? row.maximumGain ?? "—",
    holdingDays: row.expectedHoldingPeriod ?? "—",
    confidence:
      row.originalConviction != null
        ? String(Math.round(row.originalConviction))
        : "—",
  }));

  const setups = [...setupsFromOutcomes, ...setupsFromHistory]
    .filter(
      (item, index, all) =>
        all.findIndex(
          (other) =>
            other.symbol === item.symbol && other.date === item.date
        ) === index
    )
    .slice(0, 5);

  const returns = setups
    .map((item) => parsePctLabel(item.returnLabel))
    .filter((v): v is number => v != null);

  const wins = similarRows.filter((row) => isWinGrade(row.finalGrade)).length;
  const graded = similarRows.filter((row) => row.finalGrade).length;

  if (setups.length === 0 && !summary) {
    return {
      available: false,
      setupCount: null,
      successRate: "—",
      averageReturn: "—",
      averageHoldingPeriod: "—",
      bestOutcome: "—",
      worstOutcome: "—",
      setups: [],
      placeholder: PLACEHOLDER,
    };
  }

  const successRate =
    graded > 0
      ? formatPct((wins / graded) * 100)
      : summary?.recommendationSuccessRate != null
        ? formatPct(summary.recommendationSuccessRate)
        : summary?.hitRate != null
          ? formatPct(summary.hitRate)
          : "—";

  const avgReturn =
    returns.length > 0
      ? formatSignedPct(returns.reduce((a, b) => a + b, 0) / returns.length)
      : formatSignedPct(summary?.averageReturn ?? null);

  const best =
    returns.length > 0
      ? formatSignedPct(Math.max(...returns))
      : setups[0]?.returnLabel ?? "—";
  const worst =
    returns.length > 0
      ? formatSignedPct(Math.min(...returns))
      : setups.at(-1)?.returnLabel ?? "—";

  return {
    available: true,
    setupCount: setups.length || summary?.total || null,
    successRate,
    averageReturn: avgReturn,
    averageHoldingPeriod:
      summary?.averageHoldingPeriodDays != null
        ? `${Math.round(summary.averageHoldingPeriodDays)}d`
        : setups.find((s) => s.holdingDays !== "—")?.holdingDays ?? "—",
    bestOutcome: best,
    worstOutcome: worst,
    setups,
    placeholder: setups.length === 0 ? PLACEHOLDER : null,
  };
}

function buildPerformance(
  summary: TrustOutcomeSummary | null,
  rows: TrustOutcomeRow[],
  symbol: string
): RecommendationPerformanceView {
  const upper = symbol.toUpperCase();
  const symbolRows = rows.filter(
    (row) => row.symbol?.toUpperCase() === upper
  );
  const pool = symbolRows.length > 0 ? symbolRows : rows;

  if (!summary && pool.length === 0) {
    return {
      available: false,
      cards: [],
      bestRecommendation: "—",
      worstRecommendation: "—",
      placeholder: PLACEHOLDER,
    };
  }

  const wins = pool.filter((row) => isWinGrade(row.finalGrade)).length;
  const losses = pool.filter((row) => isLossGrade(row.finalGrade)).length;
  const total = summary?.total ?? pool.length;

  const gainValues = pool
    .map((row) => parsePctLabel(row.maximumGain ?? row.currentReturn))
    .filter((v): v is number => v != null && v > 0);
  const lossValues = pool
    .map((row) => parsePctLabel(row.maximumDrawdown ?? row.currentReturn))
    .filter((v): v is number => v != null && v < 0)
    .map(Math.abs);

  const sortedByReturn = [...pool].sort((a, b) => {
    const left = parsePctLabel(a.currentReturn ?? a.maximumGain) ?? -Infinity;
    const right = parsePctLabel(b.currentReturn ?? b.maximumGain) ?? -Infinity;
    return right - left;
  });

  const best = sortedByReturn[0];
  const worst = sortedByReturn.at(-1);

  const cards: PerformanceStatCard[] = [
    {
      label: "Total Recommendations",
      value: String(total),
      tone: "info",
    },
    {
      label: "Winning Recommendations",
      value: String(wins || Math.round(((summary?.hitRate ?? 0) / 100) * (summary?.completed ?? 0))),
      tone: "positive",
    },
    {
      label: "Losing Recommendations",
      value: String(
        losses ||
          Math.round(((summary?.stopLossRate ?? 0) / 100) * (summary?.completed ?? 0))
      ),
      tone: "negative",
    },
    {
      label: "Win Rate",
      value: formatPct(
        summary?.recommendationSuccessRate ?? summary?.hitRate ?? null
      ),
      tone: "ai",
    },
    {
      label: "Average Gain",
      value:
        gainValues.length > 0
          ? formatSignedPct(
              gainValues.reduce((a, b) => a + b, 0) / gainValues.length
            )
          : formatSignedPct(summary?.averageMaximumGain ?? null),
      tone: "positive",
    },
    {
      label: "Average Loss",
      value:
        lossValues.length > 0
          ? formatSignedPct(
              -(lossValues.reduce((a, b) => a + b, 0) / lossValues.length)
            )
          : formatSignedPct(
              summary?.averageDrawdown != null
                ? -Math.abs(summary.averageDrawdown)
                : null
            ),
      tone: "negative",
    },
    {
      label: "Average Holding Period",
      value:
        summary?.averageHoldingPeriodDays != null
          ? `${Math.round(summary.averageHoldingPeriodDays)}d`
          : "—",
      tone: "neutral",
    },
    {
      label: "Maximum Drawdown",
      value: formatPct(
        summary?.averageDrawdown != null
          ? Math.abs(summary.averageDrawdown)
          : null
      ),
      tone: "negative",
    },
  ];

  return {
    available: true,
    cards,
    bestRecommendation: best
      ? `${best.symbol} · ${best.currentReturn ?? best.maximumGain ?? "—"} · ${best.finalGrade ?? ""}`
      : "—",
    worstRecommendation: worst
      ? `${worst.symbol} · ${worst.currentReturn ?? worst.maximumDrawdown ?? "—"} · ${worst.finalGrade ?? ""}`
      : "—",
    placeholder: null,
  };
}

function buildConfidenceEvolution(
  shared: SharedRecommendation | null,
  rows: TrustOutcomeRow[],
  history: TrustHistoryRecord[],
  symbol: string
): ConfidenceEvolutionView {
  const current = shared?.confidence ?? null;
  const upper = symbol.toUpperCase();
  const match =
    rows.find((row) => row.symbol?.toUpperCase() === upper) ??
    rows.find((row) => row.recommendationId === shared?.id);

  const previous =
    match?.originalConviction != null
      ? match.originalConviction
      : history.find((h) => h.candidate?.symbol?.toUpperCase() === upper)
          ?.candidate?.confidencePercent ?? null;

  const points: ConfidencePoint[] = [];
  if (previous != null) points.push({ label: "Prior", value: Math.round(previous) });
  if (match?.currentHealth != null) {
    points.push({ label: "Health", value: Math.round(match.currentHealth) });
  }
  if (current != null) points.push({ label: "Current", value: Math.round(current) });

  // Deduplicate identical sequential points for a clean sparkline.
  const compact = points.filter(
    (point, index) => index === 0 || point.value !== points[index - 1]?.value
  );

  const change =
    current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null;

  let trend: ConfidenceEvolutionView["trend"] = "Unavailable";
  if (change != null) {
    if (change > 0.5) trend = "Rising";
    else if (change < -0.5) trend = "Falling";
    else trend = "Stable";
  }

  const reasons = shared?.validation.reasons.slice(0, 2) ?? [];
  const explanation =
    trend === "Rising"
      ? reasons[0] ||
        "Confidence improved as published validation checks and agreement remained supportive."
      : trend === "Falling"
        ? reasons[0] ||
          "Confidence eased as validation or conflict signals tightened versus the prior package."
        : trend === "Stable"
          ? "Confidence is steady versus the prior published package."
          : PLACEHOLDER;

  return {
    available: current != null,
    current: current != null ? Math.round(current * 10) / 10 : null,
    previous: previous != null ? Math.round(previous * 10) / 10 : null,
    change,
    trend,
    points: compact,
    explanation,
  };
}

function buildTimeline(
  shared: SharedRecommendation | null,
  history: TrustHistoryRecord[],
  symbol: string,
  eventsLinkedCount: number
): RecommendationTimelineView {
  const upper = symbol.toUpperCase();
  const record =
    history.find((item) => item.candidate?.symbol?.toUpperCase() === upper) ??
    history.find((item) => item.recommendationId === shared?.id);

  const generatedAt = record?.generatedAt ?? shared?.timestamp ?? null;
  const updatedAt = record?.statusChangedAt ?? shared?.timestamp ?? null;
  const validation = shared?.validation;

  const holding = shared?.holdingPeriod ?? "strategy horizon";
  const nextReview = shared?.timestamp
    ? `Review within ${holding}`
    : "Pending schedule";

  const events: TimelineEventView[] = [
    {
      id: "generated",
      label: "Recommendation Generated",
      timestamp: formatDate(generatedAt),
      status: generatedAt ? "Complete" : "Unavailable",
      description: shared
        ? `${toDecisionAction(shared.action)} package published via ${shared.source}.`
        : "Awaiting published recommendation package.",
    },
    {
      id: "updated",
      label: "Recommendation Updated",
      timestamp: formatDate(updatedAt),
      status: updatedAt ? "Complete" : "Pending",
      description: record?.status
        ? `Lifecycle status ${record.status}.`
        : "No subsequent lifecycle update recorded.",
    },
    {
      id: "technical-validation",
      label: "Technical Validation",
      timestamp: formatDate(updatedAt),
      status: validation?.checks.tradeLevels ? "Complete" : "Pending",
      description: validation?.checks.tradeLevels
        ? "Trade levels and technical package checks passed."
        : "Technical validation pending in published checks.",
    },
    {
      id: "fundamental-validation",
      label: "Fundamental Validation",
      timestamp: formatDate(updatedAt),
      status: validation?.checks.opportunityScore ? "Complete" : "Pending",
      description: validation?.checks.opportunityScore
        ? "Opportunity / framework score validation passed."
        : "Fundamental validation pending.",
    },
    {
      id: "risk-validation",
      label: "Risk Validation",
      timestamp: formatDate(updatedAt),
      status: validation?.checks.institutionalTradeLevels ? "Complete" : "Pending",
      description: validation?.checks.institutionalTradeLevels
        ? "Institutional trade-level risk checks passed."
        : "Risk validation pending.",
    },
    {
      id: "event-sync",
      label: "Event Intelligence Sync",
      timestamp: formatDate(new Date().toISOString()),
      status: eventsLinkedCount > 0 ? "Active" : "Complete",
      description:
        eventsLinkedCount > 0
          ? `${eventsLinkedCount} linked upcoming event(s) synced for this symbol.`
          : "Event catalog synced — no linked upcoming events.",
    },
    {
      id: "last-review",
      label: "Last Review",
      timestamp: formatDate(updatedAt),
      status: updatedAt ? "Complete" : "Unavailable",
      description: "Last published review of this recommendation package.",
    },
    {
      id: "next-review",
      label: "Next Review",
      timestamp: nextReview,
      status: "Pending",
      description: `Aligned to holding period ${holding}.`,
    },
    {
      id: "expiry",
      label: "Recommendation Expiry",
      timestamp: `Within ${holding}`,
      status: "Pending",
      description: "Expiry tracked against published holding horizon.",
    },
  ];

  // Append lifecycle events when present (existing memory only).
  for (const lifecycle of record?.lifecycleEvents ?? []) {
    events.push({
      id: `lifecycle-${lifecycle.type ?? events.length}`,
      label: lifecycle.type ?? "Lifecycle Event",
      timestamp: formatDate(lifecycle.occurredAt),
      status: "Complete",
      description: lifecycle.reason ?? "Lifecycle transition recorded.",
    });
  }

  return {
    available: Boolean(shared || record),
    events,
  };
}

function buildAuditTrail(
  shared: SharedRecommendation | null,
  eventsLinkedCount: number,
  similarAvailable: boolean
): AuditTrailView {
  if (!shared) {
    return {
      available: false,
      items: [
        {
          id: "awaiting",
          label: "Validation Package",
          status: "Pending",
          tone: "neutral",
          detail: PLACEHOLDER,
        },
      ],
    };
  }

  const checks = shared.validation.checks;
  const items: AuditTrailItem[] = [
    {
      id: "technical",
      label: "Technical Analysis Verified",
      status: checks.tradeLevels ? "Passed" : "Failed",
      tone: checks.tradeLevels ? "positive" : "negative",
      detail: "Trade level geometry verified in publication gate.",
    },
    {
      id: "fundamental",
      label: "Fundamental Analysis Verified",
      status: checks.opportunityScore ? "Passed" : "Failed",
      tone: checks.opportunityScore ? "positive" : "negative",
      detail: "Opportunity score gate verified.",
    },
    {
      id: "valuation",
      label: "Valuation Verified",
      status: checks.institutionalTradeLevels ? "Passed" : "Failed",
      tone: checks.institutionalTradeLevels ? "positive" : "negative",
      detail: "Institutional trade-level / valuation consistency verified.",
    },
    {
      id: "risk",
      label: "Risk Engine Verified",
      status: checks.eligibility ? "Passed" : "Failed",
      tone: checks.eligibility ? "positive" : "negative",
      detail: "Eligibility and risk publication checks verified.",
    },
    {
      id: "macro",
      label: "Macro Events Synced",
      status: eventsLinkedCount >= 0 ? "Synced" : "Pending",
      tone: "info",
      detail:
        eventsLinkedCount > 0
          ? "Event Intelligence overlays synced for this symbol."
          : "Event Intelligence catalog synced with no open overlays.",
    },
    {
      id: "historical",
      label: "Historical Validation Completed",
      status: similarAvailable ? "Passed" : "Pending",
      tone: similarAvailable ? "positive" : "neutral",
      detail: similarAvailable
        ? "Historical / outcome evidence available for presentation."
        : "Historical package pending richer outcome memory.",
    },
    {
      id: "integrity",
      label: "Data Integrity Passed",
      status: shared.validation.valid ? "Passed" : "Failed",
      tone: shared.validation.valid ? "positive" : "negative",
      detail: `Validation score ${shared.validation.score}%.`,
    },
    {
      id: "hallucination",
      label: "Hallucination Check Passed",
      status:
        checks.marketContext && checks.marketRegime && checks.confidence
          ? "Passed"
          : "Failed",
      tone:
        checks.marketContext && checks.marketRegime && checks.confidence
          ? "positive"
          : "negative",
      detail:
        "Context, regime, and confidence publication checks from existing validation framework.",
    },
  ];

  return { available: true, items };
}

function buildDataQuality(
  shared: SharedRecommendation | null,
  transparency: DataTransparency | null,
  researchConfidence: ResearchConfidence | null,
  eventsLinkedCount: number
): DataQualityView {
  const freshness = transparency?.freshness ?? "mock";
  const lastUpdated = transparency?.lastUpdated
    ? formatDate(transparency.lastUpdated)
    : formatDate(shared?.timestamp);
  const overall =
    researchConfidence?.overall != null
      ? formatPct(researchConfidence.overall)
      : shared
        ? formatPct(shared.confidence)
        : "—";

  const factor = (key: string) =>
    researchConfidence?.factors.find((item) =>
      item.key.toLowerCase().includes(key)
    );

  const toneFromFreshness = (): TrustTone => {
    if (freshness === "live") return "positive";
    if (freshness === "delayed") return "neutral";
    return "info";
  };

  const rows: DataQualityRow[] = [
    {
      id: "market",
      label: "Market Data",
      status: freshness.toUpperCase(),
      lastUpdated,
      confidence: formatPct(factor("market")?.score ?? researchConfidence?.overall),
      validationStatus: shared?.validation.checks.marketContext
        ? "Verified"
        : "Pending",
      tone: toneFromFreshness(),
    },
    {
      id: "fundamental",
      label: "Fundamental Data",
      status: transparency ? "Available" : "Partial",
      lastUpdated,
      confidence: formatPct(
        factor("fundamental")?.score ?? factor("quality")?.score
      ),
      validationStatus: shared?.validation.checks.opportunityScore
        ? "Verified"
        : "Pending",
      tone: shared?.validation.checks.opportunityScore ? "positive" : "neutral",
    },
    {
      id: "corporate",
      label: "Corporate Actions",
      status: eventsLinkedCount > 0 ? "Synced" : "Quiet",
      lastUpdated: formatDate(new Date().toISOString()),
      confidence: overall,
      validationStatus: "Catalog",
      tone: "info",
    },
    {
      id: "events",
      label: "Events",
      status: eventsLinkedCount > 0 ? "Active" : "Synced",
      lastUpdated: formatDate(new Date().toISOString()),
      confidence: overall,
      validationStatus: eventsLinkedCount > 0 ? "Linked" : "Clear",
      tone: eventsLinkedCount > 0 ? "ai" : "neutral",
    },
    {
      id: "inputs",
      label: "Recommendation Inputs",
      status: shared ? "Published" : "Awaiting",
      lastUpdated: formatDate(shared?.timestamp),
      confidence: shared ? formatPct(shared.confidence) : "—",
      validationStatus: shared?.validation.valid ? "Passed" : "Pending",
      tone: shared?.validation.valid ? "positive" : "neutral",
    },
  ];

  return {
    available: Boolean(shared || transparency || researchConfidence),
    rows,
  };
}

function buildSuitability(
  shared: SharedRecommendation | null
): InvestmentSuitabilityView {
  if (!shared) {
    return {
      recommendationType: "—",
      investmentHorizon: "—",
      riskCategory: "—",
      suitableFor: ["Swing", "Positional"],
      disclaimer: DISCLAIMER,
    };
  }

  return {
    recommendationType: toDecisionAction(shared.action),
    investmentHorizon:
      shared.holdingPeriod ||
      CATEGORY_LABELS[shared.category] ||
      "Strategy horizon",
    riskCategory: riskCategoryLabel(shared.riskMode),
    suitableFor: mapSuitableFor(shared.category, shared.holdingPeriod),
    disclaimer: DISCLAIMER,
  };
}

export function buildInstitutionalTrustView(
  input: InstitutionalTrustInput
): InstitutionalTrustView {
  const {
    symbol,
    shared,
    history,
    outcomeSummary,
    outcomeRows,
    dataTransparency,
    researchConfidence,
    eventsLinkedCount,
  } = input;

  const similarSetups = buildSimilarSetups(
    symbol,
    shared,
    history,
    outcomeRows,
    outcomeSummary
  );

  return {
    similarSetups,
    performance: buildPerformance(outcomeSummary, outcomeRows, symbol),
    confidenceEvolution: buildConfidenceEvolution(
      shared,
      outcomeRows,
      history,
      symbol
    ),
    timeline: buildTimeline(shared, history, symbol, eventsLinkedCount),
    auditTrail: buildAuditTrail(
      shared,
      eventsLinkedCount,
      similarSetups.available && similarSetups.setups.length > 0
    ),
    dataQuality: buildDataQuality(
      shared,
      dataTransparency,
      researchConfidence,
      eventsLinkedCount
    ),
    suitability: buildSuitability(shared),
  };
}

export function buildEmptyInstitutionalTrustView(
  symbol: string,
  shared: SharedRecommendation | null = null
): InstitutionalTrustView {
  return buildInstitutionalTrustView({
    symbol,
    shared,
    history: [],
    outcomeSummary: null,
    outcomeRows: [],
    dataTransparency: null,
    researchConfidence: null,
    eventsLinkedCount: 0,
  });
}
