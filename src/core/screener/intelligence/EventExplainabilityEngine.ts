/**
 * Institutional AI Screener — event explainability + AI event score (Sprint 9D.R3).
 * Reuses Opportunity / Trust / Validation / Confidence + event strengths.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  SCREEN_EVENT_EMPTY,
  emptyEventExplainability,
  emptyEventScoreFactors,
  type EventExplainability,
  type EventScoreFactors,
  type ScreenEventCandidate,
} from "./EventPresentationModels";

const WEIGHTS = {
  opportunityScore: 0.14,
  trustScore: 0.12,
  validationScore: 0.12,
  confidence: 0.12,
  eventStrength: 0.14,
  newsStrength: 0.12,
  earningsStrength: 0.12,
  corporateActionStrength: 0.12,
} as const;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function deriveDomainStrength(
  candidate: ScreenEventCandidate,
  domain: ScreenEventCandidate["domain"],
  explicit: number | null | undefined,
  fallback = 50
): number {
  if (explicit != null && Number.isFinite(explicit)) return clamp(explicit);
  if (candidate.domain === domain) {
    return clamp(safeScreenNumber(candidate.eventStrength, fallback));
  }
  return 0;
}

/** Compose Final Event Score 0–100 from existing engine outputs. */
export function composeEventScoreFactors(
  candidate: ScreenEventCandidate
): EventScoreFactors {
  const opportunityScore = clamp(
    safeScreenNumber(candidate.opportunityScore, 0)
  );
  const trustScore = clamp(safeScreenNumber(candidate.trustScore, 0));
  const validationScore = clamp(
    safeScreenNumber(candidate.validationScore, 0)
  );
  const confidence = clamp(safeScreenNumber(candidate.confidence, 0));

  const earningsStrength = deriveDomainStrength(
    candidate,
    "earnings",
    candidate.earningsStrength,
    55
  );
  const newsStrength = deriveDomainStrength(
    candidate,
    "news",
    candidate.newsStrength,
    55
  );
  const corporateActionStrength = deriveDomainStrength(
    candidate,
    "corporate_action",
    candidate.corporateActionStrength,
    55
  );
  const managementBoost =
    candidate.domain === "management"
      ? clamp(safeScreenNumber(candidate.managementStrength, 55))
      : clamp(safeScreenNumber(candidate.managementStrength, 0));

  const eventStrength = clamp(
    safeScreenNumber(
      candidate.eventStrength,
      Math.max(
        earningsStrength,
        newsStrength,
        corporateActionStrength,
        managementBoost
      )
    )
  );

  const finalEventScore = clamp(
    opportunityScore * WEIGHTS.opportunityScore +
      trustScore * WEIGHTS.trustScore +
      validationScore * WEIGHTS.validationScore +
      confidence * WEIGHTS.confidence +
      eventStrength * WEIGHTS.eventStrength +
      newsStrength * WEIGHTS.newsStrength +
      earningsStrength * WEIGHTS.earningsStrength +
      corporateActionStrength * WEIGHTS.corporateActionStrength
  );

  return {
    opportunityScore,
    trustScore,
    validationScore,
    confidence,
    eventStrength,
    newsStrength,
    earningsStrength,
    corporateActionStrength,
    finalEventScore,
  };
}

export function scoreEventCandidate(
  candidate: ScreenEventCandidate
): EventScoreFactors {
  try {
    return composeEventScoreFactors(candidate);
  } catch {
    return emptyEventScoreFactors();
  }
}

export interface EventExplainabilityInput {
  ticker: string;
  company?: string | null;
  matchedRules: string[];
  supportingEvent?: string | null;
  factors: EventScoreFactors;
  reasonSummary?: string | null;
  evidence?: string[] | null;
}

export function buildEventExplainability(
  input: EventExplainabilityInput
): EventExplainability {
  const ticker = safeScreenText(input.ticker, "—").toUpperCase();
  const matched = (input.matchedRules ?? [])
    .map((r) => safeScreenText(r, ""))
    .filter(Boolean);
  const f = input.factors;

  if (matched.length === 0 && f.finalEventScore === 0) {
    return emptyEventExplainability(SCREEN_EVENT_EMPTY.awaitingEventScan);
  }

  const positive: string[] = [];
  const negative: string[] = [];
  if (f.earningsStrength >= 65) positive.push(`Earnings strength ${f.earningsStrength}`);
  if (f.newsStrength >= 65) positive.push(`News strength ${f.newsStrength}`);
  if (f.corporateActionStrength >= 65)
    positive.push(`Corporate action strength ${f.corporateActionStrength}`);
  if (f.trustScore >= 60) positive.push(`Trust ${f.trustScore}`);
  else if (f.trustScore > 0 && f.trustScore < 45)
    negative.push(`Low trust ${f.trustScore}`);
  if (f.validationScore >= 60) positive.push(`Validation ${f.validationScore}`);
  else if (f.validationScore > 0 && f.validationScore < 45)
    negative.push(`Weak validation ${f.validationScore}`);
  if (f.confidence < 40 && f.confidence > 0)
    negative.push(`Low confidence ${f.confidence}`);
  for (const rule of matched.slice(0, 5)) positive.push(`Matched: ${rule}`);

  const supportingEvent = safeScreenText(
    input.supportingEvent,
    matched[0] ?? "Event signal"
  );

  const evidence =
    Array.isArray(input.evidence) && input.evidence.length > 0
      ? input.evidence.map((e) => safeScreenText(e, "")).filter(Boolean)
      : [
          supportingEvent,
          `Event score ${f.finalEventScore}`,
          `Opportunity ${f.opportunityScore}`,
          `Trust ${f.trustScore}`,
          ...matched.slice(0, 3),
        ].filter(Boolean);

  return {
    whyMatched:
      matched.length > 0
        ? `${ticker} matched ${matched.length} event screen${matched.length === 1 ? "" : "s"}`
        : safeScreenText(
            input.reasonSummary,
            `${ticker} event score ${f.finalEventScore}`
          ),
    supportingEvent,
    matchedRules: matched,
    confidence: f.confidence,
    positiveDrivers: positive.length
      ? positive
      : ["Baseline institutional event monitoring"],
    negativeDrivers: negative.length
      ? negative
      : ["No material negative drivers"],
    aiReasoning: safeScreenText(
      input.reasonSummary,
      `Composite event score ${f.finalEventScore}/100 from opportunity, trust, validation, earnings, news and corporate-action strengths`
    ),
    evidence,
    empty: false,
    emptyMessage: SCREEN_EVENT_EMPTY.awaitingEventScan,
  };
}

export class EventExplainabilityEngine {
  build(input: EventExplainabilityInput): EventExplainability {
    try {
      return buildEventExplainability(input);
    } catch {
      return emptyEventExplainability();
    }
  }

  score(candidate: ScreenEventCandidate): EventScoreFactors {
    return scoreEventCandidate(candidate);
  }
}
