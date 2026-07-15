/**
 * Risk extraction from transcript text.
 */

import type {
  ExtractedRisk,
  ExtractedRisksView,
  RawTranscriptDocument,
  RiskCategory,
} from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

const RISK_RULES: Array<{ category: RiskCategory; keys: string[] }> = [
  { category: "Demand Risk", keys: ["weak demand", "soft demand", "demand", "deferred"] },
  { category: "Margin Risk", keys: ["margin", "nim", "funding cost", "wage"] },
  { category: "Competition", keys: ["competition", "competitive"] },
  { category: "Currency", keys: ["currency", "forex", "hedge"] },
  { category: "Regulatory", keys: ["regulatory", "rbi", "regulation"] },
  { category: "Execution", keys: ["execution risk", "execution", "on track"] },
  { category: "Supply Chain", keys: ["supply chain"] },
  { category: "Raw Material", keys: ["raw material", "crude"] },
  { category: "Pricing", keys: ["pricing", "price"] },
  { category: "Customer Concentration", keys: ["customer concentration", "large exposure", "concentration"] },
];

export function getExtractedRisks(doc: RawTranscriptDocument): ExtractedRisksView {
  const text = `${doc.preparedRemarks}\n${doc.questionAnswer}`.trim();
  if (!text || text.length < 40) {
    return {
      risks: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.transcriptNotAvailable,
    };
  }

  const lower = text.toLowerCase();
  const risks: ExtractedRisk[] = [];

  for (const rule of RISK_RULES) {
    const hit = rule.keys.find((k) => lower.includes(k));
    if (!hit) continue;
    // Prefer risk-leaning mentions for Execution/Demand when only positive "on track"
    if (rule.category === "Execution" && lower.includes("on track") && !lower.includes("execution risk")) {
      continue;
    }
    if (
      rule.category === "Demand Risk" &&
      !/(weak|soft|caution|deferred|mixed)/i.test(text) &&
      /constructive|strong demand/i.test(text)
    ) {
      continue;
    }
    const line =
      text
        .split(/[\n.]+/)
        .map((s) => s.trim())
        .find((s) => s.toLowerCase().includes(hit)) ?? `${rule.category} referenced on call.`;
    risks.push({ category: rule.category, detail: line });
  }

  if (risks.length === 0) {
    return {
      risks: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.commentaryPending,
    };
  }

  return { risks, available: true, emptyMessage: "" };
}
