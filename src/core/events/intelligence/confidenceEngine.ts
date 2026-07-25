/**
 * Confidence Score Engine (Sprint 10D.4).
 */

import type { EventIntelligenceEvent } from "@/types/event";
import type { ConfidenceBreakdown, ScoreFactor } from "@/types/eventIntelligence";
import { clampScore } from "@/src/core/events/intelligence/constants";

export function computeConfidenceBreakdown(
  event: EventIntelligenceEvent
): ConfidenceBreakdown {
  const factors: ScoreFactor[] = [];

  // Data completeness
  let completeness = 12;
  const completenessNotes: string[] = [];
  if (event.description) {
    completeness += 6;
    completenessNotes.push("description");
  }
  if (event.time) {
    completeness += 4;
    completenessNotes.push("release time");
  }
  if (event.expectedImpact) {
    completeness += 4;
    completenessNotes.push("expected impact");
  }
  if (event.macroDetail || event.earningsDetail || event.corporateActionDetail) {
    completeness += 10;
    completenessNotes.push("typed detail payload");
  }
  factors.push({
    id: "data_completeness",
    label: "Data Completeness",
    points: Math.min(36, completeness),
    maxPoints: 36,
    rationale:
      completenessNotes.length > 0
        ? `Present: ${completenessNotes.join(", ")}.`
        : "Sparse event metadata.",
  });

  // Historical coverage
  let hist = 8;
  let histNote = "Thin historical coverage.";
  if (event.macroDetail?.historicalReaction?.meetings.length) {
    const n = event.macroDetail.historicalReaction.meetings.length;
    hist = Math.min(28, 10 + n * 2);
    histNote = `${n} prior market-reaction prints available.`;
  } else if (event.earningsDetail?.historical.quarters.length) {
    const n = event.earningsDetail.historical.quarters.length;
    hist = Math.min(28, 10 + n * 2);
    histNote = `${n}-quarter earnings history available.`;
  } else if (event.historicalAvailable) {
    hist = 14;
    histNote = "Historical available flag without dense series.";
  }
  factors.push({
    id: "historical_coverage",
    label: "Historical Coverage",
    points: hist,
    maxPoints: 28,
    rationale: histNote,
  });

  // Consensus availability
  let consensus = 6;
  let consensusNote = "No consensus / forecast print.";
  const ind = event.macroDetail?.indicator;
  if (ind) {
    let hits = 0;
    if (ind.forecast != null) hits += 1;
    if (ind.consensus != null) hits += 1;
    if (ind.previous != null) hits += 1;
    if (ind.actual != null) hits += 1;
    consensus = Math.min(20, 4 + hits * 4);
    consensusNote = `Indicator fields populated: ${hits}/4 (forecast/consensus/previous/actual).`;
  } else if (event.earningsDetail?.estimates) {
    const e = event.earningsDetail.estimates;
    let hits = 0;
    if (e.expectedRevenueCr != null) hits += 1;
    if (e.expectedEps != null) hits += 1;
    if (e.consensusRating) hits += 1;
    consensus = Math.min(20, 6 + hits * 4);
    consensusNote = `Earnings estimate fields: ${hits} present.`;
  } else if (event.corporateActionDetail) {
    consensus = 14;
    consensusNote = "Corporate action terms fully specified.";
  }
  factors.push({
    id: "consensus_availability",
    label: "Consensus Availability",
    points: consensus,
    maxPoints: 20,
    rationale: consensusNote,
  });

  // Economic consistency
  let consistency = 10;
  let consistencyNote = "Baseline consistency.";
  if (ind && ind.forecast != null && ind.consensus != null) {
    const gap = Math.abs(ind.forecast - ind.consensus);
    const scale = Math.max(Math.abs(ind.consensus), 1);
    const rel = gap / scale;
    if (rel < 0.05) {
      consistency = 16;
      consistencyNote = "Forecast tightly aligned with consensus.";
    } else if (rel < 0.15) {
      consistency = 12;
      consistencyNote = "Moderate forecast vs consensus dispersion.";
    } else {
      consistency = 7;
      consistencyNote = "Wide forecast vs consensus gap reduces confidence.";
    }
  } else if (event.earningsDetail?.estimates.historicalSurprisePct != null) {
    const surprise = Math.abs(event.earningsDetail.estimates.historicalSurprisePct);
    consistency = surprise < 3 ? 14 : surprise < 6 ? 11 : 8;
    consistencyNote = `Historical surprise ${event.earningsDetail.estimates.historicalSurprisePct.toFixed(2)}%.`;
  }
  factors.push({
    id: "economic_consistency",
    label: "Economic Consistency",
    points: consistency,
    maxPoints: 16,
    rationale: consistencyNote,
  });

  const raw = factors.reduce((s, f) => s + f.points, 0);
  const maxRaw = factors.reduce((s, f) => s + f.maxPoints, 0);
  const score = clampScore((raw / Math.max(maxRaw, 1)) * 100);
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
      "Confidence = normalised sum of Data Completeness, Historical Coverage, Consensus Availability and Economic Consistency.",
  };
}

export const confidenceEngine = {
  compute: computeConfidenceBreakdown,
};
