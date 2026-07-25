/**
 * Impact Score Engine (Sprint 10D.4) — 0–100 with factor contributions.
 */

import { getEventCategory } from "@/constants/eventTypes";
import type { EventIntelligenceEvent } from "@/types/event";
import type { ImpactAnalysis, ScoreFactor } from "@/types/eventIntelligence";
import {
  EVENT_TYPE_IMPACT_BASE,
  FREQUENCY_SCORE,
  IMPORTANCE_CRITICALITY,
  clampScore,
} from "@/src/core/events/intelligence/constants";

function historicalVolatilityPoints(event: EventIntelligenceEvent): ScoreFactor {
  const reaction = event.macroDetail?.historicalReaction;
  const post = event.earningsDetail?.historical.postResultMove;
  let points = 6;
  let rationale = "Limited historical volatility sample; baseline applied.";

  if (reaction?.averages.niftyMovePct != null) {
    const abs =
      Math.abs(reaction.averages.niftyMovePct) +
      Math.abs(reaction.averages.bankNiftyMovePct ?? 0) * 0.5;
    points = Math.min(28, 8 + abs * 8);
    rationale = `Avg NIFTY move ${reaction.averages.niftyMovePct.toFixed(2)}% across ${reaction.meetings.length} prior prints.`;
  } else if (post) {
    const day1 = post.day1Pct ?? 0;
    const avgVol = post.averageVolatilityPct ?? 0;
    const abs = Math.abs(day1) + Math.abs(avgVol) * 0.4;
    points = Math.min(28, 6 + abs * 4);
    rationale = `Post-result 1D ${day1.toFixed(2)}% · avg vol ${avgVol.toFixed(2)}%.`;
  } else if (event.historicalAvailable) {
    points = 12;
    rationale = "Historical flag present without quantified series.";
  }

  return {
    id: "historical_volatility",
    label: "Historical Volatility",
    points: Math.round(points),
    maxPoints: 28,
    rationale,
  };
}

function marketSensitivityPoints(event: EventIntelligenceEvent): ScoreFactor {
  const category = getEventCategory(event.eventType);
  let points = 8;
  let rationale = "Standard market sensitivity.";

  if (category === "central_bank" || event.eventType === "nfp") {
    points = 18;
    rationale = "Policy / labour prints reprice rates, FX and equity beta.";
  } else if (category === "economic" || category === "critical") {
    points = 14;
    rationale = "Macro / index catalyst with cross-asset spillover.";
  } else if (category === "results") {
    points = event.marketCap === "mega" || event.marketCap === "large" ? 14 : 10;
    rationale = `Results sensitivity scaled by ${event.marketCap} cap bucket.`;
  } else if (category === "corporate_actions") {
    points = 7;
    rationale = "Corporate action mainly stock-specific unless mega-cap.";
  }

  const vol = event.macroDetail?.marketImpact.volatility;
  if (vol === "high") points = Math.min(20, points + 4);
  if (vol === "low") points = Math.max(4, points - 3);

  return {
    id: "market_sensitivity",
    label: "Market Sensitivity",
    points: Math.round(points),
    maxPoints: 20,
    rationale,
  };
}

function sectorBreadthPoints(event: EventIntelligenceEvent): ScoreFactor {
  const sectors = new Set<string>([
    ...event.affectedSectors,
    ...(event.macroDetail?.sectorImpact.positive ?? []),
    ...(event.macroDetail?.sectorImpact.negative ?? []),
  ].filter((s) => s && s.toLowerCase() !== "all"));

  const count = sectors.size || (event.affectedSectors.includes("All") ? 8 : 1);
  const points = Math.min(22, 4 + count * 2.5);
  return {
    id: "sector_breadth",
    label: "Sector Breadth",
    points: Math.round(points),
    maxPoints: 22,
    rationale: `${count} mapped sector(s) in the impact set.`,
  };
}

export function computeImpactAnalysis(
  event: EventIntelligenceEvent
): ImpactAnalysis {
  const typeBase = EVENT_TYPE_IMPACT_BASE[event.eventType] ?? 12;
  const factors: ScoreFactor[] = [
    {
      id: "event_type",
      label: "Event Type",
      points: typeBase,
      maxPoints: 40,
      rationale: `Base weight for ${event.eventType.replace(/_/g, " ")}.`,
    },
    historicalVolatilityPoints(event),
    marketSensitivityPoints(event),
    sectorBreadthPoints(event),
    {
      id: "frequency",
      label: "Frequency",
      points:
        FREQUENCY_SCORE[event.macroDetail?.frequency ?? "adhoc"] ??
        (event.eventType === "quarterly_results" ? 7 : 6),
      maxPoints: 10,
      rationale: `Release cadence: ${event.macroDetail?.frequency ?? "event-driven"}.`,
    },
    {
      id: "market_cap_exposure",
      label: "Market Cap Exposure",
      points:
        event.marketCap === "mega"
          ? 10
          : event.marketCap === "large"
            ? 8
            : event.exchange === "MACRO"
              ? 9
              : event.marketCap === "mid"
                ? 5
                : 3,
      maxPoints: 10,
      rationale:
        event.exchange === "MACRO"
          ? "Index-level / system-wide exposure."
          : `Issuer bucket: ${event.marketCap}.`,
    },
    {
      id: "criticality",
      label: "Criticality",
      points: IMPORTANCE_CRITICALITY[event.importance],
      maxPoints: 22,
      rationale: `Catalog importance = ${event.importance}.`,
    },
  ];

  // Soft-normalize: raw sum can exceed 100; scale to 100 while preserving ranks.
  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const maxRaw = factors.reduce((sum, f) => sum + f.maxPoints, 0);
  const score = clampScore((raw / Math.max(maxRaw, 1)) * 100);

  // Re-scale displayed contributions to sum ≈ score for explainability.
  const scale = score / Math.max(raw, 1);
  const scaled = factors.map((f) => ({
    ...f,
    points: Math.round(f.points * scale),
  }));
  const drift = score - scaled.reduce((s, f) => s + f.points, 0);
  if (scaled[0]) scaled[0].points += drift;

  return {
    score,
    factors: scaled,
    formulaNote:
      "Impact = normalised weighted sum of Event Type, Historical Volatility, Market Sensitivity, Sector Breadth, Frequency, Market Cap Exposure and Criticality.",
  };
}

export const impactScoreEngine = {
  compute: computeImpactAnalysis,
};
