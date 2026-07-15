/**
 * Market reaction engine — gap / intraday / volume / delivery from existing quotes.
 */

import { round } from "@/lib/engine/utils";
import type {
  EstimateComparisonView,
  MarketReactionView,
  ReactionQuoteInput,
} from "./PostEarningsModels";
import { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

function fmtPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return POST_EARNINGS_EMPTY.awaitingResults;
  }
  const rounded = round(value, 2);
  if (rounded === 0) return "Flat";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function getMarketReaction(
  quote: ReactionQuoteInput | null | undefined,
  comparison?: EstimateComparisonView
): MarketReactionView {
  if (
    !quote ||
    quote.open == null ||
    quote.previousClose == null ||
    !Number.isFinite(quote.open) ||
    !Number.isFinite(quote.previousClose) ||
    quote.previousClose === 0
  ) {
    // Fallback framing from print quality when live quote is unavailable.
    if (comparison?.available) {
      const positive =
        comparison.overallOutcome === "Beat" ||
        comparison.overallOutcome === "Strong Beat";
      const negative =
        comparison.overallOutcome === "Miss" ||
        comparison.overallOutcome === "Major Miss";
      return {
        gapLabel: positive ? "Gap Up" : negative ? "Gap Down" : "Flat Open",
        gapPercent: POST_EARNINGS_EMPTY.awaitingResults,
        intradayReaction: positive
          ? "Constructive bias"
          : negative
            ? "Defensive bias"
            : "Two-way",
        volumeSpike: POST_EARNINGS_EMPTY.awaitingResults,
        deliveryPercent: POST_EARNINGS_EMPTY.awaitingResults,
        institutionalFlow: positive
          ? "Institutional Buying"
          : negative
            ? "Institutional Selling"
            : "Mixed",
        available: true,
        emptyMessage: "",
      };
    }

    return {
      gapLabel: POST_EARNINGS_EMPTY.awaitingResults,
      gapPercent: POST_EARNINGS_EMPTY.awaitingResults,
      intradayReaction: POST_EARNINGS_EMPTY.awaitingResults,
      volumeSpike: POST_EARNINGS_EMPTY.awaitingResults,
      deliveryPercent: POST_EARNINGS_EMPTY.awaitingResults,
      institutionalFlow: "Mixed",
      available: false,
      emptyMessage: POST_EARNINGS_EMPTY.awaitingResults,
    };
  }

  const gapPct =
    ((quote.open - quote.previousClose) / Math.abs(quote.previousClose)) * 100;
  const gapLabel =
    gapPct >= 1 ? "Gap Up" : gapPct <= -1 ? "Gap Down" : "Flat Open";

  const dayPct = quote.changePercent;
  let intradayReaction = "Two-way";
  if (dayPct != null && Number.isFinite(dayPct)) {
    if (dayPct >= 2) intradayReaction = "Strong Follow-Through";
    else if (dayPct >= 0.5) intradayReaction = "Positive Intraday";
    else if (dayPct <= -2) intradayReaction = "Sharp Selloff";
    else if (dayPct <= -0.5) intradayReaction = "Negative Intraday";
  }

  const volume = quote.volume;
  const volumeSpike =
    volume != null && Number.isFinite(volume) && volume > 0
      ? volume >= 5_000_000
        ? "Volume Spike"
        : "Normal Volume"
      : POST_EARNINGS_EMPTY.awaitingResults;

  const delivery =
    quote.deliveryPercent != null && Number.isFinite(quote.deliveryPercent)
      ? `${round(quote.deliveryPercent, 1)}%`
      : POST_EARNINGS_EMPTY.awaitingResults;

  let institutionalFlow: MarketReactionView["institutionalFlow"] = "Mixed";
  if (
    quote.deliveryPercent != null &&
    Number.isFinite(quote.deliveryPercent) &&
    dayPct != null
  ) {
    if (quote.deliveryPercent >= 45 && dayPct > 0) {
      institutionalFlow = "Institutional Buying";
    } else if (quote.deliveryPercent >= 45 && dayPct < 0) {
      institutionalFlow = "Institutional Selling";
    }
  } else if (gapPct >= 1.5 && (dayPct ?? 0) > 0) {
    institutionalFlow = "Institutional Buying";
  } else if (gapPct <= -1.5 && (dayPct ?? 0) < 0) {
    institutionalFlow = "Institutional Selling";
  }

  return {
    gapLabel,
    gapPercent: fmtPct(gapPct),
    intradayReaction,
    volumeSpike,
    deliveryPercent: delivery,
    institutionalFlow,
    available: true,
    emptyMessage: "",
  };
}
