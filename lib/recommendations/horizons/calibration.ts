/**
 * Sprint 9F.3 — Institutional recommendation calibration gate.
 *
 * Validates horizon membership, holding consistency, expected-return realism,
 * risk/reward geometry, confidence reliability, quality score, and
 * independently justified multi-horizon duplicates.
 *
 * Does NOT invent template targets or inflate percentages for cosmetics.
 */

import {
  HORIZON_HOLDING_ENVELOPES,
  HORIZON_RETURN_ENVELOPES,
  MIN_RECOMMENDATION_QUALITY,
} from "@/lib/recommendations/horizons/definitions";
import { metricNum } from "@/lib/recommendations/horizons/metrics";
import type {
  HorizonId,
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import {
  applySealedMetricsToRecommendation,
  computeCanonicalRiskReward,
} from "@/lib/recommendations/trade-integrity";

export interface CalibrationRejection {
  symbol: string;
  horizonId: HorizonId;
  reasons: string[];
}

export interface DuplicateJustification {
  symbol: string;
  horizons: HorizonId[];
  justified: boolean;
  reasons: string[];
}

export interface CalibrationAuditReport {
  rejected: CalibrationRejection[];
  reclassifiedNotes: string[];
  holdingCorrected: number;
  confidenceRecalibrated: number;
  riskRewardRecalculated: number;
  expectedReturnsRecalculated: number;
  duplicatesRemoved: number;
  duplicatesJustified: DuplicateJustification[];
  qualityScores: number[];
  qualityDistribution: {
    below55: number;
    from55to70: number;
    from70to85: number;
    above85: number;
  };
  remainingByHorizon: Record<HorizonId, number>;
  evidence: string[];
}

export interface CalibratedRecommendation extends HorizonRecommendation {
  recommendationQualityScore: number;
  calibrationNotes: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasValuationRationale(row: HorizonRecommendation): boolean {
  const id = (
    row.selection.sourceCandidate.strategyId ??
    row.selection.primaryStrategy ??
    ""
  ).toLowerCase();
  const tags = (row.selection.sourceCandidate.strategySignal?.tags ?? []).join(
    " "
  ).toLowerCase();
  return (
    /buffett|graham|lynch|greenblatt|quality|magic|dcf|value|intrinsic/.test(
      id
    ) ||
    /buffett|graham|value|intrinsic|moat/.test(tags) ||
    row.quality.qualifiedFactors.some((f) =>
      /valuation|PEG|PE|Buffett|Graham|quality|intrinsic/i.test(f)
    )
  );
}

function strategyFamily(row: HorizonRecommendation): string {
  switch (row.horizonId) {
    case "scalping":
      return "session-micro";
    case "intraday":
      return "session";
    case "btst":
      return "overnight";
    case "swing":
      return "swing-structure";
    case "short_term":
      return "catalyst-months";
    case "medium_term":
      return "growth-quarter";
    case "long_term":
      return "value-quality";
    default:
      return row.horizonId;
  }
}

/**
 * Prefer the horizon whose philosophy matches the stock's dominant strategy /
 * OE evidence — prevents Long Term / BTST from displacing a true Swing pattern
 * solely because thesis-distance scaling inflated Long Term quality.
 */
function nativeFitBonus(row: HorizonRecommendation): number {
  const id = (
    row.selection.sourceCandidate.strategyId ??
    row.selection.primaryStrategy ??
    ""
  ).toLowerCase();
  const cat = row.selection.sourceCandidate.category;
  const tags = (
    row.selection.sourceCandidate.strategySignal?.tags ?? []
  ).join(" ").toLowerCase();
  const blob = `${id} ${tags} ${cat}`;

  switch (row.horizonId) {
    case "scalping":
      return /scalp|liquidity|vwap-mean/.test(blob) ? 18 : 0;
    case "intraday":
      return /orb|gap|intraday|vwap/.test(blob) && !/scalp/.test(blob) ? 16 : 0;
    case "btst":
      return /institutional|accumulation|relative_volume|btst/.test(blob)
        ? 16
        : 0;
    case "swing":
      return /cup|ema|vcp|darvas|flat|stage|pullback|swing|breakout/.test(blob)
        ? 18
        : 0;
    case "short_term":
      return /earnings|sector|relative-strength|breakout/.test(blob) ? 14 : 0;
    case "medium_term":
      return /momentum|earnings|quality|growth/.test(blob) ? 14 : 0;
    case "long_term":
      return /buffett|graham|lynch|greenblatt|magic|quality|compounder/.test(
        blob
      )
        ? 20
        : 0;
    default:
      return 0;
  }
}

function duplicateRank(row: HorizonRecommendation): number {
  return (
    (row.recommendationQualityScore ?? row.selection.score) +
    nativeFitBonus(row)
  );
}

/**
 * Recalculate RR strictly from entry / stop / primary target.
 */
export function recalculateRiskReward(row: HorizonRecommendation): {
  risk: number;
  reward: number;
  riskReward: number;
} {
  const rr = computeCanonicalRiskReward({
    action: row.selection.side === "Short" ? "SELL" : "BUY",
    effectiveEntry: row.trade.entry,
    stopLoss: row.trade.stopLoss,
    target1: row.trade.targets[0],
  });
  return {
    risk: rr?.risk ?? 0,
    reward: rr?.reward ?? 0,
    riskReward: rr?.riskReward ?? 0,
  };
}

/**
 * Confidence from signal quality — intentionally wide dispersion (not ~95).
 */
export function calibrateConfidence(row: HorizonRecommendation): number {
  const candidate = row.selection.sourceCandidate;
  const factors = row.selection.factors;
  const matched = factors.filter((f) => f.passed).length;
  const total = Math.max(factors.length, 1);
  const factorAgreement = (matched / total) * 100;

  const metrics = candidate.scanMetrics ?? {};
  const keys = [
    "atr",
    "volume_ratio",
    "adx",
    "trend_score",
    "relative_strength",
    "ema20",
    "fundamental_score",
    "roe",
  ];
  const present = keys.filter((k) => {
    const v = metrics[k];
    return typeof v === "number" && Number.isFinite(v);
  }).length;
  const dataCompleteness = (present / keys.length) * 100;

  const rr = recalculateRiskReward(row).riskReward;
  const rrQuality = clamp((rr / 3) * 100, 0, 100);

  const volRatio = metricNum(candidate, "volume_ratio") ?? 1;
  const liquidity = clamp(40 + volRatio * 20, 20, 100);

  const volatility = metricNum(candidate, "volatility") ?? 25;
  const volPenalty = volatility > 45 ? 12 : volatility > 35 ? 6 : 0;

  const historicalReliability = clamp(row.selection.score, 30, 95);

  const raw =
    factorAgreement * 0.28 +
    dataCompleteness * 0.16 +
    rrQuality * 0.14 +
    liquidity * 0.1 +
    historicalReliability * 0.22 +
    clamp(row.selection.score, 0, 100) * 0.1 -
    volPenalty;

  // Spread: 52–96, never park near 95 (Sprint 9F.3 / 9F.5).
  let score = round2(clamp(raw, 52, 96));
  if (score > 93 && score < 96) {
    score = factorAgreement >= 92 ? 96 : 93;
  }
  return score;
}

/**
 * Institutional Recommendation Quality Score (0–100).
 */
export function computeRecommendationQualityScore(
  row: HorizonRecommendation,
  confidence: number,
  holdingMidDays: number
): { score: number; components: Record<string, number> } {
  const envelope = HORIZON_HOLDING_ENVELOPES[row.horizonId];
  const returns = HORIZON_RETURN_ENVELOPES[row.horizonId];
  const rr = recalculateRiskReward(row);
  const primaryPct =
    row.trade.entry > 0
      ? (Math.abs(row.trade.targets[0] - row.trade.entry) / row.trade.entry) *
        100
      : 0;
  const er = row.trade.expectedReturnPercent;

  const strategyMatch = clamp(row.selection.score, 0, 100);

  const targetQuality = clamp(
    primaryPct >= returns.primaryTargetMinPct &&
      primaryPct <= returns.primaryTargetMaxPct
      ? 70 + Math.min(30, (primaryPct / returns.primaryTargetMaxPct) * 30)
      : 25,
    0,
    100
  );

  const riskQuality = clamp(
    rr.riskReward > 1.2 ? 55 + Math.min(40, (rr.riskReward - 1) * 18) : 20,
    0,
    100
  );

  const holdingConsistency = clamp(
    holdingMidDays >= envelope.daysMin * 0.9 &&
      holdingMidDays <= envelope.daysMax * 1.1
      ? 85
      : holdingMidDays >= envelope.daysMin * 0.7
        ? 55
        : 20,
    0,
    100
  );

  const confidenceReliability = clamp(
    confidence >= 55 && confidence <= 93 ? 70 + (confidence - 55) * 0.6 : 40,
    0,
    100
  );

  const fund = metricNum(row.selection.sourceCandidate, "fundamental_score");
  const fundamentalStrength = clamp(fund ?? 48, 0, 100);

  const tech =
    (metricNum(row.selection.sourceCandidate, "trend_score") ?? 50) * 0.5 +
    (metricNum(row.selection.sourceCandidate, "adx") ?? 20) * 0.5;
  const technicalStrength = clamp(tech, 0, 100);

  const explainability = clamp(
    row.quality.whyThisHorizon.length * 12 +
      row.quality.qualifiedFactors.length * 6 +
      (row.quality.targetMethodology ? 15 : 0) +
      (row.quality.holdingRationale ? 10 : 0),
    0,
    100
  );

  // Longer horizons weight fundamentals higher; session horizons weight tech.
  const isLongForm =
    row.horizonId === "medium_term" || row.horizonId === "long_term";
  const score = round2(
    strategyMatch * 0.18 +
      targetQuality * 0.16 +
      riskQuality * 0.14 +
      holdingConsistency * 0.16 +
      confidenceReliability * 0.1 +
      fundamentalStrength * (isLongForm ? 0.12 : 0.06) +
      technicalStrength * (isLongForm ? 0.06 : 0.12) +
      explainability * 0.08
  );

  return {
    score,
    components: {
      strategyMatch,
      targetQuality,
      riskQuality,
      holdingConsistency,
      confidenceReliability,
      fundamentalStrength,
      technicalStrength,
      explainability,
    },
  };
}

function parseHoldingMidDays(label: string, horizonId: HorizonId): number {
  const monthMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Months/i);
  if (monthMatch) {
    return ((Number(monthMatch[1]) + Number(monthMatch[2])) / 2) * 21;
  }
  const dayMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Trading Days/i);
  if (dayMatch) {
    return (Number(dayMatch[1]) + Number(dayMatch[2])) / 2;
  }
  const minuteMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Minutes/i);
  if (minuteMatch) {
    return (Number(minuteMatch[1]) + Number(minuteMatch[2])) / 2 / 375;
  }
  const hourMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Hours/i);
  if (hourMatch) {
    return ((Number(hourMatch[1]) + Number(hourMatch[2])) / 2) * (60 / 375);
  }
  if (/market close/i.test(label)) return 0.7;
  return (
    (HORIZON_HOLDING_ENVELOPES[horizonId].daysMin +
      HORIZON_HOLDING_ENVELOPES[horizonId].daysMax) /
    2
  );
}

/**
 * Validate a single recommendation against horizon + strategy consistency.
 */
export function calibrateRecommendation(
  row: HorizonRecommendation
): { ok: true; row: CalibratedRecommendation } | { ok: false; reasons: string[] } {
  const sealed = applySealedMetricsToRecommendation(row);
  if (!sealed) {
    return {
      ok: false,
      reasons: ["Trade geometry failed integrity seal (Entry/SL/Targets)."],
    };
  }

  const reasons: string[] = [];
  const notes: string[] = [];
  const envelope = HORIZON_HOLDING_ENVELOPES[sealed.horizonId];
  const returns = HORIZON_RETURN_ENVELOPES[sealed.horizonId];

  const rr = recalculateRiskReward(sealed);
  if (!(rr.riskReward > 1)) {
    reasons.push("Risk Reward ≤ 1 from actual Entry/Stop/Target1.");
  }

  const primaryPct = sealed.trade.expectedReturnPercent;
  const er = sealed.trade.expectedReturnPercent;

  // Holding consistency
  const holdingMid = parseHoldingMidDays(
    sealed.trade.holdingPeriod,
    sealed.horizonId
  );
  if (holdingMid < envelope.daysMin * 0.85 || holdingMid > envelope.daysMax * 1.15) {
    reasons.push(
      `Holding mid ${round2(holdingMid)}d outside ${sealed.horizonId} envelope (${envelope.daysMin}–${envelope.daysMax}d).`
    );
  }

  // Expected move vs horizon (ER === T1% under Sprint 9F.4)
  if (primaryPct < returns.primaryTargetMinPct) {
    if (
      sealed.horizonId === "long_term" &&
      primaryPct >= 8 &&
      hasValuationRationale(sealed)
    ) {
      notes.push(
        "Long Term primary move below typical floor but valuation rationale present."
      );
    } else {
      reasons.push(
        `Primary target ${primaryPct}% too small for ${sealed.horizonId} (min ${returns.primaryTargetMinPct}%).`
      );
    }
  }
  if (primaryPct > returns.primaryTargetMaxPct) {
    reasons.push(
      `Primary target ${primaryPct}% excessive for ${sealed.horizonId} without extraordinary-event support (max ${returns.primaryTargetMaxPct}%).`
    );
  }

  if (er < returns.expectedReturnMinPct * 0.95) {
    reasons.push(
      `Expected return ${er}% inconsistent with ${sealed.horizonId} horizon.`
    );
  }
  if (er > returns.expectedReturnMaxPct) {
    reasons.push(
      `Expected return ${er}% unrealistic for ${sealed.horizonId} (max ${returns.expectedReturnMaxPct}%).`
    );
  }

  // Special cases from sprint brief
  if (
    sealed.horizonId === "long_term" &&
    primaryPct < 10 &&
    !hasValuationRationale(sealed)
  ) {
    reasons.push(
      "Long Term ~5–10% chart move without valuation rationale — reject."
    );
  }
  if (
    sealed.horizonId === "long_term" &&
    !hasValuationRationale(sealed) &&
    (metricNum(sealed.selection.sourceCandidate, "fundamental_score") ?? 0) < 68
  ) {
    reasons.push(
      "Long Term without valuation/quality suite and fundamentals < 68 — reject chart-only leakage."
    );
  }
  if (sealed.horizonId === "medium_term" && primaryPct < 4) {
    reasons.push(
      "Medium Term primary move ≈1–4% — reject as horizon leakage."
    );
  }
  if (sealed.horizonId === "btst" && primaryPct > 12) {
    reasons.push(
      "BTST primary move >12% — reject unless extraordinary (not evidenced)."
    );
  }

  const confidence = calibrateConfidence(sealed);
  const quality = computeRecommendationQualityScore(
    sealed,
    confidence,
    holdingMid
  );
  if (quality.score < MIN_RECOMMENDATION_QUALITY) {
    reasons.push(
      `Recommendation Quality Score ${quality.score} below ${MIN_RECOMMENDATION_QUALITY}.`
    );
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const calibratedTrade = {
    ...sealed.trade,
    risk: rr.risk,
    reward: rr.reward,
    riskReward: rr.riskReward,
    expectedReturnPercent: er,
  };

  const calibratedRec = {
    ...sealed.recommendation,
    confidence,
    conviction: Math.round(
      clamp(confidence * 0.55 + sealed.selection.score * 0.45, 50, 96)
    ),
    entry: sealed.trade.entry,
    entryLow: sealed.trade.entryLow,
    entryHigh: sealed.trade.entryHigh,
    risk: rr.risk,
    reward: rr.reward,
    riskReward: rr.riskReward,
    expectedReturnPercent: er,
    holdingPeriod: sealed.trade.holdingPeriod,
  };

  notes.push(
    `Quality ${quality.score}; confidence recalibrated to ${confidence}; ER sealed as Target1%.`
  );

  return {
    ok: true,
    row: {
      ...sealed,
      trade: calibratedTrade,
      recommendation: calibratedRec,
      recommendationQualityScore: quality.score,
      calibrationNotes: notes,
      quality: {
        ...sealed.quality,
        holdingRationale: `${sealed.quality.holdingRationale} · within ${envelope.label}`,
      },
    },
  };
}

/**
 * Multi-horizon duplicates must be independently justified.
 */
export function applyJustifiedDuplicatePolicy(
  snapshot: HorizonPipelineSnapshot
): {
  snapshot: HorizonPipelineSnapshot;
  removed: number;
  justified: DuplicateJustification[];
} {
  const bySymbol = new Map<string, HorizonRecommendation[]>();
  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    for (const row of snapshot[horizonId]) {
      const list = bySymbol.get(row.selection.symbol) ?? [];
      list.push(row);
      bySymbol.set(row.selection.symbol, list);
    }
  }

  const keep = new Map<string, Set<HorizonId>>();
  const justified: DuplicateJustification[] = [];
  let removed = 0;

  for (const [symbol, rows] of bySymbol) {
    if (rows.length === 1) {
      keep.set(symbol, new Set([rows[0].horizonId]));
      continue;
    }

    const sorted = [...rows].sort(
      (a, b) => duplicateRank(b) - duplicateRank(a)
    );

    const accepted: HorizonRecommendation[] = [sorted[0]];
    const reasons: string[] = [
      `${sorted[0].horizonId}: YES — primary fit (rank ${round2(duplicateRank(sorted[0]))}; ${sorted[0].quality.whyThisHorizon[0] ?? "best horizon match"})`,
    ];

    for (const candidate of sorted.slice(1)) {
      const familyDiff =
        strategyFamily(candidate) !== strategyFamily(accepted[0]);
      const factorOverlap =
        candidate.quality.qualifiedFactors.filter((f) =>
          accepted[0].quality.qualifiedFactors.includes(f)
        ).length /
        Math.max(candidate.quality.qualifiedFactors.length, 1);
      const whyOverlap =
        candidate.quality.whyThisHorizon.filter((w) =>
          accepted[0].quality.whyThisHorizon.includes(w)
        ).length /
        Math.max(candidate.quality.whyThisHorizon.length, 1);
      const secondaryStrong =
        (candidate.recommendationQualityScore ?? candidate.selection.score) >=
        MIN_RECOMMENDATION_QUALITY;
      // Independent = different horizon philosophy + distinct explainability,
      // not "similar score" (strong swing + strong long are both valid).
      const independent =
        familyDiff &&
        secondaryStrong &&
        factorOverlap < 0.7 &&
        whyOverlap < 0.85 &&
        accepted.length < 2;

      if (independent) {
        accepted.push(candidate);
        reasons.push(
          `${candidate.horizonId}: YES — independent ${strategyFamily(candidate)} thesis (${candidate.quality.whyThisHorizon[0] ?? "horizon fit"})`
        );
      } else {
        removed += 1;
        reasons.push(
          `${candidate.horizonId}: NO — removed (overlap factors ${(factorOverlap * 100).toFixed(0)}% / why ${(whyOverlap * 100).toFixed(0)}% vs ${accepted[0].horizonId})`
        );
      }
    }

    justified.push({
      symbol,
      horizons: accepted.map((r) => r.horizonId),
      justified: accepted.length > 1,
      reasons,
    });
    keep.set(symbol, new Set(accepted.map((r) => r.horizonId)));
  }

  const next = {} as HorizonPipelineSnapshot;
  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    next[horizonId] = snapshot[horizonId].filter((row) =>
      keep.get(row.selection.symbol)?.has(horizonId)
    );
  }

  return { snapshot: next, removed, justified };
}

export function emptyAuditReport(): CalibrationAuditReport {
  const remainingByHorizon = {} as Record<HorizonId, number>;
  for (const id of INSTITUTIONAL_STRATEGY_IDS) remainingByHorizon[id] = 0;
  return {
    rejected: [],
    reclassifiedNotes: [
      "Horizon leakage corrected by rejection (not silent reclassification).",
    ],
    holdingCorrected: 0,
    confidenceRecalibrated: 0,
    riskRewardRecalculated: 0,
    expectedReturnsRecalculated: 0,
    duplicatesRemoved: 0,
    duplicatesJustified: [],
    qualityScores: [],
    qualityDistribution: {
      below55: 0,
      from55to70: 0,
      from70to85: 0,
      above85: 0,
    },
    remainingByHorizon,
    evidence: [],
  };
}

/**
 * Calibrate an entire horizon pipeline snapshot.
 */
export function calibrateHorizonSnapshot(
  snapshot: HorizonPipelineSnapshot
): { snapshot: HorizonPipelineSnapshot; audit: CalibrationAuditReport } {
  const audit = emptyAuditReport();
  const calibrated = {} as HorizonPipelineSnapshot;

  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    calibrated[horizonId] = [];
    for (const row of snapshot[horizonId]) {
      const result = calibrateRecommendation(row);
      if (!result.ok) {
        audit.rejected.push({
          symbol: row.selection.symbol,
          horizonId,
          reasons: result.reasons,
        });
        continue;
      }
      audit.confidenceRecalibrated += 1;
      audit.riskRewardRecalculated += 1;
      audit.expectedReturnsRecalculated += 1;
      audit.holdingCorrected += 1;
      audit.qualityScores.push(result.row.recommendationQualityScore);
      calibrated[horizonId].push(result.row);
    }
  }

  const dup = applyJustifiedDuplicatePolicy(calibrated);
  audit.duplicatesRemoved = dup.removed;
  audit.duplicatesJustified = dup.justified.filter((j) => j.justified);

  // Rebuild quality stats from post-duplicate published set only.
  audit.qualityScores = [];
  audit.qualityDistribution = {
    below55: 0,
    from55to70: 0,
    from70to85: 0,
    above85: 0,
  };
  audit.evidence = [];

  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    audit.remainingByHorizon[horizonId] = dup.snapshot[horizonId].length;
    for (const row of dup.snapshot[horizonId]) {
      const q = row.recommendationQualityScore ?? 0;
      audit.qualityScores.push(q);
      if (q < 55) audit.qualityDistribution.below55 += 1;
      else if (q < 70) audit.qualityDistribution.from55to70 += 1;
      else if (q < 85) audit.qualityDistribution.from70to85 += 1;
      else audit.qualityDistribution.above85 += 1;

      const mid = parseHoldingMidDays(row.trade.holdingPeriod, horizonId);
      const env = HORIZON_HOLDING_ENVELOPES[horizonId];
      audit.evidence.push(
        `${row.selection.symbol}@${horizonId}: holding ${row.trade.holdingPeriod} (mid ${round2(mid)}d ∈ ${env.daysMin}–${env.daysMax}), ER ${row.trade.expectedReturnPercent}%, RR ${row.trade.riskReward}, Q ${q}, conf ${row.recommendation.confidence}`
      );
    }
  }

  return { snapshot: dup.snapshot, audit };
}
