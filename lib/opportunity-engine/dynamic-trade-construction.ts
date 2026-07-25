/**
 * Sprint 9F.1 — Dynamic Trade Construction Engine.
 *
 * Replaces category fixed-% templates (Swing +5%, Long +8%, BTST +2.5%, …).
 * Every trade is built from stock-specific ATR, structure anchors, and
 * (when available) Strategy Engine levels.
 *
 * Opportunity detection / ranking / scanners are untouched — this module
 * only constructs Entry → SL → T1/T2/T3 → Holding → Expected Return → RR.
 */

import type { OpportunityCategory } from "@/lib/opportunity-engine/types";
import type { TradeLevels } from "@/lib/opportunity-engine/levels";
import { computeProbabilityWeightedExpectedReturn } from "@/lib/opportunity-engine/expected-return";
import { estimateHoldingPeriod } from "@/lib/opportunity-engine/holding-period-estimator";
import { ensureThreeTargets } from "@/lib/recommendations/institutional-horizons";

export type TradeMethodology =
  | "strategy_signal"
  | "vwap_mean_reversion"
  | "vwap_continuation"
  | "intraday_atr_structure"
  | "measured_breakout"
  | "trend_pullback"
  | "momentum_extension"
  | "relative_volume_overnight"
  | "value_accumulation";

export interface TradeConstructionExplainability {
  methodology: TradeMethodology;
  primaryStrategy: string;
  supportingFactors: string[];
  matchedFactors: string[];
  totalFactors: number;
  atrUsed: number;
  structureAnchors: string[];
  notes: string[];
}

export interface DynamicTradeConstructionInput {
  price: number;
  side: "Long" | "Short";
  category: OpportunityCategory;
  metrics?: Record<string, number | string | null> | null;
  strategyId?: string | null;
  strategyName?: string | null;
  strategySignal?: {
    entry: number;
    stopLoss: number;
    target1: number;
    target2: number;
    target: number;
    holdingPeriod?: string;
    strategyId?: string;
    strategy?: string;
    confidence?: number;
    conviction?: number;
    riskReward?: number;
    reasons?: readonly string[];
    evidence?: readonly string[];
    tags?: readonly string[];
  } | null;
  supportingStrategyNames?: readonly string[];
  conviction?: number | null;
  confidence?: number | null;
  /** Sprint 9F.2 — force a horizon-owned methodology (skips category fallback). */
  forcedMethodology?: TradeMethodology | null;
  /** Sprint 9F.2 — institutional horizon id for holding/velocity class. */
  horizonId?: string | null;
}

export interface DynamicTradeConstructionResult extends TradeLevels {
  methodology: TradeMethodology;
  atrUsed: number;
  risk: number;
  rewardToT1: number;
  rewardToT3: number;
  expectedReturnPercent: number;
  primaryTargetPercent: number;
  holdingPeriod: string;
  explainability: TradeConstructionExplainability;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function num(
  metrics: Record<string, number | string | null> | null | undefined,
  key: string
): number | null {
  const value = metrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveAtr(
  price: number,
  metrics?: Record<string, number | string | null> | null
): number {
  const atr = num(metrics, "atr");
  if (atr != null && atr > 0) return atr;

  const volatility = num(metrics, "volatility");
  if (volatility != null && volatility > 0) {
    // volatility is ~% daily move scale from live-metrics — convert to price units.
    return Math.max(price * (volatility / 100) * 0.6, price * 0.004);
  }

  const dayHigh = num(metrics, "high");
  const dayLow = num(metrics, "low");
  if (dayHigh != null && dayLow != null && dayHigh > dayLow) {
    return Math.max((dayHigh - dayLow) * 0.7, price * 0.004);
  }

  const weekHigh = num(metrics, "week_high_52");
  const weekLow = num(metrics, "week_low_52");
  if (weekHigh != null && weekLow != null && weekHigh > weekLow) {
    return Math.max((weekHigh - weekLow) / 52, price * 0.005);
  }

  return price * 0.012;
}

function resolveMethodology(
  category: OpportunityCategory,
  strategyId?: string | null
): TradeMethodology {
  const id = (strategyId ?? "").toLowerCase();
  if (
    id.includes("vwap-mean") ||
    id.includes("mean-reversion") ||
    id === "liquidity-sweep"
  ) {
    return "vwap_mean_reversion";
  }
  if (id.includes("vwap-continuation") || id.includes("institutional-accumulation")) {
    return "vwap_continuation";
  }
  if (
    id.includes("cup") ||
    id.includes("darvas") ||
    id.includes("vcp") ||
    id.includes("flat-base") ||
    id.includes("breakout") ||
    id.includes("fifty-two") ||
    id.includes("52")
  ) {
    return "measured_breakout";
  }
  if (
    id.includes("ema") ||
    id.includes("stage") ||
    id.includes("pullback")
  ) {
    return "trend_pullback";
  }
  if (
    id.includes("momentum") ||
    id.includes("relative-strength") ||
    id.includes("earnings")
  ) {
    return "momentum_extension";
  }
  if (
    id.includes("buffett") ||
    id.includes("graham") ||
    id.includes("lynch") ||
    id.includes("greenblatt") ||
    id.includes("quality") ||
    id.includes("magic")
  ) {
    return "value_accumulation";
  }
  if (id.includes("orb") || id.includes("scalp") || id.includes("gap")) {
    return "intraday_atr_structure";
  }

  switch (category) {
    case "intraday":
      return "intraday_atr_structure";
    case "mean_reversion":
      return "vwap_mean_reversion";
    case "relative_volume":
      return "relative_volume_overnight";
    case "breakout":
      return "measured_breakout";
    case "swing":
      return "trend_pullback";
    case "momentum":
      return "momentum_extension";
    case "ai_high_conviction":
      return "value_accumulation";
    default:
      return "trend_pullback";
  }
}

interface StructureContext {
  atr: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  vwap: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  weekHigh: number | null;
  weekLow: number | null;
  adx: number | null;
  rsi: number | null;
  trendScore: number | null;
  momentum: number | null;
  volumeRatio: number | null;
  volatility: number | null;
  fundScore: number | null;
  priceTo52wHigh: number | null;
}

function collectStructure(
  price: number,
  metrics?: Record<string, number | string | null> | null
): StructureContext {
  return {
    atr: resolveAtr(price, metrics),
    ema20: num(metrics, "ema20"),
    ema50: num(metrics, "ema50"),
    ema200: num(metrics, "ema200"),
    vwap: num(metrics, "vwap"),
    dayHigh: num(metrics, "high"),
    dayLow: num(metrics, "low"),
    weekHigh: num(metrics, "week_high_52"),
    weekLow: num(metrics, "week_low_52"),
    adx: num(metrics, "adx"),
    rsi: num(metrics, "rsi"),
    trendScore: num(metrics, "trend_score"),
    momentum: num(metrics, "momentum"),
    volumeRatio: num(metrics, "volume_ratio"),
    volatility: num(metrics, "volatility"),
    fundScore: num(metrics, "fundamental_score"),
    priceTo52wHigh: num(metrics, "price_to_52w_high"),
  };
}

function pack(
  entryZone: { low: number; high: number },
  stopLoss: number,
  target1: number,
  target2: number,
  target3: number,
  entry: number,
  holdingPeriod: string,
  riskReward: number
): TradeLevels {
  return {
    entryZone,
    stopLoss: round2(stopLoss),
    target1: round2(target1),
    target2: round2(target2),
    target3: round2(target3),
    riskReward: round2(riskReward),
    timeHorizon: holdingPeriod,
  };
}

function entryBand(
  entry: number,
  atr: number,
  fraction: number
): { low: number; high: number } {
  const half = Math.max(entry * 0.0008, atr * fraction);
  return { low: round2(entry - half), high: round2(entry + half) };
}

function longStopBelow(
  entry: number,
  atr: number,
  candidates: Array<number | null | undefined>,
  minAtrMultiple: number
): number {
  const floor = entry - atr * minAtrMultiple;
  let best = floor;
  for (const raw of candidates) {
    if (raw == null || !Number.isFinite(raw)) continue;
    if (raw < entry - atr * 0.15 && raw > entry - atr * 6) {
      // Prefer structural stop closest below entry but at least 0.35 ATR away.
      if (raw <= entry - atr * 0.35 && raw > best) best = raw - atr * 0.05;
    }
  }
  return round2(Math.min(best, entry - atr * 0.35));
}

function shortStopAbove(
  entry: number,
  atr: number,
  candidates: Array<number | null | undefined>,
  minAtrMultiple: number
): number {
  const ceiling = entry + atr * minAtrMultiple;
  let best = ceiling;
  for (const raw of candidates) {
    if (raw == null || !Number.isFinite(raw)) continue;
    if (raw > entry + atr * 0.15 && raw < entry + atr * 6) {
      if (raw >= entry + atr * 0.35 && raw < best) best = raw + atr * 0.05;
    }
  }
  return round2(Math.max(best, entry + atr * 0.35));
}

function buildLadderFromRisk(
  long: boolean,
  entry: number,
  stop: number,
  multiples: [number, number, number],
  extension?: number | null
): [number, number, number] {
  const risk = Math.abs(entry - stop);
  const t1 = long ? entry + risk * multiples[0] : entry - risk * multiples[0];
  const t2 = long ? entry + risk * multiples[1] : entry - risk * multiples[1];
  let t3 = long ? entry + risk * multiples[2] : entry - risk * multiples[2];
  if (extension != null && Number.isFinite(extension) && extension > 0) {
    if (long && extension > t2) t3 = Math.max(t3, extension);
    if (!long && extension < t2) t3 = Math.min(t3, extension);
  }
  return [round2(t1), round2(t2), round2(t3)];
}

function measuredMoveExtension(
  long: boolean,
  entry: number,
  structure: StructureContext,
  patternHeight: number
): number | null {
  if (!(patternHeight > 0)) return null;
  return round2(long ? entry + patternHeight : entry - patternHeight);
}

function constructByMethodology(
  methodology: TradeMethodology,
  price: number,
  long: boolean,
  structure: StructureContext
): {
  entry: number;
  stop: number;
  targets: [number, number, number];
  zoneFraction: number;
  notes: string[];
  anchors: string[];
} {
  const atr = structure.atr;
  const entry = price;
  const notes: string[] = [];
  const anchors: string[] = [];

  switch (methodology) {
    case "vwap_mean_reversion": {
      const vwap = structure.vwap ?? entry;
      anchors.push(structure.vwap != null ? `VWAP ${round2(vwap)}` : "ATR mean-reversion");
      const stop = long
        ? longStopBelow(entry, atr, [structure.dayLow, entry - atr], 1.0)
        : shortStopAbove(entry, atr, [structure.dayHigh, entry + atr], 1.0);
      // Targets pull toward VWAP then ATR extensions beyond.
      const towardVwap = long
        ? Math.max(vwap, entry + atr * 0.55)
        : Math.min(vwap, entry - atr * 0.55);
      const risk = Math.abs(entry - stop);
      const t1 = round2(
        long
          ? Math.max(towardVwap, entry + risk * 1.1)
          : Math.min(towardVwap, entry - risk * 1.1)
      );
      const t2 = round2(long ? entry + risk * 1.75 : entry - risk * 1.75);
      const t3 = round2(long ? entry + risk * 2.5 : entry - risk * 2.5);
      notes.push("VWAP rejection entry; stop beyond VWAP/session failure; ATR targets");
      return { entry, stop, targets: [t1, t2, t3], zoneFraction: 0.12, notes, anchors };
    }
    case "vwap_continuation":
    case "relative_volume_overnight": {
      const vwap = structure.vwap;
      if (vwap != null) anchors.push(`VWAP ${round2(vwap)}`);
      const stop = long
        ? longStopBelow(entry, atr, [vwap, structure.ema20, structure.dayLow], 1.1)
        : shortStopAbove(entry, atr, [vwap, structure.ema20, structure.dayHigh], 1.1);
      const multiples: [number, number, number] =
        methodology === "relative_volume_overnight" ? [1.4, 2.1, 2.9] : [1.6, 2.4, 3.2];
      const targets = buildLadderFromRisk(long, entry, stop, multiples);
      notes.push(
        methodology === "relative_volume_overnight"
          ? "Relative-volume overnight continuation; ATR risk units"
          : "VWAP continuation; stop under VWAP/EMA; ATR R-targets"
      );
      return { entry, stop, targets, zoneFraction: 0.15, notes, anchors };
    }
    case "intraday_atr_structure": {
      const stop = long
        ? longStopBelow(entry, atr, [structure.dayLow, structure.vwap, structure.ema20], 1.0)
        : shortStopAbove(entry, atr, [structure.dayHigh, structure.vwap, structure.ema20], 1.0);
      const adxBoost = structure.adx != null && structure.adx >= 25 ? 0.25 : 0;
      const multiples: [number, number, number] = [
        1.5 + adxBoost,
        2.2 + adxBoost,
        3.0 + adxBoost,
      ];
      const targets = buildLadderFromRisk(long, entry, stop, multiples);
      notes.push("Intraday ATR/structure stop; R-multiple targets scaled by ADX");
      if (structure.dayLow != null) anchors.push(`Day low ${round2(structure.dayLow)}`);
      if (structure.vwap != null) anchors.push(`VWAP ${round2(structure.vwap)}`);
      return { entry, stop, targets, zoneFraction: 0.1, notes, anchors };
    }
    case "measured_breakout": {
      const patternHeight =
        structure.dayHigh != null && structure.dayLow != null
          ? Math.max(structure.dayHigh - structure.dayLow, atr)
          : atr * 2.2;
      anchors.push(`Pattern height ${round2(patternHeight)}`);
      const stop = long
        ? longStopBelow(
            entry,
            atr,
            [structure.dayLow, structure.ema20, entry - patternHeight * 0.35],
            1.2
          )
        : shortStopAbove(
            entry,
            atr,
            [structure.dayHigh, structure.ema20, entry + patternHeight * 0.35],
            1.2
          );
      const extension = measuredMoveExtension(long, entry, structure, patternHeight);
      if (extension != null) anchors.push(`Measured move ${extension}`);
      const targets = buildLadderFromRisk(
        long,
        entry,
        stop,
        [1.6, 2.6, 3.6],
        extension
      );
      notes.push("Breakout structure stop; measured-move + ATR ladder");
      return { entry, stop, targets, zoneFraction: 0.18, notes, anchors };
    }
    case "trend_pullback": {
      if (structure.ema20 != null) anchors.push(`EMA20 ${round2(structure.ema20)}`);
      if (structure.ema50 != null) anchors.push(`EMA50 ${round2(structure.ema50)}`);
      const stop = long
        ? longStopBelow(entry, atr, [structure.ema20, structure.ema50, structure.dayLow], 1.5)
        : shortStopAbove(entry, atr, [structure.ema20, structure.ema50, structure.dayHigh], 1.5);
      const trendBoost =
        structure.trendScore != null ? clamp((structure.trendScore - 50) / 80, -0.2, 0.4) : 0;
      const multiples: [number, number, number] = [
        1.8 + trendBoost,
        2.8 + trendBoost,
        4.0 + trendBoost,
      ];
      const targets = buildLadderFromRisk(long, entry, stop, multiples);
      notes.push("EMA/structure pullback stop; ATR R-targets scaled by trend score");
      return { entry, stop, targets, zoneFraction: 0.22, notes, anchors };
    }
    case "momentum_extension": {
      const mom = Math.abs(structure.momentum ?? 0);
      const momBoost = clamp(mom / 40, 0, 0.5);
      if (structure.ema20 != null) anchors.push(`EMA20 ${round2(structure.ema20)}`);
      const stop = long
        ? longStopBelow(entry, atr, [structure.ema20, structure.dayLow], 1.35)
        : shortStopAbove(entry, atr, [structure.ema20, structure.dayHigh], 1.35);
      const weekExt =
        long && structure.weekHigh != null && structure.weekHigh > entry
          ? structure.weekHigh
          : !long && structure.weekLow != null && structure.weekLow < entry
            ? structure.weekLow
            : null;
      const targets = buildLadderFromRisk(
        long,
        entry,
        stop,
        [1.7 + momBoost, 2.7 + momBoost, 3.8 + momBoost],
        weekExt
      );
      notes.push("Momentum extension; stop under EMA/session; ATR + 52W extension");
      return { entry, stop, targets, zoneFraction: 0.2, notes, anchors };
    }
    case "value_accumulation": {
      if (structure.ema50 != null) anchors.push(`EMA50 ${round2(structure.ema50)}`);
      if (structure.ema200 != null) anchors.push(`EMA200 ${round2(structure.ema200)}`);
      const fund = structure.fundScore ?? 55;
      const fundBoost = clamp((fund - 50) / 60, -0.15, 0.45);
      const stop = long
        ? longStopBelow(
            entry,
            atr,
            [structure.ema50, structure.ema200, structure.weekLow],
            2.4
          )
        : shortStopAbove(
            entry,
            atr,
            [structure.ema50, structure.ema200, structure.weekHigh],
            2.4
          );
      // Wider ladder — business-cycle convergence, still ATR-based (stock-specific).
      const multiples: [number, number, number] = [
        2.2 + fundBoost,
        3.8 + fundBoost * 1.2,
        5.5 + fundBoost * 1.5,
      ];
      const fairExt =
        long && structure.weekHigh != null
          ? Math.max(structure.weekHigh, entry + atr * (4 + fundBoost * 2))
          : null;
      const targets = buildLadderFromRisk(long, entry, stop, multiples, fairExt);
      notes.push(
        "Quality/value accumulation; structural stop; ATR ladder scaled by fundamentals"
      );
      return { entry, stop, targets, zoneFraction: 0.35, notes, anchors };
    }
    case "strategy_signal":
    default: {
      const stop = long
        ? longStopBelow(entry, atr, [structure.ema20, structure.dayLow], 1.5)
        : shortStopAbove(entry, atr, [structure.ema20, structure.dayHigh], 1.5);
      const targets = buildLadderFromRisk(long, entry, stop, [1.8, 2.8, 3.8]);
      notes.push("ATR/structure fallback construction");
      return { entry, stop, targets, zoneFraction: 0.2, notes, anchors };
    }
  }
}

function buildMatchedFactors(
  price: number,
  structure: StructureContext,
  long: boolean,
  methodology: TradeMethodology
): { matched: string[]; total: number } {
  const checks: Array<{ label: string; ok: boolean }> = [
    { label: "ATR available", ok: structure.atr > 0 },
    { label: "ADX ≥ 20", ok: structure.adx != null && structure.adx >= 20 },
    { label: "ADX > 25", ok: structure.adx != null && structure.adx > 25 },
    {
      label: long ? "Price above EMA20" : "Price below EMA20",
      ok:
        structure.ema20 != null &&
        (long ? price >= structure.ema20 : price <= structure.ema20),
    },
    {
      label: long ? "Price above EMA50" : "Price below EMA50",
      ok:
        structure.ema50 != null &&
        (long ? price >= structure.ema50 : price <= structure.ema50),
    },
    {
      label: long ? "Price above VWAP" : "Price below VWAP",
      ok:
        structure.vwap != null &&
        (long ? price >= structure.vwap : price <= structure.vwap),
    },
    {
      label: "Volume expansion ≥ 1.2×",
      ok: structure.volumeRatio != null && structure.volumeRatio >= 1.2,
    },
    {
      label: "Relative volume ≥ 1.5×",
      ok: structure.volumeRatio != null && structure.volumeRatio >= 1.5,
    },
    {
      label: "Trend score supportive",
      ok:
        structure.trendScore != null &&
        (long ? structure.trendScore >= 52 : structure.trendScore <= 48),
    },
    {
      label: "Momentum aligned",
      ok:
        structure.momentum != null &&
        (long ? structure.momentum >= 0 : structure.momentum <= 0),
    },
    {
      label: "RSI not exhausted",
      ok:
        structure.rsi == null ||
        (long ? structure.rsi <= 72 : structure.rsi >= 28),
    },
    {
      label: "52-week structure present",
      ok: structure.weekHigh != null && structure.weekLow != null,
    },
  ];

  if (methodology === "value_accumulation") {
    checks.push({
      label: "Fundamental score ≥ 50",
      ok: structure.fundScore != null && structure.fundScore >= 50,
    });
  }
  if (methodology === "measured_breakout") {
    checks.push({
      label: "Near range high / breakout context",
      ok:
        structure.priceTo52wHigh != null
          ? structure.priceTo52wHigh >= 0.85
          : structure.dayHigh != null,
    });
  }
  if (
    methodology === "vwap_mean_reversion" ||
    methodology === "vwap_continuation"
  ) {
    checks.push({
      label: "VWAP anchor present",
      ok: structure.vwap != null,
    });
  }

  const matched = checks.filter((c) => c.ok).map((c) => c.label);
  return { matched, total: checks.length };
}

function validSignalLevels(
  signal: NonNullable<DynamicTradeConstructionInput["strategySignal"]>,
  side: "Long" | "Short"
): boolean {
  if (!(signal.entry > 0) || !(signal.stopLoss > 0)) return false;
  if (!(signal.target1 > 0)) return false;
  if (side === "Long") {
    return signal.stopLoss < signal.entry && signal.target1 > signal.entry;
  }
  return signal.stopLoss > signal.entry && signal.target1 < signal.entry;
}

/**
 * Build a fully dynamic trade plan for one opportunity.
 */
export function constructDynamicTrade(
  input: DynamicTradeConstructionInput
): DynamicTradeConstructionResult {
  const price = input.price;
  if (!(price > 0)) {
    return emptyResult(input.category);
  }

  const long = input.side === "Long";
  const structure = collectStructure(price, input.metrics);
  const signal = input.strategySignal;
  const strategyId = signal?.strategyId ?? input.strategyId ?? null;
  const strategyName =
    signal?.strategy ?? input.strategyName ?? `${input.category} dynamic`;

  let methodology: TradeMethodology;
  let entry: number;
  let stop: number;
  let rawTargets: number[];
  let zoneFraction: number;
  let notes: string[];
  let anchors: string[];

  if (signal && validSignalLevels(signal, input.side)) {
    methodology = "strategy_signal";
    entry = signal.entry;
    stop = signal.stopLoss;
    rawTargets = [signal.target1, signal.target2, signal.target];
    zoneFraction = clamp(structure.atr / entry * 0.35, 0.08, 0.4);
    notes = [
      `Primary strategy levels from ${strategyName}`,
      ...(signal.reasons ?? []).slice(0, 3),
    ];
    anchors = [...(signal.tags ?? []).slice(0, 4)];
  } else {
    methodology =
      input.forcedMethodology ??
      resolveMethodology(input.category, strategyId);
    const built = constructByMethodology(methodology, price, long, structure);
    entry = built.entry;
    stop = built.stop;
    rawTargets = [...built.targets];
    zoneFraction = built.zoneFraction;
    notes = [
      ...built.notes,
      ...(input.horizonId
        ? [`Horizon-owned construction: ${input.horizonId}`]
        : []),
    ];
    anchors = built.anchors;
  }

  const action = long ? ("BUY" as const) : ("SELL" as const);
  const targets = ensureThreeTargets({
    action,
    entry,
    stopLoss: stop,
    targets: rawTargets,
  });

  // If ladder still invalid, rebuild from ATR risk unit.
  if (targets.length < 3) {
    const rebuilt = buildLadderFromRisk(long, entry, stop, [1.6, 2.5, 3.5]);
    targets.length = 0;
    targets.push(...ensureThreeTargets({ action, entry, stopLoss: stop, targets: rebuilt }));
  }

  const t1 = targets[0];
  const t2 = targets[1] ?? t1;
  const t3 = targets[2] ?? t2;
  const risk = Math.abs(entry - stop);
  const rewardToT1 = Math.abs(t1 - entry);
  const rewardToT3 = Math.abs(t3 - entry);
  // Institutional RR uses primary target distance vs stop distance.
  const riskReward = risk > 0 ? rewardToT1 / risk : 0;

  // Reject pathological geometry by widening stop slightly toward ATR floor
  // is NOT done here — caller/validator rejects. We still emit best-effort levels.

  const holding = estimateHoldingPeriod({
    category: input.category,
    side: input.side,
    entry,
    stopLoss: stop,
    target1: t1,
    target3: t3,
    atr: structure.atr,
    adx: structure.adx,
    volatility: structure.volatility,
    volumeRatio: structure.volumeRatio,
    trendScore: structure.trendScore,
    strategyId,
    horizonId: (input.horizonId as
      | "scalping"
      | "intraday"
      | "btst"
      | "swing"
      | "short_term"
      | "medium_term"
      | "long_term"
      | null
      | undefined) ?? null,
  });

  const expected = computeProbabilityWeightedExpectedReturn({
    side: input.side,
    entry,
    stopLoss: stop,
    targets: [t1, t2, t3],
    conviction: input.conviction ?? signal?.conviction ?? null,
    confidence: input.confidence ?? signal?.confidence ?? null,
    holdingDaysMid: (holding.daysLow + holding.daysHigh) / 2,
    currentPrice: price,
  });

  const factors = buildMatchedFactors(price, structure, long, methodology);

  const supporting = [
    ...(input.supportingStrategyNames ?? []),
    ...factors.matched.slice(0, 6),
  ];

  const zone = entryBand(entry, structure.atr, zoneFraction);
  const levels = pack(
    zone,
    stop,
    t1,
    t2,
    t3,
    entry,
    holding.label,
    riskReward
  );

  return {
    ...levels,
    methodology,
    atrUsed: round2(structure.atr),
    risk: round2(risk),
    rewardToT1: round2(rewardToT1),
    rewardToT3: round2(rewardToT3),
    expectedReturnPercent: expected?.expectedReturnPercent ?? 0,
    primaryTargetPercent: expected?.primaryTargetPercent ?? 0,
    holdingPeriod: holding.label,
    explainability: {
      methodology,
      primaryStrategy: strategyName,
      supportingFactors: supporting.slice(0, 8),
      matchedFactors: factors.matched,
      totalFactors: factors.total,
      atrUsed: round2(structure.atr),
      structureAnchors: anchors,
      notes,
    },
  };
}

function emptyResult(category: OpportunityCategory): DynamicTradeConstructionResult {
  return {
    entryZone: { low: 0, high: 0 },
    stopLoss: 0,
    target1: 0,
    target2: 0,
    target3: 0,
    riskReward: 0,
    timeHorizon: "Unavailable",
    methodology: "trend_pullback",
    atrUsed: 0,
    risk: 0,
    rewardToT1: 0,
    rewardToT3: 0,
    expectedReturnPercent: 0,
    primaryTargetPercent: 0,
    holdingPeriod: "Unavailable",
    explainability: {
      methodology: "trend_pullback",
      primaryStrategy: category,
      supportingFactors: [],
      matchedFactors: [],
      totalFactors: 0,
      atrUsed: 0,
      structureAnchors: [],
      notes: ["Invalid price — trade construction skipped."],
    },
  };
}

/**
 * Apply constructed levels onto an OpportunityCandidate field set.
 */
export function projectLevelsOntoCandidate(levels: DynamicTradeConstructionResult): {
  entryZone: TradeLevels["entryZone"];
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
  timeHorizon: string;
} {
  return {
    entryZone: levels.entryZone,
    stopLoss: levels.stopLoss,
    target1: levels.target1,
    target2: levels.target2,
    target3: levels.target3,
    riskReward: levels.riskReward,
    timeHorizon: levels.holdingPeriod,
  };
}
