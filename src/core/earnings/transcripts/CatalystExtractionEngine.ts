/**
 * Catalyst extraction from transcript text.
 */

import type {
  CatalystCategory,
  CatalystsView,
  ExtractedCatalyst,
  RawTranscriptDocument,
} from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

const CATALYST_RULES: Array<{ category: CatalystCategory; keys: string[] }> = [
  { category: "New Products", keys: ["new product", "genai", "private label"] },
  { category: "Capacity Expansion", keys: ["capacity expansion", "giga", "store addition", "delivery center"] },
  { category: "New Contracts", keys: ["new contract", "large deal", "deal win", "tcv"] },
  { category: "Acquisitions", keys: ["acquisition", "acquire"] },
  { category: "Government Orders", keys: ["government order", "government orders"] },
  { category: "Export Growth", keys: ["export growth", "export"] },
  { category: "Pricing Power", keys: ["pricing power"] },
  { category: "Efficiency Programs", keys: ["efficiency program", "efficiency"] },
  { category: "Technology Investments", keys: ["technology investment", "ai cloud", "digitize", "5g"] },
];

export function getCatalysts(doc: RawTranscriptDocument): CatalystsView {
  const text = `${doc.preparedRemarks}\n${doc.questionAnswer}`.trim();
  if (!text || text.length < 40) {
    return {
      catalysts: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.transcriptNotAvailable,
    };
  }

  const lower = text.toLowerCase();
  const catalysts: ExtractedCatalyst[] = [];

  for (const rule of CATALYST_RULES) {
    const hit = rule.keys.find((k) => lower.includes(k));
    if (!hit) continue;
    const line =
      text
        .split(/[\n.]+/)
        .map((s) => s.trim())
        .find((s) => s.toLowerCase().includes(hit)) ??
      `${rule.category} highlighted on call.`;
    catalysts.push({ category: rule.category, detail: line });
  }

  if (catalysts.length === 0) {
    return {
      catalysts: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.commentaryPending,
    };
  }

  return { catalysts, available: true, emptyMessage: "" };
}
