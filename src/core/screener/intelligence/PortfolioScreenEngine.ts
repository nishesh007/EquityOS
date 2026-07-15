/**
 * Portfolio Screen Engine — portfolio-aware institutional screening (Sprint 9D.R4).
 * Composes Portfolio / Validation / Trust / Opportunity signals — no duplicated logic.
 */

import { safeScreenText } from "../ScreenModels";
import {
  INSTITUTIONAL_SCREEN_EMPTY,
  PORTFOLIO_SCREEN_IDS,
  PORTFOLIO_SCREEN_LABELS,
  emptyInstitutionalScreenResult,
  type InstitutionalCandidate,
  type InstitutionalScreenResult,
  type PortfolioScreenId,
} from "./InstitutionalScreenModels";
import {
  buildInstitutionalCard,
  finalizeInstitutionalScreen,
  matchTaggedSignals,
} from "./institutionalScreenHelpers";

const TAG_ALIASES: Record<PortfolioScreenId, string[]> = {
  high_conviction_holdings: [
    "high_conviction_holdings",
    "high_conviction",
    "new_high_conviction_holding",
  ],
  weakening_holdings: ["weakening_holdings", "weak_holding", "conviction_dropped"],
  broken_trend: ["broken_trend", "trend_reversal"],
  target_achieved: ["target_achieved"],
  sl_risk: ["sl_risk", "stop_loss_triggered", "risk_increased"],
  position_upgrade: ["position_upgrade", "conviction_increased"],
  position_downgrade: ["position_downgrade", "conviction_dropped"],
  validation_failure: ["validation_failure", "validation_failed"],
  trust_deterioration: ["trust_deterioration", "trust_score_changed"],
  quality_improvement: [
    "quality_improvement",
    "institutional_grade_improved",
  ],
  sector_rotation_impact: ["sector_rotation_impact", "sector_rotation"],
};

export interface PortfolioScreenOptions {
  holdings?: InstitutionalCandidate[];
  screens?: PortfolioScreenId[];
  resultLimit?: number;
  minMatches?: number;
}

function matchPortfolio(
  candidate: InstitutionalCandidate,
  screens: PortfolioScreenId[]
): string[] {
  const matched = matchTaggedSignals(
    candidate,
    screens,
    PORTFOLIO_SCREEN_LABELS,
    TAG_ALIASES
  );

  // Soft heuristics from scores when tags absent
  if (
    screens.includes("high_conviction_holdings") &&
    !matched.includes(PORTFOLIO_SCREEN_LABELS.high_conviction_holdings) &&
    (candidate.aiConviction ?? 0) >= 80
  ) {
    matched.push(PORTFOLIO_SCREEN_LABELS.high_conviction_holdings);
  }
  if (
    screens.includes("trust_deterioration") &&
    !matched.includes(PORTFOLIO_SCREEN_LABELS.trust_deterioration) &&
    (candidate.trustScore ?? 100) < 45 &&
    (candidate.trustScore ?? 0) > 0
  ) {
    matched.push(PORTFOLIO_SCREEN_LABELS.trust_deterioration);
  }
  if (
    screens.includes("validation_failure") &&
    !matched.includes(PORTFOLIO_SCREEN_LABELS.validation_failure) &&
    (candidate.validationScore ?? 100) < 40 &&
    (candidate.validationScore ?? 0) > 0
  ) {
    matched.push(PORTFOLIO_SCREEN_LABELS.validation_failure);
  }
  return matched;
}

export function runPortfolioScreen(
  options: PortfolioScreenOptions = {}
): InstitutionalScreenResult {
  const holdings = options.holdings ?? [];
  if (holdings.length === 0) {
    return emptyInstitutionalScreenResult(
      "portfolio",
      INSTITUTIONAL_SCREEN_EMPTY.noPortfolioHoldings
    );
  }

  const screens = options.screens ?? [...PORTFOLIO_SCREEN_IDS];
  const minMatches = options.minMatches ?? 1;
  const cards = [];

  for (const holding of holdings) {
    const ticker = safeScreenText(holding.ticker, "").toUpperCase();
    if (!ticker) continue;
    const candidate = {
      ...holding,
      ticker,
      domain: "portfolio" as const,
      inPortfolio: true,
    };
    const matched = matchPortfolio(candidate, screens);
    if (matched.length < minMatches) continue;
    cards.push(buildInstitutionalCard(candidate, matched));
  }

  return finalizeInstitutionalScreen({
    mode: "portfolio",
    cards,
    emptyMessage: INSTITUTIONAL_SCREEN_EMPTY.noPortfolioHoldings,
    resultLimit: options.resultLimit,
  });
}

export class PortfolioScreenEngine {
  run(options?: PortfolioScreenOptions): InstitutionalScreenResult {
    return runPortfolioScreen(options);
  }
}
