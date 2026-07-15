/**
 * Transcript presenter — badges, drawer section, empty-safe text.
 */

import type {
  GuidanceChangesView,
  ManagementSentimentView,
  TranscriptBadgeId,
  TranscriptDrawerSectionView,
  TranscriptResearchView,
  TranscriptSummaryView,
} from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function buildTranscriptBadges(input: {
  summary: TranscriptSummaryView;
  sentiment: ManagementSentimentView;
  guidance: GuidanceChangesView;
}): TranscriptBadgeId[] {
  const badges: TranscriptBadgeId[] = [];
  const { summary, sentiment, guidance } = input;

  if (guidance.available) {
    if (guidance.items.some((i) => i.direction === "Raised")) {
      badges.push("Guidance Raised");
    }
    if (guidance.items.some((i) => i.direction === "Cut")) {
      badges.push("Guidance Cut");
    }
  }

  if (sentiment.available) {
    if (
      sentiment.overall === "Positive" ||
      sentiment.overall === "Very Positive"
    ) {
      badges.push("Positive Commentary");
      if (Number(sentiment.managementConfidence) >= 65) {
        badges.push("Management Confident");
      }
    }
    if (
      sentiment.overall === "Negative" ||
      sentiment.overall === "Very Negative"
    ) {
      badges.push("Negative Commentary");
    }
    if (Number(sentiment.executionConfidence) < 50) {
      badges.push("Execution Risk");
    }
  }

  if (summary.available) {
    if (/capital allocation/i.test(summary.capitalAllocation)) {
      badges.push("Capital Allocation");
    }
    if (/strong demand|constructive/i.test(summary.demandOutlook)) {
      badges.push("Strong Demand");
    }
    if (/weak demand|soft|caution/i.test(summary.demandOutlook)) {
      badges.push("Weak Demand");
    }
  }

  return [...new Set(badges)];
}

export function transcriptBadgeVariant(
  badge: TranscriptBadgeId
): "default" | "gain" | "loss" | "neutral" | "accent" {
  switch (badge) {
    case "Guidance Raised":
    case "Management Confident":
    case "Positive Commentary":
    case "Strong Demand":
    case "Capital Allocation":
      return "gain";
    case "Guidance Cut":
    case "Execution Risk":
    case "Negative Commentary":
    case "Weak Demand":
      return "loss";
    default:
      return "neutral";
  }
}

export function sanitizeResearchView(
  research: TranscriptResearchView
): TranscriptResearchView {
  return {
    ...research,
    aiVerdict: safeText(research.aiVerdict, TRANSCRIPT_EMPTY.commentaryPending),
    confidence: safeText(
      research.confidence,
      TRANSCRIPT_EMPTY.transcriptNotAvailable
    ),
    emptyMessage: safeText(
      research.emptyMessage,
      TRANSCRIPT_EMPTY.transcriptNotAvailable
    ),
    positiveSignals: research.positiveSignals.map((s) =>
      safeText(s, TRANSCRIPT_EMPTY.commentaryPending)
    ),
    negativeSignals: research.negativeSignals.map((s) =>
      safeText(s, TRANSCRIPT_EMPTY.commentaryPending)
    ),
  };
}

export function toTranscriptDrawerSection(
  research: TranscriptResearchView
): TranscriptDrawerSectionView {
  return {
    title: "Transcript Intelligence",
    research: sanitizeResearchView(research),
  };
}
