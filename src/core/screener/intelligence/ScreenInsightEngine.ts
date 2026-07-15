/**
 * Screen Insight Engine — explainable institutional cards (Sprint 9D.R4).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  INSTITUTIONAL_SCREEN_EMPTY,
  emptyInstitutionalInsight,
  recommendationFromScore,
  type InstitutionalCandidate,
  type InstitutionalInsight,
  type InstitutionalScoreFactors,
} from "./InstitutionalScreenModels";

export interface InsightBuildInput {
  candidate: InstitutionalCandidate;
  factors: InstitutionalScoreFactors;
  matchedSignals: string[];
}

export function buildInstitutionalInsights(
  input: InsightBuildInput
): InstitutionalInsight {
  const { candidate, factors, matchedSignals } = input;
  const ticker = safeScreenText(candidate.ticker, "—").toUpperCase();
  const passed = safeScreenNumber(candidate.filtersPassed, matchedSignals.length);
  const total = safeScreenNumber(
    candidate.filtersTotal,
    Math.max(passed, matchedSignals.length || 1)
  );

  if (matchedSignals.length === 0 && factors.overallInstitutionalScore === 0) {
    return emptyInstitutionalInsight(INSTITUTIONAL_SCREEN_EMPTY.awaitingScan);
  }

  const drivers: string[] = [];
  const badges: string[] = [];
  const evidence: string[] = [];

  if (factors.trust >= 90) {
    drivers.push(`Trust Score ${Math.round(factors.trust)}`);
    badges.push("High Trust");
  } else if (factors.trust >= 70) {
    drivers.push(`Trust Score ${Math.round(factors.trust)}`);
  } else if (factors.trust > 0 && factors.trust < 50) {
    drivers.push(`Trust deteriorated (${Math.round(factors.trust)})`);
    badges.push("Trust Watch");
  }

  if (factors.validation >= 70) {
    drivers.push("Validation Passed");
    badges.push("Validated");
  } else if (factors.validation > 0 && factors.validation < 50) {
    drivers.push("Validation risk");
    badges.push("Validation Gap");
  }

  if (factors.momentum >= 65) {
    drivers.push("Momentum Improving");
    badges.push("Momentum");
  }
  if (factors.technical >= 65) drivers.push("Near Breakout / Technical strength");
  if ((candidate.sectorStrength ?? 0) >= 65) {
    drivers.push("Sector Strength Rising");
    badges.push("Sector Tailwinds");
  }
  if ((candidate.weightPercent ?? 100) < 5 && candidate.inPortfolio) {
    drivers.push("Portfolio Weight Low");
  }

  for (const signal of matchedSignals.slice(0, 5)) {
    evidence.push(safeScreenText(signal, ""));
  }
  for (const e of candidate.evidence ?? []) {
    const text = safeScreenText(e, "");
    if (text) evidence.push(text);
  }

  const recommendation = recommendationFromScore(
    factors.overallInstitutionalScore
  );
  let suggestedAction = "Monitor";
  if (recommendation === "Institutional Buy" || recommendation === "Strong Buy") {
    suggestedAction = "Increase Allocation";
  } else if (recommendation === "Accumulation") {
    suggestedAction = "Accumulate on Dips";
  } else if (recommendation === "Avoid") {
    suggestedAction = "Reduce / Exit Watch";
  } else {
    suggestedAction = "Keep on Watchlist";
  }

  const headline = `Passed ${Math.round(passed)}/${Math.round(total)} institutional filters`;

  return {
    headline: safeScreenText(headline, `${ticker} institutional screen`),
    drivers: drivers.length
      ? drivers
      : ["Baseline institutional evaluation"],
    evidence: evidence.length ? evidence : matchedSignals.slice(0, 3),
    suggestedAction,
    badges: badges.length ? badges : [recommendation],
    empty: false,
    emptyMessage: INSTITUTIONAL_SCREEN_EMPTY.awaitingScan,
  };
}

export class ScreenInsightEngine {
  build(input: InsightBuildInput): InstitutionalInsight {
    try {
      return buildInstitutionalInsights(input);
    } catch {
      return emptyInstitutionalInsight();
    }
  }
}
