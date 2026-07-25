/**
 * Historical Insight Engine (Sprint 10D.4).
 */

import type { EventIntelligenceEvent } from "@/types/event";
import type {
  HistoricalInsight,
  HistoricalInsightMetric,
} from "@/types/eventIntelligence";

function interpretMove(value: number | null, unit: "%" | "bps"): string {
  if (value == null || !Number.isFinite(value)) return "Insufficient sample.";
  const abs = Math.abs(value);
  if (unit === "%") {
    if (abs < 0.2) return "Historically muted equity reaction.";
    if (value > 0) return "Historically supportive for risk assets.";
    return "Historically a soft-to-negative equity cue.";
  }
  if (abs < 2) return "Bond yield reaction typically contained.";
  if (value > 0) return "Yields tend to rise into / after the event.";
  return "Yields tend to ease around the event.";
}

function pct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function computeHistoricalInsight(
  event: EventIntelligenceEvent
): HistoricalInsight | null {
  const reaction = event.macroDetail?.historicalReaction;
  if (reaction && reaction.meetings.length > 0) {
    const metrics: HistoricalInsightMetric[] = [
      {
        label: "Average NIFTY Move",
        value: pct(reaction.averages.niftyMovePct),
        interpretation: interpretMove(reaction.averages.niftyMovePct, "%"),
      },
      {
        label: "Average BANKNIFTY Move",
        value: pct(reaction.averages.bankNiftyMovePct),
        interpretation: interpretMove(reaction.averages.bankNiftyMovePct, "%"),
      },
      {
        label: "Average INR Move",
        value: pct(reaction.averages.inrMovePct),
        interpretation: interpretMove(reaction.averages.inrMovePct, "%"),
      },
      {
        label: "Average Bond Yield Move",
        value:
          reaction.averages.bondYieldMoveBps != null
            ? `${reaction.averages.bondYieldMoveBps > 0 ? "+" : ""}${reaction.averages.bondYieldMoveBps.toFixed(1)} bps`
            : "—",
        interpretation: interpretMove(reaction.averages.bondYieldMoveBps, "bps"),
      },
    ];

    const nifty = reaction.averages.niftyMovePct;
    const summary =
      nifty == null
        ? `${reaction.seriesLabel}: sample available but averages incomplete.`
        : `${reaction.seriesLabel}: average NIFTY move ${pct(nifty)} across ${reaction.meetings.length} observations — ${interpretMove(nifty, "%")}`;

    return {
      seriesLabel: reaction.seriesLabel,
      summary,
      metrics,
      sampleSize: reaction.meetings.length,
    };
  }

  const hist = event.earningsDetail?.historical;
  if (hist && hist.quarters.length > 0) {
    const m = hist.postResultMove;
    const avgSurprise = hist.averageSurprisePct ?? 0;
    const avgVol = m.averageVolatilityPct ?? 0;
    const metrics: HistoricalInsightMetric[] = [
      {
        label: "Avg Surprise",
        value: pct(hist.averageSurprisePct),
        interpretation:
          Math.abs(avgSurprise) < 2
            ? "Prints typically land near consensus."
            : "Material surprise tendency vs street.",
      },
      {
        label: "Beat / Miss / Inline",
        value: `${hist.beatCount} / ${hist.missCount} / ${hist.inlineCount}`,
        interpretation: `Beat rate ${(
          (hist.beatCount / hist.quarters.length) *
          100
        ).toFixed(0)}% over ${hist.quarters.length} quarters.`,
      },
      {
        label: "1D Post-Result Move",
        value: pct(m.day1Pct),
        interpretation: interpretMove(m.day1Pct, "%"),
      },
      {
        label: "Avg Post-Result Volatility",
        value: pct(m.averageVolatilityPct),
        interpretation:
          avgVol > 3
            ? "Elevated post-print volatility regime."
            : "Contained post-print volatility.",
      },
    ];

    return {
      seriesLabel: `Last ${hist.quarters.length} quarters`,
      summary: `Across ${hist.quarters.length} quarters, avg surprise ${pct(hist.averageSurprisePct)} with 1D post-result move ${pct(m.day1Pct)}.`,
      metrics,
      sampleSize: hist.quarters.length,
    };
  }

  if (event.historicalAvailable) {
    return {
      seriesLabel: "Historical flag",
      summary:
        "Historical availability is marked, but no quantified reaction series is attached to this event yet.",
      metrics: [],
      sampleSize: 0,
    };
  }

  return null;
}

export const historicalInsightEngine = {
  compute: computeHistoricalInsight,
};
