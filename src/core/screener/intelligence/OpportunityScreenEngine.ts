/**
 * Opportunity Screen Engine — ranks Opportunity Engine outputs (Sprint 9D.R4).
 * Reuses Opportunity / Validation / Trust / conviction / RR / momentum / sector.
 */

import { safeScreenText } from "../ScreenModels";
import {
  INSTITUTIONAL_SCREEN_EMPTY,
  emptyInstitutionalScreenResult,
  type InstitutionalCandidate,
  type InstitutionalScreenResult,
} from "./InstitutionalScreenModels";
import {
  buildInstitutionalCard,
  finalizeInstitutionalScreen,
} from "./institutionalScreenHelpers";
import { scoreInstitutionalCandidate } from "./InstitutionalRankingEngine";

export interface OpportunityScreenOptions {
  opportunities?: InstitutionalCandidate[];
  resultLimit?: number;
  minInstitutionalScore?: number;
  minConviction?: number;
}

export function runOpportunityScreen(
  options: OpportunityScreenOptions = {}
): InstitutionalScreenResult {
  const opportunities = options.opportunities ?? [];
  if (opportunities.length === 0) {
    return emptyInstitutionalScreenResult(
      "opportunity",
      INSTITUTIONAL_SCREEN_EMPTY.noInstitutionalOpportunities
    );
  }

  const minScore = options.minInstitutionalScore ?? 55;
  const minConviction = options.minConviction ?? 50;
  const cards = [];

  for (const opp of opportunities) {
    const ticker = safeScreenText(opp.ticker, "").toUpperCase();
    if (!ticker) continue;
    const candidate: InstitutionalCandidate = {
      ...opp,
      ticker,
      domain: "opportunity",
    };
    const conviction = candidate.aiConviction ?? candidate.opportunityScore ?? 0;
    if (conviction < minConviction) continue;

    const factors = scoreInstitutionalCandidate(candidate);
    if (factors.overallInstitutionalScore < minScore) continue;

    const matched = [
      ...(candidate.tags ?? []).map((t) => String(t)),
      "Opportunity Engine",
    ].filter(Boolean);

    if ((candidate.validationScore ?? 0) >= 60) matched.push("Validation");
    if ((candidate.trustScore ?? 0) >= 60) matched.push("Trust");
    if ((candidate.riskReward ?? 0) >= 2) matched.push("Risk Reward");
    if ((candidate.momentum ?? 0) >= 60) matched.push("Momentum");
    if ((candidate.fundamentalStrength ?? 0) >= 60) matched.push("Fundamentals");
    if ((candidate.liquidity ?? 0) >= 55) matched.push("Liquidity");
    if ((candidate.sectorStrength ?? 0) >= 60) matched.push("Sector Strength");
    if ((candidate.marketTrend ?? 0) >= 55) matched.push("Market Trend");

    cards.push(buildInstitutionalCard(candidate, [...new Set(matched)]));
  }

  return finalizeInstitutionalScreen({
    mode: "opportunity",
    cards,
    emptyMessage: INSTITUTIONAL_SCREEN_EMPTY.noInstitutionalOpportunities,
    resultLimit: options.resultLimit,
  });
}

export class OpportunityScreenEngine {
  run(options?: OpportunityScreenOptions): InstitutionalScreenResult {
    return runOpportunityScreen(options);
  }
}
