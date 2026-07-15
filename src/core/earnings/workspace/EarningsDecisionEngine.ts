/**
 * Decision panel — recommendation from reused AI scorecards / transcripts.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { EarningsScorecard } from "@/src/core/earnings/dashboard";
import { getCatalysts } from "@/src/core/earnings/transcripts";
import type {
  DecisionRecommendation,
  DecisionSummary,
} from "./WorkspaceModels";

export function resolveRecommendation(
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard
): DecisionRecommendation {
  if (scorecard.resultsReleased) {
    if (scorecard.outlook === "Bullish" && scorecard.aiConfidence >= 65) {
      return "Accumulate";
    }
    if (scorecard.outlook === "Bearish" || scorecard.riskScore >= 80) {
      return "Reduce";
    }
    return "Hold";
  }

  if (
    scorecard.outlook === "Bullish" &&
    scorecard.beatProbability >= 65 &&
    scorecard.aiConfidence >= 70 &&
    scorecard.riskScore < 60
  ) {
    return event.inPortfolio ? "Increase Position" : "Accumulate";
  }

  if (
    scorecard.outlook === "Bearish" &&
    (scorecard.beatProbability < 40 || scorecard.riskScore >= 75)
  ) {
    return event.inPortfolio ? "Exit" : "Monitor";
  }

  if (scorecard.riskScore >= 70 || scorecard.expectedVolatilityScore >= 75) {
    return "Monitor";
  }

  if (event.inPortfolio) return "Hold";
  return "Monitor";
}

export function buildDecisionReasoning(
  recommendation: DecisionRecommendation,
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard
): string {
  const outlook = scorecard.outlook;
  const beat = scorecard.beatProbability;
  const risk = scorecard.riskScore;

  switch (recommendation) {
    case "Increase Position":
      return `${event.ticker} shows ${outlook.toLowerCase()} AI outlook with beat probability ${beat} and manageable risk ${risk}. Portfolio weight can be increased ahead of ${event.quarter}.`;
    case "Accumulate":
      return `Conviction supports accumulation: AI confidence ${scorecard.aiConfidence}, beat probability ${beat}. Monitor catalysts into the print.`;
    case "Hold":
      return `Maintain current stance. Outlook ${outlook}, risk ${risk}, volatility ${scorecard.expectedVolatilityScore}. No high-conviction edge to resize.`;
    case "Reduce":
      return `Risk/reward skewed lower: outlook ${outlook}, risk ${risk}. Trim exposure around earnings.`;
    case "Exit":
      return `Elevated downside into earnings (risk ${risk}, beat probability ${beat}). Exit or hedge portfolio exposure.`;
    case "Monitor":
    default:
      return `Watch ${event.ticker} through the event window. Conviction not yet decisive (confidence ${scorecard.aiConfidence}).`;
  }
}

export function getDecisionSummary(
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard
): DecisionSummary {
  const recommendation = resolveRecommendation(event, scorecard);
  let catalysts: string[] = [];
  try {
    const extracted = getCatalysts(event.ticker, event.resultDate);
    if (extracted.available) {
      catalysts = extracted.catalysts
        .map((c) => c.detail || c.category)
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    catalysts = [];
  }
  if (catalysts.length === 0) {
    catalysts = [
      `${event.quarter} ${event.financialYear} results`,
      scorecard.transcriptAvailable
        ? "Management commentary"
        : "Pre-earnings positioning",
    ];
  }

  return {
    ticker: event.ticker,
    companyName: event.companyName,
    recommendation,
    reasoning: buildDecisionReasoning(recommendation, event, scorecard),
    confidence: scorecard.available ? String(scorecard.aiConfidence) : "—",
    risk: String(scorecard.riskScore),
    catalysts,
    event,
    scorecard,
  };
}

export class EarningsDecisionEngine {
  getDecisionSummaries(
    items: Array<{ event: EarningsCalendarEvent; scorecard: EarningsScorecard }>
  ): DecisionSummary[] {
    return items.map(({ event, scorecard }) =>
      getDecisionSummary(event, scorecard)
    );
  }
}

let decisionSingleton: EarningsDecisionEngine | null = null;

export function getEarningsDecisionEngine(): EarningsDecisionEngine {
  if (!decisionSingleton) decisionSingleton = new EarningsDecisionEngine();
  return decisionSingleton;
}

export function resetEarningsDecisionEngine(): void {
  decisionSingleton = null;
}
