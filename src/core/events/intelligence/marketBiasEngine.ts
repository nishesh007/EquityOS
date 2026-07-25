/**
 * Market Bias Engine (Sprint 10D.4).
 */

import type { EventIntelligenceEvent, MarketDirection } from "@/types/event";
import type { MarketBiasAnalysis, ScoreFactor } from "@/types/eventIntelligence";
import { clampScore } from "@/src/core/events/intelligence/constants";

export function computeMarketBias(
  event: EventIntelligenceEvent,
  confidenceScore: number
): MarketBiasAnalysis {
  const factors: ScoreFactor[] = [];
  let bull = 0;
  let bear = 0;
  let neutral = 0;

  const push = (
    id: string,
    label: string,
    side: "bull" | "bear" | "neutral",
    points: number,
    rationale: string
  ) => {
    if (side === "bull") bull += points;
    else if (side === "bear") bear += points;
    else neutral += points;
    factors.push({
      id,
      label,
      points,
      maxPoints: 30,
      rationale,
    });
  };

  const direction =
    event.macroDetail?.marketImpact.direction ?? event.marketDirection;

  if (direction === "bullish") {
    push("stated_bias", "Stated Market Bias", "bull", 28, "Catalog / macro direction = bullish.");
  } else if (direction === "bearish") {
    push("stated_bias", "Stated Market Bias", "bear", 28, "Catalog / macro direction = bearish.");
  } else if (direction === "neutral") {
    push("stated_bias", "Stated Market Bias", "neutral", 22, "Catalog / macro direction = neutral.");
  } else if (direction === "mixed") {
    push("stated_bias", "Stated Market Bias", "neutral", 12, "Mixed bias — both sides remain open.");
    bull += 8;
    bear += 8;
  } else {
    push("stated_bias", "Stated Market Bias", "neutral", 10, "Direction unknown — default neutral lean.");
  }

  const pos = event.macroDetail?.sectorImpact.positive.length ?? 0;
  const neg = event.macroDetail?.sectorImpact.negative.length ?? 0;
  if (pos > neg + 1) {
    push("sector_skew", "Sector Skew", "bull", 14, `More beneficiary sectors (${pos}) than risked (${neg}).`);
  } else if (neg > pos + 1) {
    push("sector_skew", "Sector Skew", "bear", 14, `More negatively mapped sectors (${neg}) than beneficiaries (${pos}).`);
  } else if (pos + neg > 0) {
    push("sector_skew", "Sector Skew", "neutral", 10, "Balanced sector beneficiary / risk set.");
  }

  const reaction = event.macroDetail?.historicalReaction?.averages.niftyMovePct;
  if (reaction != null) {
    if (reaction > 0.25) {
      push("history", "Historical Avg Move", "bull", 12, `Avg NIFTY reaction +${reaction.toFixed(2)}%.`);
    } else if (reaction < -0.25) {
      push("history", "Historical Avg Move", "bear", 12, `Avg NIFTY reaction ${reaction.toFixed(2)}%.`);
    } else {
      push("history", "Historical Avg Move", "neutral", 8, `Avg NIFTY reaction near flat (${reaction.toFixed(2)}%).`);
    }
  }

  const ind = event.macroDetail?.indicator;
  if (ind?.forecast != null && ind.previous != null) {
    const delta = ind.forecast - ind.previous;
    const growthLike = ["gdp", "quarterly_gdp", "pmi", "pmi_services", "iip", "gst_collection"].includes(
      event.eventType
    );
    const inflationLike = ["cpi", "core_cpi", "wpi", "ppi"].includes(event.eventType);
    if (growthLike && delta > 0) {
      push("forecast_delta", "Forecast vs Previous", "bull", 10, "Growth forecast above previous print.");
    } else if (growthLike && delta < 0) {
      push("forecast_delta", "Forecast vs Previous", "bear", 10, "Growth forecast below previous print.");
    } else if (inflationLike && delta > 0) {
      push("forecast_delta", "Forecast vs Previous", "bear", 10, "Higher inflation forecast vs previous.");
    } else if (inflationLike && delta < 0) {
      push("forecast_delta", "Forecast vs Previous", "bull", 10, "Softer inflation forecast vs previous.");
    }
  }

  let bias: MarketDirection = "neutral";
  if (bull > bear + 8 && bull > neutral) bias = "bullish";
  else if (bear > bull + 8 && bear > neutral) bias = "bearish";
  else if (Math.abs(bull - bear) <= 8 && (bull > 10 || bear > 10)) bias = "mixed";
  else bias = "neutral";

  const dominance = Math.max(bull, bear, neutral);
  const biasConfidence = clampScore(
    dominance * 1.4 + confidenceScore * 0.25
  );

  return {
    bias,
    confidence: biasConfidence,
    rationale: `Bias ${bias} from stated direction, sector skew and historical reaction (bull ${bull} / bear ${bear} / neutral ${neutral}).`,
    factors,
  };
}

export const marketBiasEngine = {
  compute: computeMarketBias,
};
