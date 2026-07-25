/**
 * Sprint 9F.6 — Recommendation Conflict Validator.
 *
 * Detects unexplained BUY vs SELL conflicts across horizons for the same
 * symbol. Distant horizons may retain both sides with an explanation;
 * adjacent horizons drop the weaker recommendation.
 *
 * Does NOT change trade formulas or UI styling.
 */

import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import type {
  HorizonId,
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";

/** Ordinal horizon bands — larger gap ⇒ more compatible opposite sides. */
export const HORIZON_BAND: Record<HorizonId, number> = {
  scalping: 0,
  intraday: 1,
  btst: 2,
  swing: 3,
  short_term: 4,
  medium_term: 5,
  long_term: 6,
};

/**
 * Minimum band distance to retain BUY+SELL without dropping either side.
 * Intraday (1) vs Long Term (6) = 5 → retain.
 * Short (4) vs Medium (5) = 1 → reject weaker.
 */
export const MIN_BAND_DISTANCE_TO_RETAIN = 3;

export interface ConflictPair {
  symbol: string;
  buyHorizon: HorizonId;
  sellHorizon: HorizonId;
  bandDistance: number;
  resolution: "retained_with_explanation" | "removed_weaker";
  keptHorizons: HorizonId[];
  removedHorizon: HorizonId | null;
  explanation: string;
}

export interface ConflictAuditReport {
  symbolsScanned: number;
  conflictsDetected: number;
  retainedWithExplanation: number;
  removedWeaker: number;
  pairs: ConflictPair[];
}

function sideOf(row: HorizonRecommendation): "BUY" | "SELL" {
  if (row.recommendation.action === "SELL" || row.selection.side === "Short") {
    return "SELL";
  }
  return "BUY";
}

function rankOf(row: HorizonRecommendation): number {
  return (
    (row.recommendationQualityScore ?? 0) * 1000 +
    row.selection.score * 10 +
    Math.max(row.recommendation.conviction, row.recommendation.confidence)
  );
}

function bandDistance(a: HorizonId, b: HorizonId): number {
  return Math.abs(HORIZON_BAND[a] - HORIZON_BAND[b]);
}

function sessionLike(horizonId: HorizonId): boolean {
  return (
    horizonId === "scalping" ||
    horizonId === "intraday" ||
    horizonId === "btst"
  );
}

function investmentLike(horizonId: HorizonId): boolean {
  return (
    horizonId === "short_term" ||
    horizonId === "medium_term" ||
    horizonId === "long_term"
  );
}

function buildRetainExplanation(
  buy: HorizonRecommendation,
  sell: HorizonRecommendation
): string {
  const sellHorizon = sell.horizonId;
  const buyHorizon = buy.horizonId;
  const sellWhy =
    sell.quality.whyThisHorizon[0] ??
    sell.quality.targetMethodology ??
    "session / tactical structure";
  const buyWhy =
    buy.quality.whyThisHorizon[0] ??
    buy.quality.targetMethodology ??
    "multi-horizon investment thesis";

  if (sessionLike(sellHorizon) && investmentLike(buyHorizon)) {
    return `${sellHorizon.replace("_", " ")} SELL: tactical / profit-booking (${sellWhy}). ${buyHorizon.replace("_", " ")} BUY: longer-horizon fundamentals remain attractive (${buyWhy}).`;
  }
  if (sessionLike(buyHorizon) && investmentLike(sellHorizon)) {
    return `${buyHorizon.replace("_", " ")} BUY: tactical bounce / session setup (${buyWhy}). ${sellHorizon.replace("_", " ")} SELL: longer-horizon distribution / valuation pressure (${sellWhy}).`;
  }
  return `Opposite sides retained across distant horizons (${sellHorizon} SELL vs ${buyHorizon} BUY). SELL thesis: ${sellWhy}. BUY thesis: ${buyWhy}.`;
}

/**
 * Resolve BUY/SELL conflicts across the seven horizon pipelines.
 */
export function resolveRecommendationConflicts(
  snapshot: HorizonPipelineSnapshot
): {
  snapshot: HorizonPipelineSnapshot;
  audit: ConflictAuditReport;
} {
  const bySymbol = new Map<string, HorizonRecommendation[]>();
  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    for (const row of snapshot[horizonId]) {
      const symbol = row.selection.symbol.toUpperCase();
      const list = bySymbol.get(symbol) ?? [];
      list.push(row);
      bySymbol.set(symbol, list);
    }
  }

  const removeKeys = new Set<string>();
  const pairs: ConflictPair[] = [];
  let retainedWithExplanation = 0;
  let removedWeaker = 0;

  for (const [symbol, rows] of bySymbol) {
    const buys = rows.filter((r) => sideOf(r) === "BUY");
    const sells = rows.filter((r) => sideOf(r) === "SELL");
    if (buys.length === 0 || sells.length === 0) continue;

    // Pair each sell with the strongest conflicting buy (and vice versa logic).
    for (const sell of sells) {
      for (const buy of buys) {
        const distance = bandDistance(sell.horizonId, buy.horizonId);
        const sellKey = `${sell.horizonId}:${symbol}`;
        const buyKey = `${buy.horizonId}:${symbol}`;

        if (distance >= MIN_BAND_DISTANCE_TO_RETAIN) {
          const explanation = buildRetainExplanation(buy, sell);
          // Annotate both rows in-place via later rewrite map.
          pairs.push({
            symbol,
            buyHorizon: buy.horizonId,
            sellHorizon: sell.horizonId,
            bandDistance: distance,
            resolution: "retained_with_explanation",
            keptHorizons: [buy.horizonId, sell.horizonId],
            removedHorizon: null,
            explanation,
          });
          retainedWithExplanation += 1;
          // Store explanation on both via a side channel map.
          annotateConflict(buy, explanation);
          annotateConflict(sell, explanation);
          continue;
        }

        // Adjacent / near horizons — drop the weaker side.
        const weaker = rankOf(buy) >= rankOf(sell) ? sell : buy;
        const stronger = weaker === sell ? buy : sell;
        const weakerKey = `${weaker.horizonId}:${symbol}`;
        removeKeys.add(weakerKey);
        pairs.push({
          symbol,
          buyHorizon: buy.horizonId,
          sellHorizon: sell.horizonId,
          bandDistance: distance,
          resolution: "removed_weaker",
          keptHorizons: [stronger.horizonId],
          removedHorizon: weaker.horizonId,
          explanation: `Unexplained ${buy.horizonId} BUY vs ${sell.horizonId} SELL (band distance ${distance} < ${MIN_BAND_DISTANCE_TO_RETAIN}) — removed weaker ${weaker.horizonId} recommendation.`,
        });
        removedWeaker += 1;
        void buyKey;
        void sellKey;
      }
    }
  }

  const next = {} as HorizonPipelineSnapshot;
  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    next[horizonId] = snapshot[horizonId].filter(
      (row) => !removeKeys.has(`${horizonId}:${row.selection.symbol.toUpperCase()}`)
    );
  }

  return {
    snapshot: next,
    audit: {
      symbolsScanned: bySymbol.size,
      conflictsDetected: pairs.length,
      retainedWithExplanation,
      removedWeaker,
      pairs,
    },
  };
}

function annotateConflict(
  row: HorizonRecommendation,
  explanation: string
): void {
  const note = `Conflict retained: ${explanation}`;
  if (!row.calibrationNotes) row.calibrationNotes = [];
  if (!row.calibrationNotes.some((n) => n.startsWith("Conflict retained:"))) {
    row.calibrationNotes.push(note);
  }
  if (!row.recommendation.reasons.includes(note)) {
    row.recommendation.reasons = [...row.recommendation.reasons, note];
  }
  if (!row.quality.shorterLongerFit.includes(note)) {
    row.quality = {
      ...row.quality,
      shorterLongerFit: [...row.quality.shorterLongerFit, note],
    };
  }
}

export function emptyConflictAudit(): ConflictAuditReport {
  return {
    symbolsScanned: 0,
    conflictsDetected: 0,
    retainedWithExplanation: 0,
    removedWeaker: 0,
    pairs: [],
  };
}
