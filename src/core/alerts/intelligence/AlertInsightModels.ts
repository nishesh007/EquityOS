/**
 * Alert insight models — Earnings / News / Corporate Action / Transcript (Sprint 9C.R3).
 */

import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";
import type { AlertDecision } from "./AlertDecisionEngine";
import { INTELLIGENCE_ALERT_EMPTY } from "./AlertPresentationModels";

export const EVENT_ALERT_EMPTY = {
  noEarnings: INTELLIGENCE_ALERT_EMPTY.noEarnings,
  noNews: INTELLIGENCE_ALERT_EMPTY.noNews,
  noCorporateActions: INTELLIGENCE_ALERT_EMPTY.noCorporateActions,
  awaitingResults: INTELLIGENCE_ALERT_EMPTY.awaitingResults,
  transcriptPending: INTELLIGENCE_ALERT_EMPTY.transcriptPending,
  awaitingAnalysis: INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis,
} as const;

/** Earnings alert kinds */
export const EARNINGS_EVENT_ALERT_KINDS = [
  "upcoming_earnings",
  "earnings_tomorrow",
  "earnings_today",
  "results_published",
  "eps_beat",
  "eps_miss",
  "revenue_beat",
  "revenue_miss",
  "guidance_raised",
  "guidance_lowered",
  "margin_expansion",
  "margin_compression",
  "management_commentary_published",
  "transcript_available",
  "conference_call_scheduled",
  "conference_call_live",
  "conference_call_summary_ready",
] as const;

export type EarningsEventAlertKind = (typeof EARNINGS_EVENT_ALERT_KINDS)[number];

export const EARNINGS_EVENT_KIND_LABELS: Record<EarningsEventAlertKind, string> = {
  upcoming_earnings: "Upcoming Earnings",
  earnings_tomorrow: "Earnings Tomorrow",
  earnings_today: "Earnings Today",
  results_published: "Results Published",
  eps_beat: "EPS Beat",
  eps_miss: "EPS Miss",
  revenue_beat: "Revenue Beat",
  revenue_miss: "Revenue Miss",
  guidance_raised: "Guidance Raised",
  guidance_lowered: "Guidance Lowered",
  margin_expansion: "Margin Expansion",
  margin_compression: "Margin Compression",
  management_commentary_published: "Management Commentary Published",
  transcript_available: "Transcript Available",
  conference_call_scheduled: "Conference Call Scheduled",
  conference_call_live: "Conference Call Live",
  conference_call_summary_ready: "Conference Call Summary Ready",
};

/** News alert kinds */
export const NEWS_ALERT_KINDS = [
  "breaking_news",
  "positive_news",
  "negative_news",
  "sector_news",
  "macro_news",
  "policy_news",
  "analyst_upgrade",
  "analyst_downgrade",
  "target_price_change",
  "large_order_win",
  "major_contract",
  "management_change",
] as const;

export type NewsAlertKind = (typeof NEWS_ALERT_KINDS)[number];

export const NEWS_KIND_LABELS: Record<NewsAlertKind, string> = {
  breaking_news: "Breaking News",
  positive_news: "Positive News",
  negative_news: "Negative News",
  sector_news: "Sector News",
  macro_news: "Macro News",
  policy_news: "Policy News",
  analyst_upgrade: "Analyst Upgrade",
  analyst_downgrade: "Analyst Downgrade",
  target_price_change: "Target Price Change",
  large_order_win: "Large Order Win",
  major_contract: "Major Contract",
  management_change: "Management Change",
};

/** Corporate action alert kinds */
export const CORPORATE_ACTION_ALERT_KINDS = [
  "dividend",
  "bonus",
  "split",
  "rights_issue",
  "buyback",
  "merger",
  "acquisition",
  "demerger",
  "board_meeting",
  "agm",
  "shareholding_change",
  "promoter_activity",
] as const;

export type CorporateActionAlertKind =
  (typeof CORPORATE_ACTION_ALERT_KINDS)[number];

export const CORPORATE_ACTION_KIND_LABELS: Record<
  CorporateActionAlertKind,
  string
> = {
  dividend: "Dividend",
  bonus: "Bonus",
  split: "Split",
  rights_issue: "Rights Issue",
  buyback: "Buyback",
  merger: "Merger",
  acquisition: "Acquisition",
  demerger: "Demerger",
  board_meeting: "Board Meeting",
  agm: "AGM",
  shareholding_change: "Shareholding Change",
  promoter_activity: "Promoter Activity",
};

export interface EarningsEventSnapshot {
  ticker: string;
  company: string;
  resultDate: string;
  resultTime?: string | null;
  hoursUntil?: number | null;
  isToday?: boolean;
  isTomorrow?: boolean;
  isUpcoming?: boolean;
  isReleased?: boolean;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  epsOutcome?: string | null;
  revenueOutcome?: string | null;
  overallOutcome?: string | null;
  guidanceChange?: string | null;
  marginSignal?: "expansion" | "compression" | "none" | null;
  hasTranscript?: boolean;
  hasManagementCommentary?: boolean;
  conferenceCallStatus?:
    | "scheduled"
    | "live"
    | "summary_ready"
    | "none"
    | null;
  confidenceScore?: number | null;
  sector?: string | null;
}

export interface NewsAlertSnapshot {
  id: string;
  symbol?: string | null;
  company?: string | null;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  category?: string | null;
  sentiment?: "positive" | "negative" | "neutral" | null;
  tags?: readonly string[] | null;
  sector?: string | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number | null;
  businessImpact?: number | null;
  urgency?: number | null;
}

export interface CorporateActionAlertSnapshot {
  id: string;
  symbol: string;
  company: string;
  type: string;
  date: string;
  title: string;
  description: string;
  value?: string | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number | null;
}

export interface TranscriptAlertSnapshot {
  ticker: string;
  company: string;
  resultDate: string;
  available: boolean;
  hasConferenceCall?: boolean;
  summaryReady?: boolean;
  managementSentiment?: string | null;
  guidanceChange?: string | null;
  catalysts?: readonly string[] | null;
  risks?: readonly string[] | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number | null;
}

export interface ManagementCommentarySnapshot {
  ticker: string;
  company: string;
  resultDate: string;
  published: boolean;
  tone?: string | null;
  highlights?: readonly string[] | null;
  guidanceChange?: string | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number | null;
}

/** Presentation card with R3 headline fields */
export interface EventAlertInsightCard {
  headline: string;
  summary: string;
  reason: string;
  evidence: string[];
  category: string;
  priority: string;
  severity: string;
  confidence: string;
  relatedEvent: string;
  relatedCompany: string;
  relatedReport: string;
  timestamp: string;
  sourceEngine: string;
  ticker: string;
  inPortfolio: boolean;
  inWatchlist: boolean;
  id: string;
  ready: boolean;
  emptyMessage: string;
}

export function toEventAlertInsightCard(input: {
  id: string;
  title: string;
  summary: string;
  reason: string;
  evidence: readonly string[];
  category: string;
  priority: string;
  severity: string;
  confidenceLabel: string;
  relatedEvent?: string | null;
  relatedCompany?: string | null;
  relatedReport?: string | null;
  timestamp: string;
  sourceEngine: string;
  ticker?: string | null;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
}): EventAlertInsightCard {
  return {
    id: input.id,
    headline: safeAlertText(input.title, "Alert"),
    summary: safeAlertText(input.summary, input.title),
    reason: safeAlertText(input.reason, "Generated from event intelligence"),
    evidence: input.evidence.map((e) => safeAlertText(e, "")).filter(Boolean),
    category: safeAlertText(input.category, "Platform"),
    priority: safeAlertText(input.priority, "Informational"),
    severity: safeAlertText(input.severity, "Informational"),
    confidence: safeAlertText(input.confidenceLabel, "Unavailable"),
    relatedEvent: safeAlertText(input.relatedEvent, "None"),
    relatedCompany: safeAlertText(
      input.relatedCompany,
      input.ticker || "Unknown Company"
    ),
    relatedReport: safeAlertText(input.relatedReport, "None"),
    timestamp: safeAlertText(input.timestamp, new Date().toISOString()),
    sourceEngine: safeAlertText(input.sourceEngine, "Platform"),
    ticker: safeAlertText(input.ticker, ""),
    inPortfolio: input.inPortfolio === true,
    inWatchlist: input.inWatchlist === true,
    ready: true,
    emptyMessage: EVENT_ALERT_EMPTY.awaitingAnalysis,
  };
}

export function buildEventDecision(input: {
  kind: string;
  label: string;
  sourceEngine: AlertDecision["sourceEngine"];
  suggestedCategory: AlertDecision["suggestedCategory"];
  suggestedPriority: AlertPriority;
  suggestedSeverity: AlertSeverity;
  title: string;
  summary: string;
  reason: string;
  evidence: string[];
  company: string;
  ticker: string;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  confidenceScore?: number;
  groupPrefix: string;
  metadata?: Record<string, string | number | boolean>;
}): AlertDecision {
  const ticker = safeAlertText(input.ticker, "").toUpperCase();
  const company = safeAlertText(input.company, ticker || "Unknown Company");
  return {
    kind: input.kind,
    label: input.label,
    sourceEngine: input.sourceEngine,
    suggestedCategory: input.suggestedCategory,
    suggestedPriority: input.suggestedPriority,
    suggestedSeverity: input.suggestedSeverity,
    title: safeAlertText(input.title, input.label),
    summary: safeAlertText(input.summary, input.label),
    description: safeAlertText(input.summary, input.label),
    reason: safeAlertText(input.reason, input.label),
    evidence: input.evidence.map((e) => safeAlertText(e, "")).filter(Boolean),
    company,
    ticker,
    inPortfolio: input.inPortfolio === true,
    inWatchlist: input.inWatchlist === true,
    confidenceScore:
      input.confidenceScore != null && Number.isFinite(input.confidenceScore)
        ? input.confidenceScore
        : 60,
    groupKey: `${input.groupPrefix}::${ticker || "market"}::${input.kind}`,
    dedupeKey: `${input.groupPrefix}::${ticker || "market"}::${input.kind}::${safeAlertText(input.title, input.kind)}`,
    metadata: {
      kind: input.kind,
      kindLabel: input.label,
      ...(input.metadata ?? {}),
    },
  };
}

export function isBeatOutcome(outcome: string | null | undefined): boolean {
  const o = safeAlertText(outcome, "").toLowerCase();
  return o.includes("beat") && !o.includes("miss");
}

export function isMissOutcome(outcome: string | null | undefined): boolean {
  const o = safeAlertText(outcome, "").toLowerCase();
  return o.includes("miss");
}

export function classifyNewsKinds(
  snap: NewsAlertSnapshot
): NewsAlertKind[] {
  const kinds: NewsAlertKind[] = [];
  const hay = `${snap.title} ${snap.summary} ${(snap.tags ?? []).join(" ")} ${snap.category ?? ""}`.toLowerCase();
  const tags = new Set((snap.tags ?? []).map((t) => t.toLowerCase()));

  if (tags.has("breaking") || /breaking|flash|just in/.test(hay)) {
    kinds.push("breaking_news");
  }
  if (
    snap.sentiment === "positive" ||
    tags.has("positive") ||
    /upgrade|wins|surge|record|beat/.test(hay)
  ) {
    kinds.push("positive_news");
  }
  if (
    snap.sentiment === "negative" ||
    tags.has("negative") ||
    /downgrade|fraud|probe|loss|miss|crash/.test(hay)
  ) {
    kinds.push("negative_news");
  }
  if (tags.has("sector") || snap.category?.toLowerCase() === "sector" || /sector/.test(hay)) {
    kinds.push("sector_news");
  }
  if (tags.has("macro") || /macro|inflation|gdp|fed|rbi/.test(hay)) {
    kinds.push("macro_news");
  }
  if (tags.has("policy") || /policy|regulation|bill|sebi/.test(hay)) {
    kinds.push("policy_news");
  }
  if (tags.has("upgrade") || /analyst upgrade|raised to|upgraded/.test(hay)) {
    kinds.push("analyst_upgrade");
  }
  if (tags.has("downgrade") || /analyst downgrade|cut to|downgraded/.test(hay)) {
    kinds.push("analyst_downgrade");
  }
  if (/target price|price target|pt to/.test(hay)) {
    kinds.push("target_price_change");
  }
  if (/order win|large order|bagged order/.test(hay)) {
    kinds.push("large_order_win");
  }
  if (/major contract|wins contract|awarded contract/.test(hay)) {
    kinds.push("major_contract");
  }
  if (/ceo|cfo|management change|appointed|resigns/.test(hay)) {
    kinds.push("management_change");
  }

  if (kinds.length === 0) {
    if (snap.sentiment === "negative") kinds.push("negative_news");
    else if (snap.sentiment === "positive") kinds.push("positive_news");
    else kinds.push("sector_news");
  }

  return Array.from(new Set(kinds));
}

export function mapCorporateActionKind(
  type: string
): CorporateActionAlertKind | null {
  const t = safeAlertText(type, "").toLowerCase();
  if (t.includes("dividend")) return "dividend";
  if (t.includes("bonus")) return "bonus";
  if (t.includes("split")) return "split";
  if (t.includes("right")) return "rights_issue";
  if (t.includes("buyback")) return "buyback";
  if (t.includes("merger")) return "merger";
  if (t.includes("acquisition") || t.includes("acquire")) return "acquisition";
  if (t.includes("demerger")) return "demerger";
  if (t.includes("board")) return "board_meeting";
  if (t === "agm" || t.includes("annual general")) return "agm";
  if (t.includes("shareholding")) return "shareholding_change";
  if (t.includes("promoter")) return "promoter_activity";
  return null;
}
