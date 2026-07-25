/**
 * Sprint 9F.5 — Institutional Liquidity & Tradability Engine.
 *
 * Runs BEFORE horizon strategy selection. A one-day relative-volume spike
 * must never override weak 20-day average liquidity.
 *
 * Pure functions — no I/O. Metrics missing → neutral/penalty, not invent data.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import {
  clamp,
  metricNum,
  resolvePrice,
} from "@/lib/recommendations/horizons/metrics";
import type { HorizonUniverseMember } from "@/lib/recommendations/horizons/types";

/** Liquidity grades — D/F are not publishable by default. */
export type LiquidityGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface TradabilityThresholds {
  /** Minimum Tradability Score to publish (default C floor). */
  minScore: number;
  /** Worst publishable grade (inclusive). */
  minGrade: LiquidityGrade;
  /** Hard-reject below this 20d average volume (shares). */
  minAvgVolume20dReject: number;
  /** Soft floor for "liquid enough" ADV. */
  minAvgVolume20dLiquid: number;
  /** Hard-reject ADTV (₹) — Average Daily Traded Value. */
  minAdtvRejectInr: number;
  /** Soft floor ADTV for tradable names. */
  minAdtvTradableInr: number;
  /** ADTV for highly liquid. */
  minAdtvHighInr: number;
  /** ADTV for institutional A+. */
  minAdtvInstitutionalInr: number;
  /** Relative volume above this with weak ADV = spike trap. */
  spikeRelativeVolume: number;
  /** Bid-ask spread % above this → reject (when available). */
  maxBidAskSpreadPct: number;
  /** Free float % below this → reject (when available). */
  minFreeFloatPct: number;
  /** Impact cost % above this → heavy penalty / reject. */
  maxImpactCostPct: number;
  /** Delivery % below this with high RVOL → trap signal. */
  minDeliveryPctForSpike: number;
}

/** NSE cash-market institutional defaults (configurable). */
export const DEFAULT_TRADABILITY_THRESHOLDS: TradabilityThresholds = {
  minScore: 55,
  minGrade: "C",
  minAvgVolume20dReject: 25_000,
  minAvgVolume20dLiquid: 100_000,
  minAdtvRejectInr: 5_000_000, // ₹50 L
  minAdtvTradableInr: 20_000_000, // ₹2 Cr
  minAdtvHighInr: 50_000_000, // ₹5 Cr
  minAdtvInstitutionalInr: 500_000_000, // ₹50 Cr
  spikeRelativeVolume: 2.5,
  maxBidAskSpreadPct: 1.25,
  minFreeFloatPct: 10,
  maxImpactCostPct: 2.5,
  minDeliveryPctForSpike: 15,
};

const GRADE_RANK: Record<LiquidityGrade, number> = {
  "A+": 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

export interface TradabilityFactorScore {
  id: string;
  label: string;
  score: number | null;
  weight: number;
  detail: string;
  available: boolean;
}

export interface TradabilityAssessment {
  symbol: string;
  tradable: boolean;
  score: number;
  grade: LiquidityGrade;
  reasons: string[];
  factors: TradabilityFactorScore[];
  metrics: {
    avgVolume20d: number | null;
    adtv20d: number | null;
    avgTurnover20d: number | null;
    relativeVolume: number | null;
    deliveryPercent: number | null;
    bidAskSpreadPct: number | null;
    freeFloatPct: number | null;
    impactCostPct: number | null;
    price: number | null;
  };
}

export interface TradabilityRejection {
  symbol: string;
  company: string;
  grade: LiquidityGrade;
  score: number;
  reasons: string[];
}

export interface TradabilityAuditReport {
  evaluated: number;
  passed: number;
  removed: number;
  rejections: TradabilityRejection[];
  reasonCounts: Record<string, number>;
  thresholds: TradabilityThresholds;
  methodology: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function logScaleScore(
  value: number,
  rejectFloor: number,
  goodFloor: number,
  excellentFloor: number
): number {
  if (!(value > 0)) return 0;
  if (value < rejectFloor) return clamp((value / rejectFloor) * 25, 0, 24);
  if (value < goodFloor) {
    return clamp(
      25 + ((value - rejectFloor) / (goodFloor - rejectFloor)) * 35,
      25,
      60
    );
  }
  if (value < excellentFloor) {
    return clamp(
      60 + ((value - goodFloor) / (excellentFloor - goodFloor)) * 25,
      60,
      85
    );
  }
  return clamp(85 + Math.min(15, Math.log10(value / excellentFloor) * 10), 85, 100);
}

/**
 * Resolve 20d ADV — prefer avg_volume_20d; infer from volume / RVOL when needed.
 */
export function resolveAvgVolume20d(
  candidate: OpportunityCandidate
): number | null {
  const avg = metricNum(candidate, "avg_volume_20d") ?? metricNum(candidate, "avg_volume");
  if (avg != null && avg > 0) return avg;
  const volume =
    metricNum(candidate, "volume") ??
    (typeof candidate.quote?.volume === "number" ? candidate.quote.volume : null);
  const rvol = metricNum(candidate, "volume_ratio");
  if (volume != null && volume > 0 && rvol != null && rvol > 0) {
    return volume / rvol;
  }
  return null;
}

export function resolveAdtv20d(
  candidate: OpportunityCandidate,
  avgVolume20d: number | null,
  price: number | null
): number | null {
  const direct = metricNum(candidate, "adtv_20d");
  if (direct != null && direct > 0) return direct;
  if (avgVolume20d != null && price != null && price > 0) {
    return avgVolume20d * price;
  }
  return null;
}

function resolveAvgTurnover20d(
  candidate: OpportunityCandidate,
  adtv: number | null
): number | null {
  const direct = metricNum(candidate, "avg_turnover_20d");
  if (direct != null && direct > 0) return direct;
  return adtv;
}

function scoreToGrade(
  score: number,
  adtv: number | null,
  thresholds: TradabilityThresholds
): LiquidityGrade {
  if (score < 35) return "F";
  if (score < thresholds.minScore) return "D";
  if (
    score >= 85 &&
    adtv != null &&
    adtv >= thresholds.minAdtvInstitutionalInr
  ) {
    return "A+";
  }
  if (score >= 75 && adtv != null && adtv >= thresholds.minAdtvHighInr) {
    return "A";
  }
  if (score >= 65) return "B";
  return "C";
}

function gradeAtLeast(grade: LiquidityGrade, min: LiquidityGrade): boolean {
  return GRADE_RANK[grade] >= GRADE_RANK[min];
}

/**
 * Evaluate institutional tradability for one candidate.
 */
export function evaluateTradability(
  candidate: OpportunityCandidate,
  thresholds: TradabilityThresholds = DEFAULT_TRADABILITY_THRESHOLDS
): TradabilityAssessment {
  const symbol = candidate.symbol.toUpperCase();
  const price = resolvePrice(candidate);
  const avgVolume20d = resolveAvgVolume20d(candidate);
  const relativeVolume = metricNum(candidate, "volume_ratio");
  const deliveryPercent = metricNum(candidate, "delivery_percent");
  const adtv20d = resolveAdtv20d(candidate, avgVolume20d, price);
  const avgTurnover20d = resolveAvgTurnover20d(candidate, adtv20d);
  const bidAskSpreadPct =
    metricNum(candidate, "bid_ask_spread_pct") ??
    metricNum(candidate, "spread_pct");
  const freeFloatPct =
    metricNum(candidate, "free_float_percent") ??
    metricNum(candidate, "free_float_pct") ??
    metricNum(candidate, "float_percent");
  const impactCostPct =
    metricNum(candidate, "impact_cost_pct") ??
    metricNum(candidate, "impact_cost");

  const reasons: string[] = [];
  const factors: TradabilityFactorScore[] = [];

  // --- Hard rejection rules (liquidity traps) ---
  if (avgVolume20d != null && avgVolume20d < thresholds.minAvgVolume20dReject) {
    reasons.push(
      `20d ADV ${Math.round(avgVolume20d).toLocaleString("en-IN")} below reject floor ${thresholds.minAvgVolume20dReject.toLocaleString("en-IN")}.`
    );
  }
  if (adtv20d != null && adtv20d < thresholds.minAdtvRejectInr) {
    reasons.push(
      `20d ADTV ₹${Math.round(adtv20d).toLocaleString("en-IN")} below reject floor ₹${thresholds.minAdtvRejectInr.toLocaleString("en-IN")}.`
    );
  }
  if (
    relativeVolume != null &&
    relativeVolume >= thresholds.spikeRelativeVolume &&
    avgVolume20d != null &&
    avgVolume20d < thresholds.minAvgVolume20dLiquid
  ) {
    reasons.push(
      `Liquidity trap: RVOL ${relativeVolume.toFixed(2)}× on weak 20d ADV ${Math.round(avgVolume20d).toLocaleString("en-IN")} — one-day spike cannot override thin history.`
    );
  }
  if (
    relativeVolume != null &&
    relativeVolume >= thresholds.spikeRelativeVolume &&
    deliveryPercent != null &&
    deliveryPercent < thresholds.minDeliveryPctForSpike &&
    (adtv20d == null || adtv20d < thresholds.minAdtvTradableInr)
  ) {
    reasons.push(
      `Speculative spike: RVOL ${relativeVolume.toFixed(2)}× with delivery ${deliveryPercent.toFixed(0)}% and weak ADTV.`
    );
  }
  if (
    bidAskSpreadPct != null &&
    bidAskSpreadPct > thresholds.maxBidAskSpreadPct
  ) {
    reasons.push(
      `Bid-ask spread ${bidAskSpreadPct.toFixed(2)}% exceeds ${thresholds.maxBidAskSpreadPct}%.`
    );
  }
  if (freeFloatPct != null && freeFloatPct < thresholds.minFreeFloatPct) {
    reasons.push(
      `Free float ${freeFloatPct.toFixed(1)}% below ${thresholds.minFreeFloatPct}%.`
    );
  }
  if (impactCostPct != null && impactCostPct > thresholds.maxImpactCostPct) {
    reasons.push(
      `Impact cost ${impactCostPct.toFixed(2)}% exceeds ${thresholds.maxImpactCostPct}%.`
    );
  }
  if (avgVolume20d == null && adtv20d == null) {
    reasons.push(
      "Insufficient historical liquidity data (no 20d ADV / ADTV) — cannot certify tradability."
    );
  }

  // --- Factor scores (RVOL is a minority weight) ---
  const advScore =
    avgVolume20d != null
      ? logScaleScore(
          avgVolume20d,
          thresholds.minAvgVolume20dReject,
          thresholds.minAvgVolume20dLiquid,
          thresholds.minAvgVolume20dLiquid * 10
        )
      : null;
  factors.push({
    id: "avg_volume_20d",
    label: "20d Average Daily Volume",
    score: advScore,
    weight: 0.22,
    detail:
      avgVolume20d != null
        ? `${Math.round(avgVolume20d).toLocaleString("en-IN")} shares`
        : "unavailable",
    available: avgVolume20d != null,
  });

  const adtvScore =
    adtv20d != null
      ? logScaleScore(
          adtv20d,
          thresholds.minAdtvRejectInr,
          thresholds.minAdtvTradableInr,
          thresholds.minAdtvInstitutionalInr
        )
      : null;
  factors.push({
    id: "adtv_20d",
    label: "20d Average Daily Traded Value",
    score: adtvScore,
    weight: 0.24,
    detail:
      adtv20d != null
        ? `₹${Math.round(adtv20d).toLocaleString("en-IN")}`
        : "unavailable",
    available: adtv20d != null,
  });

  const turnoverScore =
    avgTurnover20d != null
      ? logScaleScore(
          avgTurnover20d,
          thresholds.minAdtvRejectInr,
          thresholds.minAdtvTradableInr,
          thresholds.minAdtvHighInr
        )
      : null;
  factors.push({
    id: "avg_turnover_20d",
    label: "20d Average Turnover",
    score: turnoverScore,
    weight: 0.12,
    detail:
      avgTurnover20d != null
        ? `₹${Math.round(avgTurnover20d).toLocaleString("en-IN")}`
        : "unavailable",
    available: avgTurnover20d != null,
  });

  // Relative volume: helpful confirmation, never dominant; spike on thin ADV hurts.
  let rvolScore: number | null = null;
  if (relativeVolume != null) {
    if (
      avgVolume20d != null &&
      avgVolume20d < thresholds.minAvgVolume20dLiquid &&
      relativeVolume >= thresholds.spikeRelativeVolume
    ) {
      rvolScore = 15; // trap penalty
    } else if (relativeVolume >= 0.8 && relativeVolume <= 2.2) {
      rvolScore = 70 + Math.min(20, (relativeVolume - 0.8) * 15);
    } else if (relativeVolume > 2.2 && relativeVolume <= 4) {
      rvolScore = 75;
    } else if (relativeVolume > 4) {
      rvolScore = 55; // extreme spike without depth is suspicious
    } else {
      rvolScore = clamp(relativeVolume * 50, 10, 45);
    }
  }
  factors.push({
    id: "volume_ratio",
    label: "Today Relative Volume",
    score: rvolScore,
    weight: 0.1, // intentionally low — not the gate
    detail:
      relativeVolume != null ? `${relativeVolume.toFixed(2)}×` : "unavailable",
    available: relativeVolume != null,
  });

  let deliveryScore: number | null = null;
  if (deliveryPercent != null) {
    deliveryScore = clamp(deliveryPercent * 1.4, 10, 95);
  }
  factors.push({
    id: "delivery_percent",
    label: "Delivery Percentage",
    score: deliveryScore,
    weight: 0.1,
    detail:
      deliveryPercent != null
        ? `${deliveryPercent.toFixed(0)}%`
        : "unavailable",
    available: deliveryPercent != null,
  });

  let spreadScore: number | null = null;
  if (bidAskSpreadPct != null) {
    spreadScore = clamp(100 - bidAskSpreadPct * 40, 0, 100);
  } else {
    spreadScore = 58; // unknown — mild neutral, not a free A
  }
  factors.push({
    id: "bid_ask_spread",
    label: "Bid-Ask Spread",
    score: spreadScore,
    weight: 0.08,
    detail:
      bidAskSpreadPct != null
        ? `${bidAskSpreadPct.toFixed(2)}%`
        : "unavailable (neutral)",
    available: bidAskSpreadPct != null,
  });

  let floatScore: number | null = null;
  if (freeFloatPct != null) {
    floatScore = clamp(freeFloatPct * 1.5, 5, 95);
  } else {
    floatScore = 55;
  }
  factors.push({
    id: "free_float",
    label: "Free Float / Market Float",
    score: floatScore,
    weight: 0.06,
    detail:
      freeFloatPct != null
        ? `${freeFloatPct.toFixed(1)}%`
        : "unavailable (neutral)",
    available: freeFloatPct != null,
  });

  let impactScore: number | null = null;
  if (impactCostPct != null) {
    impactScore = clamp(100 - impactCostPct * 30, 0, 100);
  } else {
    impactScore = 55;
  }
  factors.push({
    id: "impact_cost",
    label: "Impact Cost (or ATR proxy)",
    score: impactScore,
    weight: 0.08,
    detail:
      impactCostPct != null
        ? `${impactCostPct.toFixed(2)}%`
        : "unavailable (neutral)",
    available: impactCostPct != null,
  });

  const available = factors.filter((f) => f.score != null);
  const weightSum = available.reduce((sum, f) => sum + f.weight, 0) || 1;
  let score = round2(
    available.reduce(
      (sum, f) => sum + (f.score ?? 0) * (f.weight / weightSum),
      0
    )
  );

  // Hard-rule failures cap score into F territory.
  if (reasons.length > 0) {
    score = Math.min(score, 32);
  }

  const grade = scoreToGrade(score, adtv20d, thresholds);
  const tradable =
    reasons.length === 0 &&
    score >= thresholds.minScore &&
    gradeAtLeast(grade, thresholds.minGrade);

  if (!tradable && reasons.length === 0) {
    reasons.push(
      `Tradability score ${score} / grade ${grade} below publish floor (score ≥ ${thresholds.minScore}, grade ≥ ${thresholds.minGrade}).`
    );
  }

  return {
    symbol,
    tradable,
    score,
    grade,
    reasons,
    factors,
    metrics: {
      avgVolume20d,
      adtv20d,
      avgTurnover20d,
      relativeVolume,
      deliveryPercent,
      bidAskSpreadPct,
      freeFloatPct,
      impactCostPct,
      price,
    },
  };
}

export const TRADABILITY_METHODOLOGY =
  "Weighted Tradability Score from 20d ADV (22%), 20d ADTV (24%), 20d turnover (12%), delivery (10%), RVOL (10% — confirmatory only), bid-ask (8%), impact cost (8%), free float (6%). Hard rejects: thin ADV/ADTV floors, RVOL spike on weak 20d ADV, wide spread, low float, high impact cost. Grades D/F never publish.";

/**
 * Filter horizon universe — Liquidity → Tradability before strategy ranking.
 */
export function filterUniverseByTradability(
  universe: readonly HorizonUniverseMember[],
  thresholds: TradabilityThresholds = DEFAULT_TRADABILITY_THRESHOLDS
): {
  eligible: HorizonUniverseMember[];
  audit: TradabilityAuditReport;
} {
  const rejections: TradabilityRejection[] = [];
  const reasonCounts: Record<string, number> = {};
  const eligible: HorizonUniverseMember[] = [];

  for (const member of universe) {
    const assessment = evaluateTradability(member.candidate, thresholds);
    if (assessment.tradable) {
      eligible.push(member);
      continue;
    }
    for (const reason of assessment.reasons) {
      const key = reason.split(":")[0].slice(0, 80);
      reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
    }
    rejections.push({
      symbol: member.symbol,
      company: member.company,
      grade: assessment.grade,
      score: assessment.score,
      reasons: assessment.reasons,
    });
  }

  return {
    eligible,
    audit: {
      evaluated: universe.length,
      passed: eligible.length,
      removed: rejections.length,
      rejections,
      reasonCounts,
      thresholds: { ...thresholds },
      methodology: TRADABILITY_METHODOLOGY,
    },
  };
}
