/**
 * AI Recommendation Verification Engine v2 — Advisory Verification.
 * BLOCK only on structural/data integrity failures.
 * Regime / trend / breadth / sector / consensus issues → VERIFIED_WITH_WARNING.
 * Does not mutate SSOT / Quality Gate / Consensus Engine.
 */

import "server-only";

import { QUALITY_GATE_THRESHOLDS } from "@/lib/recommendations/quality-gate";
import type { RankingMarketContext } from "@/lib/recommendations/institutional-ranking/types";
import {
  applyConsensusEngine,
  selectConsensusStrategyDashboard,
  type ConsensusRankedRecommendation,
} from "@/lib/recommendations/consensus";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

/** VERIFIED | advisory warning | hard block only. */
export type VerificationStatus =
  | "VERIFIED"
  | "VERIFIED_WITH_WARNING"
  | "BLOCKED";

/** @deprecated Use VERIFIED_WITH_WARNING / BLOCKED */
export type LegacyVerificationStatus = "WARNING" | "REJECTED";

export const VERIFICATION_THRESHOLDS = {
  maxEntryDistancePercent: 5,
  minRiskReward: QUALITY_GATE_THRESHOLDS.minRiskReward,
  /**
   * Soft advisory floor — does NOT block publish.
   * Tuned for ~10–20% VERIFIED_WITH_WARNING on typical books.
   */
  advisoryConsensusScore: 60,
  minBreadthAdvisory: 40,
  minSectorStrengthAdvisory: 45,
} as const;

export interface VerificationCheckResult {
  key: string;
  passed: boolean;
  /** block = hard fail; warning = advisory; info = pass note */
  severity: "block" | "warning" | "info";
  detail: string;
}

export interface VerifiedRecommendation extends ConsensusRankedRecommendation {
  verificationStatus: VerificationStatus;
  verificationScore: number;
  verificationReasons: string[];
  verificationChecks: VerificationCheckResult[];
  publishable: boolean;
}

export interface VerificationMarketContext extends RankingMarketContext {
  regime?: string | null;
  marketTrend?: string | null;
  sectorStrength?: number | null;
  pricesBySymbol?: Record<string, number> | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function isLong(rec: SharedRecommendation): boolean {
  return rec.action !== "SELL";
}

/**
 * Soft advisory classifier — only *strong* regime/trend signals warn.
 * Weak/generic labels stay neutral so advisory mode does not mass-warn
 * every LONG in a mild bear tape (still never blocks).
 */
function classifyStrongRegime(text: string): "bull" | "bear" | "neutral" {
  const lower = text.toLowerCase();
  if (
    /\bstrong\s*bear|deep\s*bear|risk[- ]?off|\bdowntrend\b|severe\s*bear/.test(
      lower
    )
  ) {
    return "bear";
  }
  if (
    /\bstrong\s*bull|deep\s*bull|risk[- ]?on|\buptrend\b|severe\s*bull/.test(
      lower
    )
  ) {
    return "bull";
  }
  // Explicit internal conflict: rec itself tagged bearish while we only
  // use this on recommendation-local text for mismatch checks.
  if (/\bweak\s*bear\b/.test(lower) || /\bweak\s*bull\b/.test(lower)) {
    return "neutral";
  }
  return "neutral";
}

/** Internal consistency: plain bull/bear on the recommendation itself. */
function classifyRecRegime(text: string): "bull" | "bear" | "neutral" {
  const lower = text.toLowerCase();
  if (/\bbear|\bbearish/.test(lower) && !/\bweak\s*bear/.test(lower)) {
    return "bear";
  }
  if (/\bbull|\bbullish/.test(lower) && !/\bweak\s*bull/.test(lower)) {
    return "bull";
  }
  return "neutral";
}

function isCorrupted(rec: SharedRecommendation): string | null {
  if (!rec.id?.trim()) return "Missing recommendation id";
  if (!rec.symbol?.trim()) return "Missing symbol";
  if (!(rec.entry > 0)) return "Corrupted entry";
  if (!(rec.stopLoss > 0)) return "Corrupted stop loss";
  if (!Array.isArray(rec.targets) || rec.targets.length === 0) {
    return "Corrupted targets";
  }
  if (!Number.isFinite(rec.riskReward)) return "Corrupted risk/reward";
  if (!Number.isFinite(rec.conviction)) return "Corrupted conviction";
  return null;
}

function liquidityBelowMinimum(rec: SharedRecommendation): {
  belowMin: boolean;
  detail: string;
} {
  const text = `${(rec.evidence ?? []).join(" ")} ${(rec.reasons ?? []).join(" ")}`.toLowerCase();
  if (/low\s*liquidity|illiquid|thin\s*book|abnormal\s*spread|wide\s*spread/.test(text)) {
    return {
      belowMin: true,
      detail: "Liquidity below minimum / abnormal spread flagged",
    };
  }
  if (/volume\s*surge|high\s*liquidity|rvol|liquid\s*name/.test(text)) {
    return { belowMin: false, detail: "Liquidity evidence supportive" };
  }
  // Unknown liquidity is advisory warning, not a hard block.
  return {
    belowMin: false,
    detail: "Liquidity not explicitly confirmed (advisory)",
  };
}

export function verifyRecommendation(
  rec: ConsensusRankedRecommendation,
  market: VerificationMarketContext = {}
): VerifiedRecommendation {
  const checks: VerificationCheckResult[] = [];
  const long = isLong(rec);
  const entry = rec.entry;
  const stop = rec.stopLoss;
  const target = rec.targets[0] ?? entry;

  // --- BLOCK: corrupted recommendation ---
  const corrupt = isCorrupted(rec);
  checks.push({
    key: "corrupted",
    passed: corrupt == null,
    severity: corrupt ? "block" : "info",
    detail: corrupt ?? "Recommendation structure intact",
  });

  // --- BLOCK: missing market data ---
  const hasMarketData = Boolean(
    (market.regime ?? rec.marketRegime)?.trim() ||
      (market.marketTrend ?? rec.marketContext)?.trim()
  );
  checks.push({
    key: "market_data",
    passed: hasMarketData,
    severity: hasMarketData ? "info" : "block",
    detail: hasMarketData
      ? "Market context/regime present"
      : "Missing market data (regime/context)",
  });

  const livePrice = market.pricesBySymbol?.[rec.symbol.toUpperCase()];
  const referencePrice =
    livePrice ??
    (rec.entryLow != null && rec.entryHigh != null
      ? (rec.entryLow + rec.entryHigh) / 2
      : entry);

  // --- BLOCK: invalid entry ---
  const entryValid = entry > 0 && Number.isFinite(entry);
  const inRange =
    rec.entryLow == null ||
    rec.entryHigh == null ||
    (entry >= Math.min(rec.entryLow, rec.entryHigh) &&
      entry <= Math.max(rec.entryLow, rec.entryHigh));
  const distancePct =
    referencePrice > 0
      ? (Math.abs(entry - referencePrice) / referencePrice) * 100
      : 0;
  const entryNearMarket =
    distancePct <= VERIFICATION_THRESHOLDS.maxEntryDistancePercent;
  const entryOk = entryValid && inRange && entryNearMarket;
  checks.push({
    key: "entry",
    passed: entryOk,
    severity: entryOk ? "info" : "block",
    detail: !entryValid
      ? "Invalid entry"
      : !inRange
        ? `Entry ${entry} outside zone ${rec.entryLow}–${rec.entryHigh}`
        : !entryNearMarket
          ? `Entry ${distancePct.toFixed(2)}% from market (max ${VERIFICATION_THRESHOLDS.maxEntryDistancePercent}%)`
          : `Entry ${entry} valid vs market ${round2(referencePrice)}`,
  });

  // --- BLOCK: invalid SL ---
  const slOk = long ? stop > 0 && stop < entry : stop > 0 && stop > entry;
  checks.push({
    key: "stop_loss",
    passed: slOk,
    severity: slOk ? "info" : "block",
    detail: slOk
      ? `SL ${stop} valid for ${long ? "LONG" : "SHORT"}`
      : `Invalid SL ${stop} for ${long ? "LONG" : "SHORT"} vs entry ${entry}`,
  });

  // --- BLOCK: invalid target ---
  const targetOk = long ? target > entry : target < entry && target > 0;
  const rrOk = rec.riskReward >= VERIFICATION_THRESHOLDS.minRiskReward;
  const targetsOk = targetOk && rrOk;
  checks.push({
    key: "target",
    passed: targetsOk,
    severity: targetsOk ? "info" : "block",
    detail: !targetOk
      ? `Invalid target ${target} vs entry ${entry}`
      : !rrOk
        ? `Invalid R:R ${rec.riskReward} (min ${VERIFICATION_THRESHOLDS.minRiskReward})`
        : `Target ${target} · R:R ${rec.riskReward} valid`,
  });

  // --- BLOCK: liquidity below minimum (explicit flags only) ---
  const liq = liquidityBelowMinimum(rec);
  const liquidityUnknown = /not explicitly confirmed/i.test(liq.detail);
  checks.push({
    key: "liquidity",
    passed: !liq.belowMin,
    severity: liq.belowMin ? "block" : liquidityUnknown ? "warning" : "info",
    detail: liq.detail,
  });

  // --- WARNING only: trend conflict (strong live trend vs direction) ---
  const liveTrend = classifyStrongRegime(market.marketTrend ?? "");
  const trendOk = long ? liveTrend !== "bear" : liveTrend !== "bull";
  checks.push({
    key: "trend",
    passed: trendOk,
    severity: trendOk ? "info" : "warning",
    detail: trendOk
      ? `Trend ${liveTrend || "neutral"} compatible with ${long ? "LONG" : "SHORT"}`
      : `Trend conflict — ${long ? "LONG" : "SHORT"} vs strong ${liveTrend} tape`,
  });

  // --- WARNING only: regime mismatch (strong live regime OR internal conflict) ---
  const liveRegime = classifyStrongRegime(market.regime ?? "");
  const recRegime = classifyRecRegime(
    `${rec.marketRegime} ${rec.marketContext}`
  );
  const liveRegimeOk = long ? liveRegime !== "bear" : liveRegime !== "bull";
  const internalOk = long ? recRegime !== "bear" : recRegime !== "bull";
  const regimeOk = liveRegimeOk && internalOk;
  checks.push({
    key: "regime",
    passed: regimeOk,
    severity: regimeOk ? "info" : "warning",
    detail: regimeOk
      ? `Regime compatible (live=${liveRegime || "neutral"}, rec=${recRegime || "neutral"})`
      : !internalOk
        ? `Regime mismatch — recommendation context ${recRegime} vs ${long ? "LONG" : "SHORT"}`
        : `Regime mismatch — strong live ${liveRegime} vs ${long ? "LONG" : "SHORT"}`,
  });

  // --- WARNING only: low breadth ---
  const breadth = market.breadthScore;
  const breadthOk =
    breadth == null || breadth >= VERIFICATION_THRESHOLDS.minBreadthAdvisory;
  checks.push({
    key: "breadth",
    passed: breadthOk,
    severity: breadthOk ? "info" : "warning",
    detail:
      breadth == null
        ? "Breadth unavailable (no advisory penalty)"
        : breadthOk
          ? `Breadth ${breadth}`
          : `Low breadth ${breadth} (< ${VERIFICATION_THRESHOLDS.minBreadthAdvisory})`,
  });

  // --- WARNING only: sector weakness ---
  const sectorStrength =
    market.sectorStrength ?? rec.longTermRanking?.sectorStrength ?? null;
  const sectorOk =
    sectorStrength == null ||
    sectorStrength >= VERIFICATION_THRESHOLDS.minSectorStrengthAdvisory;
  checks.push({
    key: "sector",
    passed: sectorOk,
    severity: sectorOk ? "info" : "warning",
    detail:
      sectorStrength == null
        ? "Sector strength unavailable (no advisory penalty)"
        : sectorOk
          ? `Sector strength ${sectorStrength}`
          : `Sector weakness ${sectorStrength}`,
  });

  // --- WARNING only: consensus below threshold ---
  const consensusOk =
    rec.consensusScore >= VERIFICATION_THRESHOLDS.advisoryConsensusScore;
  checks.push({
    key: "consensus",
    passed: consensusOk,
    severity: consensusOk ? "info" : "warning",
    detail: consensusOk
      ? `Consensus ${rec.consensusScore} ≥ ${VERIFICATION_THRESHOLDS.advisoryConsensusScore}`
      : `Consensus ${rec.consensusScore} below advisory threshold ${VERIFICATION_THRESHOLDS.advisoryConsensusScore}`,
  });

  const blockFails = checks.filter((c) => !c.passed && c.severity === "block");
  const warningFails = checks.filter(
    (c) => !c.passed && c.severity === "warning"
  );
  const passed = checks.filter((c) => c.passed).length;
  const verificationScore = round2(
    clamp((passed / Math.max(checks.length, 1)) * 100, 0, 100)
  );

  let verificationStatus: VerificationStatus;
  if (blockFails.length > 0) {
    verificationStatus = "BLOCKED";
  } else if (warningFails.length > 0) {
    verificationStatus = "VERIFIED_WITH_WARNING";
  } else {
    verificationStatus = "VERIFIED";
  }

  // Advisory: only BLOCKED is non-publishable.
  const publishable = verificationStatus !== "BLOCKED";

  const verificationReasons = [
    `Status ${verificationStatus} · score ${verificationScore}`,
    ...checks.filter((c) => !c.passed).map((c) => `[${c.severity}] ${c.detail}`),
    publishable
      ? verificationStatus === "VERIFIED_WITH_WARNING"
        ? "Publishable — advisory warnings only"
        : "Publishable — VERIFIED"
      : "Not publishable — BLOCKED (structural/data failure)",
  ];

  return {
    ...rec,
    verificationStatus,
    verificationScore,
    verificationReasons,
    verificationChecks: checks,
    publishable,
  };
}

export function applyVerificationEngine(
  recommendations: readonly SharedRecommendation[],
  market: VerificationMarketContext = {}
): VerifiedRecommendation[] {
  const consensus = applyConsensusEngine(recommendations, { market });
  return consensus
    .map((rec) => verifyRecommendation(rec, market))
    .sort(
      (a, b) =>
        Number(b.publishable) - Number(a.publishable) ||
        b.verificationScore - a.verificationScore ||
        b.consensusScore - a.consensusScore
    );
}

export function filterPublishableRecommendations(
  verified: readonly VerifiedRecommendation[]
): VerifiedRecommendation[] {
  return verified.filter((r) => r.publishable);
}

export function buildVerificationReport(
  recommendations: readonly SharedRecommendation[],
  market: VerificationMarketContext = {}
) {
  const all = applyVerificationEngine(recommendations, market);
  const verified = all.filter((r) => r.verificationStatus === "VERIFIED");
  const warnings = all.filter(
    (r) => r.verificationStatus === "VERIFIED_WITH_WARNING"
  );
  const blocked = all.filter((r) => r.verificationStatus === "BLOCKED");
  const publishable = filterPublishableRecommendations(all);

  const reasonDistribution: Record<string, number> = {};
  for (const rec of all) {
    for (const check of rec.verificationChecks) {
      if (!check.passed) {
        reasonDistribution[check.key] = (reasonDistribution[check.key] ?? 0) + 1;
      }
    }
  }

  const avg =
    all.length === 0
      ? 0
      : round2(
          all.reduce((s, r) => s + r.verificationScore, 0) / all.length
        );

  return {
    generatedAt: new Date().toISOString(),
    mode: "advisory" as const,
    verified: verified.length,
    warning: warnings.length,
    blocked: blocked.length,
    /** Aliases for prior API consumers */
    candidatesVerified: verified.length,
    warnings: warnings.length,
    rejected: blocked.length,
    averageVerificationScore: avg,
    publishableCount: publishable.length,
    reasonDistribution,
    thresholds: VERIFICATION_THRESHOLDS,
    recommendations: all.map((r) => ({
      recommendation: {
        id: r.id,
        symbol: r.symbol,
        company: r.company,
        action: r.action,
        conviction: r.conviction,
        riskReward: r.riskReward,
        consensusScore: r.consensusScore,
        entry: r.entry,
        stopLoss: r.stopLoss,
        targets: r.targets,
      },
      verificationScore: r.verificationScore,
      verificationStatus: r.verificationStatus,
      reasons: r.verificationReasons,
      publishable: r.publishable,
      checks: r.verificationChecks,
    })),
    notes: [
      "Verification Engine v2 is advisory — BLOCK only for invalid entry/SL/target, missing market data, liquidity below minimum, or corruption.",
      "Regime mismatch, sector weakness, low breadth, trend conflict, and low consensus are VERIFIED_WITH_WARNING.",
      "Only BLOCKED recommendations are non-publishable.",
    ],
  };
}

export function selectVerifiedConsensusStrategyDashboard(
  recommendations: readonly SharedRecommendation[],
  lastScanTime: string,
  market?: VerificationMarketContext
): InstitutionalStrategySlot[] {
  const verified = applyVerificationEngine(recommendations, market ?? {});
  const publishable = filterPublishableRecommendations(verified);
  return selectConsensusStrategyDashboard(publishable, lastScanTime, market);
}
