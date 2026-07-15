/**
 * Transcript summary engine — structured institutional summary from concall text.
 */

import type { RawTranscriptDocument, TranscriptSummaryView } from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

function sentences(text: string): string[] {
  return text
    .split(/[\n.]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function pickMatching(text: string, keywords: string[], limit = 3): string[] {
  const lower = text.toLowerCase();
  const hits = sentences(text).filter((s) =>
    keywords.some((k) => s.toLowerCase().includes(k) || lower.includes(k))
  );
  return [...new Set(hits)].slice(0, limit);
}

function firstOr(text: string, fallback: string): string {
  const s = sentences(text)[0];
  return s && s.length > 0 ? s : fallback;
}

export function buildTranscriptSummary(
  doc: RawTranscriptDocument
): TranscriptSummaryView {
  if (!doc.hasConferenceCall && !doc.preparedRemarks && !doc.questionAnswer) {
    return {
      executiveSummary: TRANSCRIPT_EMPTY.noConferenceCall,
      topManagementQuotes: [],
      keyBusinessUpdates: [],
      segmentHighlights: [],
      growthDrivers: [],
      weaknesses: [],
      capitalAllocation: TRANSCRIPT_EMPTY.commentaryPending,
      demandOutlook: TRANSCRIPT_EMPTY.commentaryPending,
      managementGuidance: TRANSCRIPT_EMPTY.commentaryPending,
      futurePriorities: [],
      operationalCommentary: TRANSCRIPT_EMPTY.transcriptNotAvailable,
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.noConferenceCall,
    };
  }

  if (!doc.preparedRemarks || doc.preparedRemarks.length < 40) {
    return {
      executiveSummary: TRANSCRIPT_EMPTY.transcriptAwaited,
      topManagementQuotes: [],
      keyBusinessUpdates: [],
      segmentHighlights: [],
      growthDrivers: [],
      weaknesses: [],
      capitalAllocation: TRANSCRIPT_EMPTY.commentaryPending,
      demandOutlook: TRANSCRIPT_EMPTY.commentaryPending,
      managementGuidance: TRANSCRIPT_EMPTY.commentaryPending,
      futurePriorities: [],
      operationalCommentary: TRANSCRIPT_EMPTY.transcriptAwaited,
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.transcriptAwaited,
    };
  }

  const text = `${doc.preparedRemarks}\n${doc.questionAnswer}`;
  const quotes = sentences(doc.preparedRemarks)
    .filter((s) => /we |management|expect|continue|invest|confident/i.test(s))
    .slice(0, 3);

  return {
    executiveSummary: `${doc.companyName} (${doc.ticker}) ${doc.quarter} ${doc.financialYear}: ${firstOr(doc.preparedRemarks, TRANSCRIPT_EMPTY.commentaryPending)}.`,
    topManagementQuotes:
      quotes.length > 0 ? quotes : [firstOr(doc.preparedRemarks, TRANSCRIPT_EMPTY.commentaryPending)],
    keyBusinessUpdates: pickMatching(text, [
      "growth",
      "deal",
      "subscriber",
      "credit",
      "order",
      "delivered",
    ]),
    segmentHighlights: pickMatching(text, [
      "segment",
      "retail",
      "digital",
      "banking",
      "bfsi",
      "manufacturing",
      "wholesale",
    ]),
    growthDrivers: pickMatching(text, [
      "growth driver",
      "strong demand",
      "constructive",
      "accelerat",
      "pipeline",
      "ai",
    ]),
    weaknesses: pickMatching(text, [
      "weak",
      "soft",
      "caution",
      "pressure",
      "headwind",
      "deferred",
      "uneven",
    ]),
    capitalAllocation:
      pickMatching(text, ["capital allocation", "buyback", "balance sheet"], 1)[0] ??
      TRANSCRIPT_EMPTY.commentaryPending,
    demandOutlook:
      pickMatching(text, ["demand outlook", "demand"], 1)[0] ??
      TRANSCRIPT_EMPTY.commentaryPending,
    managementGuidance:
      pickMatching(text, ["guidance", "guided", "raised", "maintained", "cut"], 1)[0] ??
      TRANSCRIPT_EMPTY.commentaryPending,
    futurePriorities: pickMatching(text, [
      "future priorit",
      "priority",
      "roadmap",
      "continue to",
      "deepen",
    ]),
    operationalCommentary:
      pickMatching(text, ["margin", "utilization", "efficiency", "execution"], 1)[0] ??
      firstOr(doc.preparedRemarks, TRANSCRIPT_EMPTY.commentaryPending),
    available: true,
    emptyMessage: "",
  };
}

/** Public API — getTranscriptSummary() */
export function getTranscriptSummary(
  doc: RawTranscriptDocument
): TranscriptSummaryView {
  return buildTranscriptSummary(doc);
}
