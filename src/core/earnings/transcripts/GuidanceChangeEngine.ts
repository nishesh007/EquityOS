/**
 * Guidance change extraction from management commentary.
 */

import type {
  GuidanceChangesView,
  GuidanceDirection,
  GuidanceItem,
  RawTranscriptDocument,
} from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

const TOPICS: Array<{ topic: string; keys: string[] }> = [
  { topic: "Revenue Guidance", keys: ["revenue guidance", "raised revenue", "loan growth", "credit growth"] },
  { topic: "Margin Guidance", keys: ["margin guidance", "margins guided", "nim"] },
  { topic: "Capex Guidance", keys: ["capex guidance", "capex"] },
  { topic: "Demand Outlook", keys: ["demand outlook", "demand"] },
  { topic: "Pricing Outlook", keys: ["pricing outlook", "pricing"] },
  { topic: "Export Outlook", keys: ["export growth", "export"] },
  { topic: "Cost Outlook", keys: ["cost", "wage", "funding cost"] },
  { topic: "Hiring Plans", keys: ["hiring plans", "hiring"] },
  { topic: "Expansion Plans", keys: ["expansion", "capacity expansion", "store addition"] },
];

function directionFor(text: string, keys: string[]): GuidanceDirection {
  const lower = text.toLowerCase();
  const relevant = keys.some((k) => lower.includes(k));
  if (!relevant) return "Not Discussed";
  if (
    lower.includes("raised") ||
    lower.includes("raising") ||
    lower.includes("constructive") ||
    lower.includes("improving")
  ) {
    return "Raised";
  }
  if (
    lower.includes("cut") ||
    lower.includes("trimmed") ||
    lower.includes("soft") ||
    lower.includes("cautious") ||
    lower.includes("pressure")
  ) {
    return "Cut";
  }
  if (lower.includes("maintained") || lower.includes("stable") || lower.includes("remain")) {
    return "Maintained";
  }
  return "Maintained";
}

function lineFor(text: string, keys: string[]): string {
  const lines = text.split(/[\n.]+/).map((s) => s.trim()).filter(Boolean);
  const hit = lines.find((l) => keys.some((k) => l.toLowerCase().includes(k)));
  return hit ?? TRANSCRIPT_EMPTY.commentaryPending;
}

export function getGuidanceChanges(
  doc: RawTranscriptDocument
): GuidanceChangesView {
  const text = `${doc.preparedRemarks}\n${doc.questionAnswer}`.trim();
  if (!text || text.length < 40) {
    return {
      items: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.transcriptNotAvailable,
    };
  }

  const items: GuidanceItem[] = TOPICS.map(({ topic, keys }) => {
    const direction = directionFor(text, keys);
    return {
      topic,
      current:
        direction === "Not Discussed"
          ? TRANSCRIPT_EMPTY.commentaryPending
          : lineFor(text, keys),
      previous: "Prior quarter baseline",
      direction,
    };
  }).filter((item) => item.direction !== "Not Discussed");

  if (items.length === 0) {
    return {
      items: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.commentaryPending,
    };
  }

  return { items, available: true, emptyMessage: "" };
}
