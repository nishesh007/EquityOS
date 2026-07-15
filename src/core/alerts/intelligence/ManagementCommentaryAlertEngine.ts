/**
 * Management Commentary Alert Intelligence — Sprint 9C.R3.
 * Reuses post-earnings / transcript commentary signals.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  buildEventDecision,
  EARNINGS_EVENT_KIND_LABELS,
  EVENT_ALERT_EMPTY,
  type ManagementCommentarySnapshot,
} from "./AlertInsightModels";
import {
  emptyEventIntelBatch,
  emitDecisionsAsBatch,
  type EventIntelBatch,
} from "./emitEventIntelBatch";
import { safeAlertText } from "../AlertModels";

export interface ManagementCommentaryAlertInput {
  commentaries: ManagementCommentarySnapshot[];
  now?: Date;
}

export function decideManagementCommentaryAlerts(
  snap: ManagementCommentarySnapshot
): AlertDecision[] {
  if (!snap.published) return [];

  const ticker = safeAlertText(snap.ticker, "").toUpperCase();
  const company = safeAlertText(snap.company, ticker);
  const highlights = (snap.highlights ?? [])
    .map((h) => safeAlertText(h, ""))
    .filter(Boolean);

  return [
    buildEventDecision({
      kind: "management_commentary_published",
      label: EARNINGS_EVENT_KIND_LABELS.management_commentary_published,
      sourceEngine: "Earnings",
      suggestedCategory: "Earnings",
      suggestedPriority: "Medium",
      suggestedSeverity: "Moderate",
      title: `Management Commentary Published — ${ticker}`,
      summary: safeAlertText(
        snap.tone,
        `Management commentary available for ${ticker}`
      ),
      reason: "Management commentary published after results",
      evidence: [
        `resultDate:${snap.resultDate}`,
        ...(snap.guidanceChange
          ? [`guidance:${snap.guidanceChange}`]
          : []),
        ...highlights.slice(0, 3).map((h) => `highlight:${h}`),
      ],
      company,
      ticker,
      inPortfolio: snap.inPortfolio,
      inWatchlist: snap.inWatchlist,
      confidenceScore: snap.confidenceScore ?? 68,
      groupPrefix: "commentary",
      metadata: {
        relatedReport: "management_commentary",
        tone: snap.tone ?? "",
      },
    }),
  ];
}

export class ManagementCommentaryAlertEngine {
  generate(input: ManagementCommentaryAlertInput): EventIntelBatch {
    const now = input.now ?? new Date();
    if (!input.commentaries.length) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingResults);
    }
    const decisions = input.commentaries.flatMap(
      decideManagementCommentaryAlerts
    );
    if (decisions.length === 0) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingResults);
    }
    return emitDecisionsAsBatch(
      decisions,
      EVENT_ALERT_EMPTY.awaitingResults,
      now
    );
  }
}

let singleton: ManagementCommentaryAlertEngine | null = null;

export function getManagementCommentaryAlertEngine(): ManagementCommentaryAlertEngine {
  if (!singleton) singleton = new ManagementCommentaryAlertEngine();
  return singleton;
}

export function resetManagementCommentaryAlertEngine(): void {
  singleton = null;
}

export function generateManagementCommentaryAlerts(
  input: ManagementCommentaryAlertInput
): EventIntelBatch {
  try {
    return getManagementCommentaryAlertEngine().generate(input);
  } catch {
    return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingAnalysis);
  }
}
