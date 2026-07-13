import type { TradeOutcome } from "@/lib/opportunity-engine/trade-outcome";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export interface AISelfReview {
  candidateId: string;
  symbol: string;
  whyGenerated: string;
  whatHappened: string;
  entryImprovement: string;
  exitImprovement: string;
  lessons: string;
}

function statusLabel(status: TradeOutcome["currentStatus"]): string {
  switch (status) {
    case "target2_hit":
      return "Target 2 achieved";
    case "target1_hit":
      return "Target 1 achieved";
    case "stopped":
      return "Stop loss triggered";
    case "breakeven":
      return "Closed near entry";
    default:
      return "Trade still open at session close";
  }
}

export function generateTradeReview(
  candidate: OpportunityCandidate,
  outcome: TradeOutcome
): AISelfReview {
  const reasons =
    candidate.confidenceReasons && candidate.confidenceReasons.length > 0
      ? candidate.confidenceReasons.slice(0, 3).join("; ")
      : candidate.reason.replace(/\n/g, "; ");

  const whyGenerated = `${candidate.side} ${candidate.category} setup (conviction ${candidate.aiConvictionScore}) triggered by: ${reasons}.`;

  const whatHappened = `${statusLabel(outcome.currentStatus)}. Peak gain +${outcome.highestGainPercent.toFixed(2)}%, max drawdown ${outcome.lowestDrawdownPercent.toFixed(2)}%. Grade ${outcome.tradeGrade}.`;

  let entryImprovement = "Entry zone was appropriate for the signal strength.";
  if (outcome.currentStatus === "stopped" && outcome.highestGainPercent >= 0.5) {
    entryImprovement =
      "Consider a wider stop or scaled entry — price tested higher before reversing.";
  } else if (outcome.highestGainPercent < 0.3 && outcome.currentStatus === "open") {
    entryImprovement =
      "Entry may have been early; wait for volume confirmation or DMA retest.";
  } else if (outcome.tradeGrade === "A") {
    entryImprovement = "Entry timing aligned well with breakout and volume expansion.";
  }

  let exitImprovement = "Hold to Target 1 with partial profit at Target 2.";
  if (outcome.currentStatus === "target1_hit" && outcome.highestGainPercent < candidate.riskReward) {
    exitImprovement = "Trail stop to breakeven after Target 1 to capture extended moves.";
  } else if (outcome.currentStatus === "stopped") {
    exitImprovement = "Tighten exit on failed follow-through; respect stop without averaging down.";
  } else if (outcome.currentStatus === "target2_hit") {
    exitImprovement = "Full target ladder worked — maintain same exit framework.";
  }

  const lessons =
    outcome.tradeGrade === "A" || outcome.tradeGrade === "B"
      ? `High-conviction ${candidate.category} signals with volume and trend alignment delivered. Replicate this filter stack.`
      : `Signal lacked follow-through despite ${candidate.aiConvictionScore} conviction — require stronger volume or RS confirmation next time.`;

  return {
    candidateId: candidate.id,
    symbol: candidate.symbol,
    whyGenerated,
    whatHappened,
    entryImprovement,
    exitImprovement,
    lessons,
  };
}

export function buildAISelfReviews(
  candidates: OpportunityCandidate[],
  outcomes: TradeOutcome[]
): AISelfReview[] {
  const outcomeById = new Map(outcomes.map((o) => [o.candidateId, o]));
  const completed = candidates.filter((c) => {
    const outcome = outcomeById.get(c.id);
    return outcome && outcome.currentStatus !== "open";
  });

  return completed.map((candidate) =>
    generateTradeReview(candidate, outcomeById.get(candidate.id)!)
  );
}
