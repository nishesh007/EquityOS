/**
 * Research Priority Engine — classify research urgency (Sprint 9D.R4).
 */

import {
  type InstitutionalScoreFactors,
  type ResearchPriorityBand,
} from "./InstitutionalScreenModels";

export function generateResearchPriority(
  factors: InstitutionalScoreFactors,
  options?: { matchedSignals?: number; hasCatalyst?: boolean }
): ResearchPriorityBand {
  const score = factors.overallInstitutionalScore;
  const signals = options?.matchedSignals ?? 0;
  const trustGap = factors.trust < 45;
  const validationGap = factors.validation < 45;

  if (score >= 91 || (score >= 84 && options?.hasCatalyst)) {
    return "Research Immediately";
  }
  if (score >= 77 || signals >= 3) {
    return "High Priority";
  }
  if (score >= 60) {
    return "Normal";
  }
  if (score < 40 && signals === 0) {
    return "Ignore";
  }
  if (trustGap || validationGap) {
    return "Monitor";
  }
  return "Monitor";
}

export class ResearchPriorityEngine {
  generate(
    factors: InstitutionalScoreFactors,
    options?: { matchedSignals?: number; hasCatalyst?: boolean }
  ): ResearchPriorityBand {
    return generateResearchPriority(factors, options);
  }
}
