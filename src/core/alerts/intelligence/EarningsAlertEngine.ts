/**
 * Earnings Alert Intelligence — Sprint 9C.R3.
 * Reuses Sprint 9B calendar + post-earnings signals; emits into R1 Alert Engine.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  buildEventDecision,
  EARNINGS_EVENT_KIND_LABELS,
  EVENT_ALERT_EMPTY,
  isBeatOutcome,
  isMissOutcome,
  type EarningsEventAlertKind,
  type EarningsEventSnapshot,
} from "./AlertInsightModels";
import {
  emptyEventIntelBatch,
  emitDecisionsAsBatch,
  type EventIntelBatch,
} from "./emitEventIntelBatch";
import type { AlertPriority } from "../AlertPriority";
import type { AlertSeverity } from "../AlertSeverity";
import { safeAlertText } from "../AlertModels";

export interface EarningsIntelAlertInput {
  events: EarningsEventSnapshot[];
  now?: Date;
}

function pushKind(
  decisions: AlertDecision[],
  event: EarningsEventSnapshot,
  kind: EarningsEventAlertKind,
  priority: AlertPriority,
  severity: AlertSeverity,
  reason: string,
  evidence: string[]
): void {
  const ticker = safeAlertText(event.ticker, "").toUpperCase();
  const company = safeAlertText(event.company, ticker);
  const label = EARNINGS_EVENT_KIND_LABELS[kind];
  decisions.push(
    buildEventDecision({
      kind,
      label,
      sourceEngine: "Earnings",
      suggestedCategory: "Earnings",
      suggestedPriority: priority,
      suggestedSeverity: severity,
      title: `${label} — ${ticker || company}`,
      summary: reason,
      reason,
      evidence,
      company,
      ticker,
      inPortfolio: event.inPortfolio,
      inWatchlist: event.inWatchlist,
      confidenceScore: event.confidenceScore ?? 68,
      groupPrefix: "earnings",
      metadata: {
        resultDate: event.resultDate,
        relatedReport: "earnings",
        sector: event.sector ?? "",
      },
    })
  );
}

export function decideEarningsEventAlerts(
  event: EarningsEventSnapshot
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const ticker = safeAlertText(event.ticker, "").toUpperCase();

  if (event.isToday) {
    pushKind(
      decisions,
      event,
      "earnings_today",
      "Critical",
      "Critical",
      `${ticker} reports earnings today`,
      [`resultDate:${event.resultDate}`, "window:today"]
    );
  } else if (event.isTomorrow) {
    pushKind(
      decisions,
      event,
      "earnings_tomorrow",
      "High",
      "Major",
      `${ticker} reports earnings tomorrow`,
      [`resultDate:${event.resultDate}`, "window:tomorrow"]
    );
  } else if (event.isUpcoming || (event.hoursUntil != null && event.hoursUntil > 0)) {
    pushKind(
      decisions,
      event,
      "upcoming_earnings",
      event.inPortfolio ? "High" : "Medium",
      "Moderate",
      `Upcoming earnings for ${ticker} on ${event.resultDate}`,
      [`resultDate:${event.resultDate}`]
    );
  }

  if (event.isReleased) {
    pushKind(
      decisions,
      event,
      "results_published",
      "High",
      "Major",
      `Results published for ${ticker}`,
      [`resultDate:${event.resultDate}`, "status:released"]
    );
  }

  if (isBeatOutcome(event.epsOutcome)) {
    pushKind(
      decisions,
      event,
      "eps_beat",
      "High",
      "Major",
      `EPS beat for ${ticker}`,
      [`eps:${event.epsOutcome}`]
    );
  } else if (isMissOutcome(event.epsOutcome)) {
    pushKind(
      decisions,
      event,
      "eps_miss",
      "High",
      "Major",
      `EPS miss for ${ticker}`,
      [`eps:${event.epsOutcome}`]
    );
  }

  if (isBeatOutcome(event.revenueOutcome)) {
    pushKind(
      decisions,
      event,
      "revenue_beat",
      "High",
      "Major",
      `Revenue beat for ${ticker}`,
      [`revenue:${event.revenueOutcome}`]
    );
  } else if (isMissOutcome(event.revenueOutcome)) {
    pushKind(
      decisions,
      event,
      "revenue_miss",
      "High",
      "Major",
      `Revenue miss for ${ticker}`,
      [`revenue:${event.revenueOutcome}`]
    );
  }

  const guidance = safeAlertText(event.guidanceChange, "").toLowerCase();
  if (guidance.includes("upgrade") || guidance.includes("raised")) {
    pushKind(
      decisions,
      event,
      "guidance_raised",
      "High",
      "Major",
      `Guidance raised for ${ticker}`,
      [`guidance:${event.guidanceChange}`]
    );
  } else if (
    guidance.includes("downgrade") ||
    guidance.includes("lower") ||
    guidance.includes("cut")
  ) {
    pushKind(
      decisions,
      event,
      "guidance_lowered",
      "High",
      "Major",
      `Guidance lowered for ${ticker}`,
      [`guidance:${event.guidanceChange}`]
    );
  }

  if (event.marginSignal === "expansion") {
    pushKind(
      decisions,
      event,
      "margin_expansion",
      "Medium",
      "Moderate",
      `Margin expansion for ${ticker}`,
      ["margin:expansion"]
    );
  } else if (event.marginSignal === "compression") {
    pushKind(
      decisions,
      event,
      "margin_compression",
      "High",
      "Major",
      `Margin compression for ${ticker}`,
      ["margin:compression"]
    );
  }

  if (event.hasManagementCommentary) {
    pushKind(
      decisions,
      event,
      "management_commentary_published",
      "Medium",
      "Moderate",
      `Management commentary published for ${ticker}`,
      ["commentary:published"]
    );
  }

  if (event.hasTranscript) {
    pushKind(
      decisions,
      event,
      "transcript_available",
      "Medium",
      "Moderate",
      `Transcript available for ${ticker}`,
      ["transcript:available"]
    );
  }

  const call = event.conferenceCallStatus ?? "none";
  if (call === "scheduled") {
    pushKind(
      decisions,
      event,
      "conference_call_scheduled",
      "Medium",
      "Moderate",
      `Conference call scheduled for ${ticker}`,
      ["call:scheduled"]
    );
  } else if (call === "live") {
    pushKind(
      decisions,
      event,
      "conference_call_live",
      "High",
      "Major",
      `Conference call live for ${ticker}`,
      ["call:live"]
    );
  } else if (call === "summary_ready") {
    pushKind(
      decisions,
      event,
      "conference_call_summary_ready",
      "Medium",
      "Moderate",
      `Conference call summary ready for ${ticker}`,
      ["call:summary_ready"]
    );
  }

  return decisions;
}

/** Map 9B calendar + post-analysis fields into a snapshot (no recalculation). */
export function mapEarningsCalendarToSnapshot(input: {
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
  conferenceCallStatus?: EarningsEventSnapshot["conferenceCallStatus"];
  confidenceScore?: number | null;
  sector?: string | null;
}): EarningsEventSnapshot {
  return { ...input };
}

export class EarningsAlertEngine {
  generate(input: EarningsIntelAlertInput): EventIntelBatch {
    const now = input.now ?? new Date();
    if (!input.events.length) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.noEarnings);
    }
    const decisions = input.events.flatMap(decideEarningsEventAlerts);
    return emitDecisionsAsBatch(decisions, EVENT_ALERT_EMPTY.noEarnings, now);
  }
}

let singleton: EarningsAlertEngine | null = null;

export function getEarningsIntelAlertEngine(): EarningsAlertEngine {
  if (!singleton) singleton = new EarningsAlertEngine();
  return singleton;
}

export function resetEarningsIntelAlertEngine(): void {
  singleton = null;
}

/** Public API — generateEarningsAlerts() */
export function generateEarningsAlerts(
  input: EarningsIntelAlertInput
): EventIntelBatch {
  try {
    return getEarningsIntelAlertEngine().generate(input);
  } catch {
    return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingAnalysis);
  }
}
