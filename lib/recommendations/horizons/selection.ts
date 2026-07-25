/**
 * Sprint 9F.2 — Seven independent horizon selection pipelines.
 *
 * Each function evaluates the full universe with horizon-specific philosophy.
 * OE category membership is NEVER the inclusion gate.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import {
  clamp,
  metricNum,
  round1,
} from "@/lib/recommendations/horizons/metrics";
import type {
  HorizonFactorResult,
  HorizonId,
  HorizonSelectionResult,
  HorizonUniverseMember,
} from "@/lib/recommendations/horizons/types";

const MIN_SCORE: Record<HorizonId, number> = {
  scalping: 58,
  intraday: 55,
  btst: 56,
  swing: 54,
  short_term: 52,
  medium_term: 50,
  long_term: 48,
};

function hasStrategyTag(candidate: OpportunityCandidate, needle: string): boolean {
  const id = (candidate.strategyId ?? "").toLowerCase();
  const signalId = (candidate.strategySignal?.strategyId ?? "").toLowerCase();
  const executed = (candidate.executedStrategyIds ?? []).map((s) => s.toLowerCase());
  return (
    id.includes(needle) ||
    signalId.includes(needle) ||
    executed.some((s) => s.includes(needle)) ||
    (candidate.strategySignals ?? []).some((s) =>
      s.strategyId.toLowerCase().includes(needle)
    )
  );
}

function scoreFromFactors(factors: HorizonFactorResult[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0) || 1;
  const earned = factors.reduce(
    (sum, f) => sum + (f.passed ? f.weight : 0),
    0
  );
  return round1(clamp((earned / totalWeight) * 100, 0, 100));
}

function supportingFromCandidate(candidate: OpportunityCandidate): string[] {
  const names = new Set<string>();
  for (const signal of candidate.strategySignals ?? []) {
    if (signal.strategy) names.add(signal.strategy);
  }
  for (const name of candidate.strategyConsensus?.supportingStrategies ?? []) {
    names.add(name);
  }
  return [...names].slice(0, 6);
}

function finish(
  horizonId: HorizonId,
  member: HorizonUniverseMember,
  factors: HorizonFactorResult[],
  primaryStrategy: string,
  belongsBecause: string[],
  horizonFitNotes: string[],
  side: "Long" | "Short"
): HorizonSelectionResult | null {
  const score = scoreFromFactors(factors);
  if (score < MIN_SCORE[horizonId]) return null;

  const qualifiedFactors = factors.filter((f) => f.passed).map((f) => f.label);
  const rejectedFactors = factors.filter((f) => !f.passed).map((f) => f.label);
  if (qualifiedFactors.length < 2) return null;

  return {
    horizonId,
    symbol: member.symbol,
    company: member.company,
    side,
    score,
    belongsBecause,
    qualifiedFactors,
    rejectedFactors,
    horizonFitNotes,
    primaryStrategy,
    supportingStrategies: supportingFromCandidate(member.candidate),
    factors,
    sourceCandidate: member.candidate,
  };
}

/** PIPELINE 1 — Scalping */
export function selectScalping(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const vol = metricNum(c, "volume_ratio") ?? 0;
  const atr = metricNum(c, "atr") ?? 0;
  const price = metricNum(c, "cmp") ?? c.quote?.price ?? 0;
  const atrPct = price > 0 && atr > 0 ? (atr / price) * 100 : 0;
  const mom = metricNum(c, "momentum") ?? 0;
  const change = metricNum(c, "change_percent") ?? 0;
  const adx = metricNum(c, "adx") ?? 0;
  const delivery = metricNum(c, "delivery_percent") ?? 0;

  const factors: HorizonFactorResult[] = [
    {
      label: "Relative volume ≥ 1.8×",
      passed: vol >= 1.8,
      weight: 22,
      detail: `${vol.toFixed(2)}×`,
    },
    {
      label: "Tight ATR (≤ 2.2% of price)",
      passed: atrPct > 0 && atrPct <= 2.2,
      weight: 18,
      detail: atrPct ? `${atrPct.toFixed(2)}%` : "n/a",
    },
    {
      label: "Session momentum pulse",
      passed: Math.abs(mom) >= 0.8 || Math.abs(change) >= 0.6,
      weight: 16,
    },
    {
      label: "ADX reactive (≥ 18)",
      passed: adx >= 18,
      weight: 12,
    },
    {
      label: "Scalp / ORB / liquidity strategy tag",
      passed:
        hasStrategyTag(c, "scalp") ||
        hasStrategyTag(c, "orb") ||
        hasStrategyTag(c, "liquidity") ||
        hasStrategyTag(c, "vwap-mean"),
      weight: 14,
    },
    {
      label: "Not a delivery-heavy positional setup",
      passed: delivery < 55,
      weight: 10,
    },
    {
      label: "Liquidity present",
      passed: vol >= 1.2,
      weight: 8,
    },
  ];

  const side: "Long" | "Short" = change >= 0 && mom >= 0 ? "Long" : change < 0 ? "Short" : c.side;

  return finish(
    "scalping",
    member,
    factors,
    c.strategyName?.toLowerCase().includes("scalp")
      ? c.strategyName
      : "VWAP / Liquidity Scalp",
    [
      "High relative volume with tight ATR — suitable for rapid mean-reversion / micro-momentum",
      "Session microstructure (VWAP / liquidity) dominates over multi-day trend",
    ],
    [
      "Rejected as Swing/Long: holding thesis is minutes, not days or business cycles",
      "Rejected as Medium/Long Term: no fundamental durability requirement for scalp",
    ],
    side
  );
}

/** PIPELINE 2 — Intraday */
export function selectIntraday(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const vol = metricNum(c, "volume_ratio") ?? 0;
  const change = metricNum(c, "change_percent") ?? 0;
  const adx = metricNum(c, "adx") ?? 0;
  const trend = metricNum(c, "trend_score") ?? 50;
  const mom = metricNum(c, "momentum") ?? 0;
  const atr = metricNum(c, "atr") ?? 0;
  const price = metricNum(c, "cmp") ?? c.quote?.price ?? 0;
  const atrPct = price > 0 && atr > 0 ? (atr / price) * 100 : 0;
  const vwap = metricNum(c, "vwap");
  const isScalpTagged =
    hasStrategyTag(c, "scalp") && !hasStrategyTag(c, "orb");

  // Scalping-only tags should not fill Intraday unless broader session setup.
  if (isScalpTagged && vol < 2.2 && atrPct < 1.2) return null;

  const factors: HorizonFactorResult[] = [
    {
      label: "Session move ≥ 0.5% or volume ≥ 1.2×",
      passed: Math.abs(change) >= 0.5 || vol >= 1.2,
      weight: 20,
    },
    {
      label: "ADX / trend strength for session",
      passed: adx >= 18 || trend >= 52,
      weight: 16,
    },
    {
      label: "VWAP / opening-range structure",
      passed:
        vwap != null ||
        hasStrategyTag(c, "orb") ||
        hasStrategyTag(c, "vwap") ||
        hasStrategyTag(c, "gap"),
      weight: 16,
    },
    {
      label: "Intraday ATR room (0.6–3.5%)",
      passed: atrPct >= 0.6 && atrPct <= 3.5,
      weight: 14,
    },
    {
      label: "Momentum aligned with session",
      passed: Math.abs(mom) >= 0.5 || Math.abs(change) >= 0.8,
      weight: 14,
    },
    {
      label: "Not pure multi-day swing structure",
      passed: !(trend >= 70 && vol < 1.1 && Math.abs(change) < 0.4),
      weight: 10,
    },
    {
      label: "Relative volume confirms participation",
      passed: vol >= 1.05,
      weight: 10,
    },
  ];

  const side: "Long" | "Short" = change >= 0 ? "Long" : "Short";

  return finish(
    "intraday",
    member,
    factors,
    c.strategyName && !c.strategyName.toLowerCase().includes("scalp")
      ? c.strategyName
      : "Intraday VWAP / Opening Range",
    [
      "Session VWAP / ORB / EMA structure with confirmed volume",
      "Thesis resolves by market close — not overnight or multi-week",
    ],
    [
      "Weaker as Scalping: ATR/range too wide or not liquidity-microstructure driven",
      "Weaker as Swing: lacks multi-day EMA pullback / pattern persistence",
      "Weaker as Long Term: no valuation or quality thesis required",
    ],
    side
  );
}

/** PIPELINE 3 — BTST */
export function selectBtst(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const vol = metricNum(c, "volume_ratio") ?? 0;
  const delivery = metricNum(c, "delivery_percent") ?? 0;
  const closeStr = metricNum(c, "closing_strength") ?? 50;
  const change = metricNum(c, "change_percent") ?? 0;
  const mom = metricNum(c, "momentum") ?? 0;

  const factors: HorizonFactorResult[] = [
    {
      label: "Relative volume ≥ 1.5×",
      passed: vol >= 1.5,
      weight: 22,
      detail: `${vol.toFixed(2)}×`,
    },
    {
      label: "Closing strength ≥ 55",
      passed: closeStr >= 55,
      weight: 18,
      detail: `${closeStr.toFixed(0)}`,
    },
    {
      label: "Delivery participation ≥ 35%",
      passed: delivery >= 35,
      weight: 16,
      detail: delivery ? `${delivery.toFixed(0)}%` : "n/a",
    },
    {
      label: "End-of-day momentum positive",
      passed: change > 0.3 && mom >= 0,
      weight: 16,
    },
    {
      label: "Gap-continuation / accumulation tag",
      passed:
        hasStrategyTag(c, "institutional") ||
        hasStrategyTag(c, "vwap-continuation") ||
        hasStrategyTag(c, "accumulation") ||
        vol >= 2,
      weight: 14,
    },
    {
      label: "Not exhausted close (strength < 95)",
      passed: closeStr < 95,
      weight: 8,
    },
    {
      label: "Overnight hold suitable (not scalp ATR)",
      passed: true,
      weight: 6,
    },
  ];

  return finish(
    "btst",
    member,
    factors,
    c.strategyName ?? "BTST Closing Strength / Delivery",
    [
      "Strong close + elevated relative volume + delivery — overnight continuation setup",
      "Horizon is next session open, not multi-week trend",
    ],
    [
      "Weaker as Intraday-only: thesis intentionally spans the close → open gap",
      "Weaker as Swing: does not require EMA stack / pattern measured move",
      "Weaker as Long Term: overnight momentum ≠ business quality",
    ],
    "Long"
  );
}

/** PIPELINE 4 — Swing */
export function selectSwing(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const trend = metricNum(c, "trend_score") ?? 0;
  const adx = metricNum(c, "adx") ?? 0;
  const rs = metricNum(c, "relative_strength") ?? 50;
  const vol = metricNum(c, "volume_ratio") ?? 0;
  const ema20 = metricNum(c, "ema20");
  const ema50 = metricNum(c, "ema50");
  const price = metricNum(c, "cmp") ?? c.quote?.price ?? 0;
  const macdHist = metricNum(c, "macd_histogram");
  const fund = metricNum(c, "fundamental_score");

  const emaAligned =
    ema20 != null &&
    ema50 != null &&
    price > 0 &&
    ((price >= ema20 && ema20 >= ema50) || (price <= ema20 && ema20 <= ema50));

  const patternTag =
    hasStrategyTag(c, "cup") ||
    hasStrategyTag(c, "darvas") ||
    hasStrategyTag(c, "vcp") ||
    hasStrategyTag(c, "flat-base") ||
    hasStrategyTag(c, "breakout") ||
    hasStrategyTag(c, "ema") ||
    hasStrategyTag(c, "stage");

  const factors: HorizonFactorResult[] = [
    {
      label: "Trend score ≥ 52",
      passed: trend >= 52,
      weight: 18,
    },
    {
      label: "ADX ≥ 20 (directional)",
      passed: adx >= 20,
      weight: 14,
    },
    {
      label: "EMA alignment / pullback structure",
      passed: emaAligned || hasStrategyTag(c, "ema") || hasStrategyTag(c, "pullback"),
      weight: 16,
    },
    {
      label: "Relative strength ≥ 52",
      passed: rs >= 52,
      weight: 12,
    },
    {
      label: "MACD / momentum supportive",
      passed: macdHist == null || macdHist >= 0 || Math.abs(macdHist) > 0,
      weight: 10,
    },
    {
      label: "Swing pattern / breakout suite",
      passed: patternTag || vol >= 1.3,
      weight: 16,
    },
    {
      label: "Volume expansion on structure",
      passed: vol >= 1.15 || patternTag,
      weight: 8,
    },
    {
      label: "Not pure valuation compounder",
      passed: !(fund != null && fund >= 75 && trend < 48 && vol < 1.1),
      weight: 6,
    },
  ];

  const side: "Long" | "Short" = trend >= 50 ? "Long" : "Short";

  return finish(
    "swing",
    member,
    factors,
    c.strategyName ?? "Swing EMA / Pattern Continuation",
    [
      "Multi-day trend structure (EMA / ADX / pattern) with volume confirmation",
      "Holding thesis measured in trading days, not minutes or business years",
    ],
    [
      "Weaker as Scalping/Intraday: structure needs days to complete measured move",
      "Weaker as Medium Term: lacks multi-quarter fundamental acceleration requirement",
      "Weaker as Long Term: chart cycle ≠ economic moat / intrinsic value",
    ],
    side
  );
}

/** PIPELINE 5 — Short Term (1–3 months) */
export function selectShortTerm(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const rs = metricNum(c, "relative_strength") ?? 50;
  const mom = metricNum(c, "momentum") ?? 0;
  const week52 = metricNum(c, "week52_momentum") ?? 0;
  const trend = metricNum(c, "trend_score") ?? 50;
  const revGrowth = metricNum(c, "revenue_growth");
  const fund = metricNum(c, "fundamental_score");
  const priceToHigh = metricNum(c, "price_to_52w_high");
  const vol = metricNum(c, "volume_ratio") ?? 0;

  const factors: HorizonFactorResult[] = [
    {
      label: "Relative strength leadership",
      passed: rs >= 55,
      weight: 16,
    },
    {
      label: "Earnings / growth acceleration tag",
      passed:
        hasStrategyTag(c, "earnings") ||
        hasStrategyTag(c, "sector") ||
        (revGrowth != null && revGrowth >= 8),
      weight: 16,
    },
    {
      label: "Institutional / accumulation participation",
      passed:
        hasStrategyTag(c, "institutional") ||
        hasStrategyTag(c, "accumulation") ||
        vol >= 1.4,
      weight: 14,
    },
    {
      label: "Technical trend intact",
      passed: trend >= 50,
      weight: 14,
    },
    {
      label: "Breakout / sector rotation context",
      passed:
        (priceToHigh != null && priceToHigh >= 0.88) ||
        hasStrategyTag(c, "breakout") ||
        hasStrategyTag(c, "rotation") ||
        week52 >= 5,
      weight: 14,
    },
    {
      label: "Momentum or 52W momentum",
      passed: Math.abs(mom) >= 1.5 || week52 >= 4,
      weight: 12,
    },
    {
      label: "Fundamentals not collapsing",
      passed: fund == null || fund >= 40,
      weight: 8,
    },
    {
      label: "Horizon is investment months, not session",
      passed: true,
      weight: 6,
    },
  ];

  return finish(
    "short_term",
    member,
    factors,
    c.strategyName ?? "Short-Term RS / Earnings / Sector",
    [
      "1–3 month idea: RS leadership + earnings/sector/institutional catalysts",
      "Technical trend supports a multi-week to multi-month hold",
    ],
    [
      "Weaker as Intraday/BTST: catalyst horizon exceeds a session",
      "Weaker as Swing-only: requires growth/sector factor beyond chart pattern",
      "Weaker as Long Term: not requiring full moat / DCF margin of safety",
    ],
    mom >= 0 && trend >= 50 ? "Long" : c.side
  );
}

/** PIPELINE 6 — Medium Term (3–12 months) */
export function selectMediumTerm(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const fund = metricNum(c, "fundamental_score") ?? 0;
  const roe = metricNum(c, "roe");
  const revGrowth = metricNum(c, "revenue_growth");
  const pe = metricNum(c, "pe");
  const rs = metricNum(c, "relative_strength") ?? 50;
  const week52 = metricNum(c, "week52_momentum") ?? 0;
  const trend = metricNum(c, "trend_score") ?? 50;
  const mom = metricNum(c, "momentum") ?? 0;

  // PEG proxy: PE / revenue growth when both present
  const peg =
    pe != null && revGrowth != null && revGrowth > 0 ? pe / revGrowth : null;

  const factors: HorizonFactorResult[] = [
    {
      label: "Fundamental score ≥ 52",
      passed: fund >= 52,
      weight: 18,
    },
    {
      label: "ROE quality",
      passed: roe != null && roe >= 12,
      weight: 14,
      detail: roe != null ? `${roe.toFixed(1)}%` : "n/a",
    },
    {
      label: "Revenue / EPS growth acceleration",
      passed: revGrowth != null && revGrowth >= 10,
      weight: 16,
    },
    {
      label: "PEG / valuation trend reasonable",
      passed: peg == null || (peg > 0 && peg <= 2.5),
      weight: 12,
    },
    {
      label: "Sector / RS persistence",
      passed: rs >= 50 || week52 >= 6,
      weight: 12,
    },
    {
      label: "Multi-month trend not broken",
      passed: trend >= 48,
      weight: 12,
    },
    {
      label: "Not a same-day volume spike thesis",
      passed: Math.abs(mom) < 25,
      weight: 8,
    },
    {
      label: "Quality compounder / growth tag",
      passed:
        hasStrategyTag(c, "quality") ||
        hasStrategyTag(c, "earnings") ||
        hasStrategyTag(c, "stage") ||
        fund >= 58,
      weight: 8,
    },
  ];

  return finish(
    "medium_term",
    member,
    factors,
    c.strategyName ?? "Medium-Term Growth / Valuation Trend",
    [
      "3–12 month investment: growth, ROE/ROCE quality, and valuation trend",
      "Horizon is business acceleration over quarters — not chart measured-move days",
    ],
    [
      "Weaker as Swing: fundamental duration exceeds typical swing pattern life",
      "Weaker as Long Term: may lack full moat / FCF durability bar",
      "Weaker as Intraday: session microstructure irrelevant to thesis",
    ],
    "Long"
  );
}

/** PIPELINE 7 — Long Term (business quality + valuation) */
export function selectLongTerm(
  member: HorizonUniverseMember
): HorizonSelectionResult | null {
  const c = member.candidate;
  const fund = metricNum(c, "fundamental_score") ?? 0;
  const roe = metricNum(c, "roe");
  const revGrowth = metricNum(c, "revenue_growth");
  const pe = metricNum(c, "pe");
  const trend = metricNum(c, "trend_score") ?? 50;
  const vol = metricNum(c, "volatility") ?? 30;
  const institutional = c.institutionalScore ?? c.aiConvictionScore ?? 0;

  const valueTag =
    hasStrategyTag(c, "buffett") ||
    hasStrategyTag(c, "graham") ||
    hasStrategyTag(c, "lynch") ||
    hasStrategyTag(c, "greenblatt") ||
    hasStrategyTag(c, "quality") ||
    hasStrategyTag(c, "magic");

  // Soft quality composite standing in for Buffett/Graham/Piotroski when full
  // research packs are not attached to the OE candidate.
  const qualityComposite = clamp(
    fund * 0.45 +
      (roe != null ? clamp(roe, 0, 40) * 1.2 : 20) +
      (revGrowth != null ? clamp(revGrowth, -10, 40) * 0.8 : 15) +
      (pe != null && pe > 0 && pe < 45 ? 12 : 4) +
      (valueTag ? 15 : 0) +
      clamp(institutional, 0, 100) * 0.1,
    0,
    100
  );

  const factors: HorizonFactorResult[] = [
    {
      label: "Business quality composite ≥ 55",
      passed: qualityComposite >= 55,
      weight: 20,
      detail: `${qualityComposite.toFixed(0)}`,
    },
    {
      label: "ROE / capital efficiency",
      passed: roe != null && roe >= 14,
      weight: 14,
    },
    {
      label: "Earnings / revenue durability",
      passed: revGrowth != null && revGrowth >= 6,
      weight: 12,
    },
    {
      label: "Valuation not extreme (PE context)",
      passed: pe == null || (pe > 0 && pe < 55),
      weight: 12,
    },
    {
      label: "Buffett / Graham / Quality / DCF suite",
      passed: valueTag || (fund >= 68 && institutional >= 70),
      weight: 16,
    },
    {
      label: "Debt / volatility tolerable for compounding",
      passed: vol <= 45,
      weight: 8,
    },
    {
      label: "Institutional conviction / ranking",
      passed: institutional >= 50 || c.longTermRanking != null,
      weight: 10,
    },
    {
      label: "Not dependent on intraday microstructure",
      passed: trend >= 40 || fund >= 55,
      weight: 8,
    },
  ];

  return finish(
    "long_term",
    member,
    factors,
    c.strategyName ?? "Long-Term Quality / Intrinsic Value",
    [
      "Business quality + valuation discount / intrinsic value vs price",
      "Holding thesis is business-cycle compounding — not chart-cycle targets",
    ],
    [
      "Weaker as Swing: targets and stops would be pattern-based, not intrinsic value",
      "Weaker as Medium Term: requires deeper moat / capital allocation bar",
      "Weaker as Intraday/BTST: session factors do not define the investment",
    ],
    "Long"
  );
}

export const HORIZON_SELECTORS: Record<
  HorizonId,
  (member: HorizonUniverseMember) => HorizonSelectionResult | null
> = {
  scalping: selectScalping,
  intraday: selectIntraday,
  btst: selectBtst,
  swing: selectSwing,
  short_term: selectShortTerm,
  medium_term: selectMediumTerm,
  long_term: selectLongTerm,
};

export function selectForHorizon(
  horizonId: HorizonId,
  universe: readonly HorizonUniverseMember[]
): HorizonSelectionResult[] {
  const selector = HORIZON_SELECTORS[horizonId];
  const results: HorizonSelectionResult[] = [];
  for (const member of universe) {
    const selected = selector(member);
    if (selected) results.push(selected);
  }
  return results.sort((a, b) => b.score - a.score);
}
