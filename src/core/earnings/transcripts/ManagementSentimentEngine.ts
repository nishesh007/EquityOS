/**
 * Management sentiment engine — overall + facet confidence scores.
 */

import type {
  ManagementSentimentView,
  RawTranscriptDocument,
  TranscriptSentiment,
} from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

const POSITIVE = [
  "strong",
  "constructive",
  "confident",
  "healthy",
  "accelerat",
  "raised",
  "resilient",
  "improve",
  "solid",
];
const NEGATIVE = [
  "weak",
  "soft",
  "caution",
  "pressure",
  "cut",
  "risk",
  "headwind",
  "deferred",
  "challenging",
  "trimmed",
];

function countHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.reduce((sum, w) => sum + (lower.includes(w) ? 1 : 0), 0);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toSentiment(score: number): TranscriptSentiment {
  if (score >= 75) return "Very Positive";
  if (score >= 58) return "Positive";
  if (score <= 25) return "Very Negative";
  if (score <= 42) return "Negative";
  return "Neutral";
}

export function getManagementSentiment(
  doc: RawTranscriptDocument
): ManagementSentimentView {
  const text = `${doc.preparedRemarks}\n${doc.questionAnswer}`.trim();
  if (!text || text.length < 40) {
    return {
      overall: "Neutral",
      confidence: TRANSCRIPT_EMPTY.transcriptNotAvailable,
      managementConfidence: TRANSCRIPT_EMPTY.commentaryPending,
      guidanceConfidence: TRANSCRIPT_EMPTY.commentaryPending,
      executionConfidence: TRANSCRIPT_EMPTY.commentaryPending,
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.transcriptNotAvailable,
    };
  }

  const pos = countHits(text, POSITIVE);
  const neg = countHits(text, NEGATIVE);
  const base = 50 + pos * 6 - neg * 7;
  const overallScore = clampScore(base);
  const overall = toSentiment(overallScore);

  const managementConfidence = clampScore(
    55 + (text.includes("confident") ? 15 : 0) + pos * 3 - neg * 2
  );
  const guidanceConfidence = clampScore(
    50 +
      (text.includes("raised") ? 18 : 0) +
      (text.includes("maintained") ? 8 : 0) -
      (text.includes("cut") || text.includes("trimmed") ? 18 : 0)
  );
  const executionConfidence = clampScore(
    52 +
      (text.includes("on track") ? 12 : 0) +
      (text.includes("efficiency") ? 8 : 0) -
      (text.includes("execution risk") ? 16 : 0)
  );

  return {
    overall,
    confidence: String(overallScore),
    managementConfidence: String(managementConfidence),
    guidanceConfidence: String(guidanceConfidence),
    executionConfidence: String(executionConfidence),
    available: true,
    emptyMessage: "",
  };
}
