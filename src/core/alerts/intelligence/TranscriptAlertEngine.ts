/**
 * Transcript Alert Intelligence — Sprint 9C.R3.
 * Reuses Sprint 9B transcript research signals.
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  buildEventDecision,
  EARNINGS_EVENT_KIND_LABELS,
  EVENT_ALERT_EMPTY,
  type TranscriptAlertSnapshot,
} from "./AlertInsightModels";
import {
  emptyEventIntelBatch,
  emitDecisionsAsBatch,
  type EventIntelBatch,
} from "./emitEventIntelBatch";
import { safeAlertText } from "../AlertModels";

export interface TranscriptAlertInput {
  transcripts: TranscriptAlertSnapshot[];
  now?: Date;
}

export function decideTranscriptAlerts(
  snap: TranscriptAlertSnapshot
): AlertDecision[] {
  const decisions: AlertDecision[] = [];
  const ticker = safeAlertText(snap.ticker, "").toUpperCase();
  const company = safeAlertText(snap.company, ticker);

  if (!snap.available) {
    return decisions;
  }

  decisions.push(
    buildEventDecision({
      kind: "transcript_available",
      label: EARNINGS_EVENT_KIND_LABELS.transcript_available,
      sourceEngine: "Earnings",
      suggestedCategory: "Earnings",
      suggestedPriority: "Medium",
      suggestedSeverity: "Moderate",
      title: `Transcript Available — ${ticker}`,
      summary: `Earnings transcript available for ${ticker}`,
      reason: "Transcript research signal available",
      evidence: [
        `resultDate:${snap.resultDate}`,
        ...(snap.managementSentiment
          ? [`sentiment:${snap.managementSentiment}`]
          : []),
      ],
      company,
      ticker,
      inPortfolio: snap.inPortfolio,
      inWatchlist: snap.inWatchlist,
      confidenceScore: snap.confidenceScore ?? 70,
      groupPrefix: "transcript",
      metadata: { relatedReport: "transcript", resultDate: snap.resultDate },
    })
  );

  if (snap.hasConferenceCall) {
    decisions.push(
      buildEventDecision({
        kind: "conference_call_scheduled",
        label: EARNINGS_EVENT_KIND_LABELS.conference_call_scheduled,
        sourceEngine: "Earnings",
        suggestedCategory: "Earnings",
        suggestedPriority: "Medium",
        suggestedSeverity: "Moderate",
        title: `Conference Call Scheduled — ${ticker}`,
        summary: `Conference call linked for ${ticker}`,
        reason: "Transcript document indicates conference call",
        evidence: ["conferenceCall:true"],
        company,
        ticker,
        inPortfolio: snap.inPortfolio,
        inWatchlist: snap.inWatchlist,
        confidenceScore: snap.confidenceScore ?? 65,
        groupPrefix: "transcript",
        metadata: { relatedReport: "transcript" },
      })
    );
  }

  if (snap.summaryReady) {
    decisions.push(
      buildEventDecision({
        kind: "conference_call_summary_ready",
        label: EARNINGS_EVENT_KIND_LABELS.conference_call_summary_ready,
        sourceEngine: "Earnings",
        suggestedCategory: "Earnings",
        suggestedPriority: "Medium",
        suggestedSeverity: "Moderate",
        title: `Conference Call Summary Ready — ${ticker}`,
        summary: `Call summary ready for ${ticker}`,
        reason: "Transcript summary facet available",
        evidence: [
          "summary:ready",
          ...(snap.catalysts ?? []).slice(0, 3).map((c) => `catalyst:${c}`),
        ],
        company,
        ticker,
        inPortfolio: snap.inPortfolio,
        inWatchlist: snap.inWatchlist,
        confidenceScore: snap.confidenceScore ?? 72,
        groupPrefix: "transcript",
        metadata: { relatedReport: "transcript_summary" },
      })
    );
  }

  return decisions;
}

export class TranscriptAlertEngine {
  generate(input: TranscriptAlertInput): EventIntelBatch {
    const now = input.now ?? new Date();
    if (!input.transcripts.length) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.transcriptPending);
    }
    const decisions = input.transcripts.flatMap(decideTranscriptAlerts);
    if (decisions.length === 0) {
      return emptyEventIntelBatch(EVENT_ALERT_EMPTY.transcriptPending);
    }
    return emitDecisionsAsBatch(
      decisions,
      EVENT_ALERT_EMPTY.transcriptPending,
      now
    );
  }
}

let singleton: TranscriptAlertEngine | null = null;

export function getTranscriptAlertEngine(): TranscriptAlertEngine {
  if (!singleton) singleton = new TranscriptAlertEngine();
  return singleton;
}

export function resetTranscriptAlertEngine(): void {
  singleton = null;
}

/** Public API — generateTranscriptAlerts() */
export function generateTranscriptAlerts(
  input: TranscriptAlertInput
): EventIntelBatch {
  try {
    return getTranscriptAlertEngine().generate(input);
  } catch {
    return emptyEventIntelBatch(EVENT_ALERT_EMPTY.awaitingAnalysis);
  }
}
