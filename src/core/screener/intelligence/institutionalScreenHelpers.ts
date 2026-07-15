/**
 * Shared helpers for institutional screen engines (Sprint 9D.R4).
 */

import { safeScreenText } from "../ScreenModels";
import {
  emptyInstitutionalScreenResult,
  normalizeInstitutionalCard,
  type InstitutionalCandidate,
  type InstitutionalResultCard,
  type InstitutionalScreenEmptyMessage,
  type InstitutionalScreenMode,
  type InstitutionalScreenResult,
} from "./InstitutionalScreenModels";
import {
  rankInstitutionalResults,
  scoreInstitutionalCandidate,
} from "./InstitutionalRankingEngine";
import { generateResearchPriority } from "./ResearchPriorityEngine";
import { buildInstitutionalInsights } from "./ScreenInsightEngine";

export function buildInstitutionalCard(
  candidate: InstitutionalCandidate,
  matchedSignals: string[]
): InstitutionalResultCard {
  const factors = scoreInstitutionalCandidate(candidate);
  const priority = generateResearchPriority(factors, {
    matchedSignals: matchedSignals.length,
    hasCatalyst: matchedSignals.some((s) =>
      /catalyst|breakout|upgrade|earnings/i.test(s)
    ),
  });
  const insight = buildInstitutionalInsights({
    candidate,
    factors,
    matchedSignals,
  });

  return normalizeInstitutionalCard({
    ticker: candidate.ticker,
    company: candidate.company,
    sector: candidate.sector,
    badges: insight.badges,
    evidence: insight.evidence,
    drivers: insight.drivers,
    recommendation: undefined,
    priority,
    confidence: factors.aiConfidence,
    institutionalScore: factors.overallInstitutionalScore,
    trust: factors.trust,
    validation: factors.validation,
    reasonSummary:
      candidate.reasonSummary ||
      matchedSignals.slice(0, 3).join(", ") ||
      insight.headline,
    matchedSignals,
    factors,
    insight,
  });
}

export function finalizeInstitutionalScreen(input: {
  mode: InstitutionalScreenMode;
  cards: InstitutionalResultCard[];
  emptyMessage: InstitutionalScreenEmptyMessage;
  resultLimit?: number;
}): InstitutionalScreenResult {
  if (input.cards.length === 0) {
    return emptyInstitutionalScreenResult(input.mode, input.emptyMessage);
  }
  const ranked = rankInstitutionalResults(input.cards);
  const limited = ranked.slice(0, input.resultLimit ?? 50);
  return {
    mode: input.mode,
    cards: limited,
    totalMatches: limited.length,
    empty: false,
    emptyMessage: input.emptyMessage,
    generatedAt: new Date().toISOString(),
  };
}

export function matchTaggedSignals(
  candidate: InstitutionalCandidate,
  ids: readonly string[],
  labels: Record<string, string>,
  aliases: Record<string, string[]>
): string[] {
  const matched: string[] = [];
  for (const id of ids) {
    const needles = aliases[id] ?? [id];
    const tags = new Set(
      (candidate.tags ?? []).map((t) => String(t).toLowerCase())
    );
    if (needles.some((n) => tags.has(n.toLowerCase()))) {
      matched.push(safeScreenText(labels[id], id));
    }
  }
  return matched;
}
