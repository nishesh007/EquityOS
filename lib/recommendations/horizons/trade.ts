/**
 * Sprint 9F.2 — Horizon-owned trade construction.
 *
 * Each horizon forces its own methodology. Pipelines do NOT reuse another
 * horizon's trade geometry.
 */

import {
  constructDynamicTrade,
  type TradeMethodology,
} from "@/lib/opportunity-engine/dynamic-trade-construction";
import type { OpportunityCategory } from "@/lib/opportunity-engine/types";
import { HORIZON_RETURN_ENVELOPES } from "@/lib/recommendations/horizons/definitions";
import { resolvePrice } from "@/lib/recommendations/horizons/metrics";
import type {
  HorizonId,
  HorizonSelectionResult,
  HorizonTradePlan,
} from "@/lib/recommendations/horizons/types";
import { sealTradeMetrics } from "@/lib/recommendations/trade-integrity";

/** Forced methodology per horizon — independent construction philosophies. */
export const HORIZON_METHODOLOGY: Record<HorizonId, TradeMethodology> = {
  scalping: "vwap_mean_reversion",
  intraday: "intraday_atr_structure",
  btst: "relative_volume_overnight",
  swing: "trend_pullback",
  short_term: "measured_breakout",
  medium_term: "momentum_extension",
  long_term: "value_accumulation",
};

/** Map horizon → OE category only for ATR/holding estimator class hints. */
const HORIZON_CATEGORY_HINT: Record<HorizonId, OpportunityCategory> = {
  scalping: "mean_reversion",
  intraday: "intraday",
  btst: "relative_volume",
  swing: "swing",
  short_term: "breakout",
  medium_term: "momentum",
  long_term: "ai_high_conviction",
};

const TARGET_NOTES: Record<HorizonId, string> = {
  scalping:
    "Scalping: VWAP rejection entry; stop beyond VWAP/session failure; ATR micro-targets",
  intraday:
    "Intraday: Opening-range / VWAP / EMA structure stop; session ATR R-ladder",
  btst:
    "BTST: Close-strength continuation; overnight ATR risk; next-session projection targets",
  swing:
    "Swing: EMA/structure stop; measured pattern + ATR R-targets over trading days",
  short_term:
    "Short Term: Breakout / RS structure; measured move + ATR for 1–3 month path",
  medium_term:
    "Medium Term: Trend/valuation extension; ATR ladder scaled by growth momentum",
  long_term:
    "Long Term: Quality accumulation zone; structural stop; intrinsic/ATR convergence ladder",
};

/**
 * Construct a trade using THIS horizon's methodology only.
 * Strategy Engine levels are used only when they match the horizon philosophy
 * (same strategy family); otherwise horizon methodology rebuilds the ladder.
 */
export function constructTradeForHorizon(
  selection: HorizonSelectionResult
): HorizonTradePlan | null {
  const candidate = selection.sourceCandidate;
  const price = resolvePrice(candidate);
  if (price == null || !(price > 0)) return null;

  const methodology = HORIZON_METHODOLOGY[selection.horizonId];
  const signal = candidate.strategySignal;
  const useStrategyLevels =
    signal != null &&
    signal.signal !== "IGNORE" &&
    signal.entry > 0 &&
    signal.stopLoss > 0 &&
    horizonAcceptsStrategy(selection.horizonId, signal.strategyId);

  const result = constructDynamicTrade({
    price,
    side: selection.side,
    category: HORIZON_CATEGORY_HINT[selection.horizonId],
    metrics: candidate.scanMetrics,
    strategyId: useStrategyLevels ? signal!.strategyId : selection.horizonId,
    strategyName: selection.primaryStrategy,
    strategySignal: useStrategyLevels
      ? {
          entry: signal!.entry,
          stopLoss: signal!.stopLoss,
          target1: signal!.target1,
          target2: signal!.target2,
          target: signal!.target,
          holdingPeriod: signal!.holdingPeriod,
          strategyId: signal!.strategyId,
          strategy: signal!.strategy,
          confidence: signal!.confidence,
          conviction: signal!.conviction,
          riskReward: signal!.riskReward,
          reasons: signal!.reasons,
          evidence: signal!.evidence,
          tags: signal!.tags,
        }
      : null,
    supportingStrategyNames: selection.supportingStrategies,
    conviction: candidate.aiConvictionScore,
    confidence: candidate.confidencePercent,
    // Force methodology when strategy levels are not used.
    forcedMethodology: useStrategyLevels ? undefined : methodology,
    horizonId: selection.horizonId,
  });

  if (
    !(result.stopLoss > 0) ||
    !(result.target1 > 0) ||
    !(result.riskReward > 1) ||
    (result.expectedReturnPercent === 0 && result.primaryTargetPercent <= 0)
  ) {
    return null;
  }

  const entry =
    (result.entryZone.low + result.entryZone.high) / 2 || price;

  // Strategy logic: investment horizon capital commitment requires a thesis
  // distance commensurate with the holding envelope (not a cosmetic bump).
  const aligned = alignTargetsToHorizonThesis({
    horizonId: selection.horizonId,
    side: selection.side,
    entry,
    stopLoss: result.stopLoss,
    targets: [result.target1, result.target2, result.target3],
    atr: result.atrUsed,
  });

  const action = selection.side === "Short" ? "SELL" : "BUY";
  const sealed = sealTradeMetrics({
    action,
    entry,
    entryLow: result.entryZone.low,
    entryHigh: result.entryZone.high,
    stopLoss: result.stopLoss,
    targets: aligned.targets,
  });
  if (!sealed) return null;

  return {
    entry: sealed.effectiveEntry,
    entryLow: sealed.entryLow,
    entryHigh: sealed.entryHigh,
    stopLoss: sealed.stopLoss,
    targets: sealed.targets as [number, number, number],
    risk: sealed.risk,
    reward: sealed.reward,
    riskReward: sealed.riskReward,
    expectedReturnPercent: sealed.expectedReturnPercent,
    holdingPeriod: result.holdingPeriod,
    holdingRationale: `Estimated from target distance ÷ horizon-calibrated ATR velocity for ${selection.horizonId.replace("_", " ")}`,
    targetMethodology: aligned.scaled
      ? `${TARGET_NOTES[selection.horizonId]} · thesis distance scaled to horizon minimum`
      : TARGET_NOTES[selection.horizonId],
    methodology:
      result.methodology === "strategy_signal" ? result.methodology : methodology,
  };
}

/**
 * If primary target is too small for the horizon's investment thesis,
 * extend the ladder proportionally up to 2.5× (ATR-bounded). Larger gaps
 * are left for the calibration rejector — we do not invent arbitrary %.
 */
function alignTargetsToHorizonThesis(input: {
  horizonId: HorizonId;
  side: "Long" | "Short";
  entry: number;
  stopLoss: number;
  targets: [number, number, number];
  atr: number;
}): { targets: [number, number, number]; scaled: boolean } {
  const minPct = HORIZON_RETURN_ENVELOPES[input.horizonId].primaryTargetMinPct;
  const entry = input.entry;
  const t1 = input.targets[0];
  const primaryPct = (Math.abs(t1 - entry) / entry) * 100;
  if (primaryPct >= minPct * 0.95) {
    return { targets: input.targets, scaled: false };
  }

  const scale = minPct / Math.max(primaryPct, 0.01);
  if (scale > 2.5) {
    return { targets: input.targets, scaled: false };
  }

  // Cap extension by available ATR room (≤ 12 ATR from entry).
  const maxDist = Math.max(input.atr * 12, entry * (minPct / 100));
  const long = input.side === "Long";
  const scaledTargets = input.targets.map((target) => {
    const dist = (target - entry) * scale;
    const capped = long
      ? Math.min(entry + dist, entry + maxDist * (Math.abs(target - entry) / Math.abs(t1 - entry) || 1))
      : Math.max(entry + dist, entry - maxDist * (Math.abs(target - entry) / Math.abs(t1 - entry) || 1));
    return round2(capped);
  }) as [number, number, number];

  // Ensure strict ordering.
  if (long) {
    if (!(scaledTargets[0] > entry && scaledTargets[1] > scaledTargets[0] && scaledTargets[2] > scaledTargets[1])) {
      return { targets: input.targets, scaled: false };
    }
  } else if (
    !(scaledTargets[0] < entry && scaledTargets[1] < scaledTargets[0] && scaledTargets[2] < scaledTargets[1])
  ) {
    return { targets: input.targets, scaled: false };
  }

  return { targets: scaledTargets, scaled: true };
}

function horizonAcceptsStrategy(
  horizonId: HorizonId,
  strategyId: string
): boolean {
  const id = strategyId.toLowerCase();
  switch (horizonId) {
    case "scalping":
      return (
        id.includes("scalp") ||
        id.includes("liquidity") ||
        id.includes("vwap-mean")
      );
    case "intraday":
      return (
        id.includes("orb") ||
        id.includes("vwap") ||
        id.includes("gap") ||
        id.includes("intraday") ||
        id.includes("breakout-retest") ||
        id.includes("sector") ||
        id.includes("rs-intraday") ||
        id.includes("relative-strength-intraday")
      );
    case "btst":
      return (
        id.includes("institutional") ||
        id.includes("vwap-continuation") ||
        id.includes("accumulation")
      );
    case "swing":
      return (
        id.includes("ema") ||
        id.includes("vcp") ||
        id.includes("cup") ||
        id.includes("darvas") ||
        id.includes("flat") ||
        id.includes("stage") ||
        id.includes("fifty") ||
        id.includes("52") ||
        id.includes("pullback")
      );
    case "short_term":
      return (
        id.includes("earnings") ||
        id.includes("sector") ||
        id.includes("breakout") ||
        id.includes("relative-strength") ||
        id.includes("institutional")
      );
    case "medium_term":
      return (
        id.includes("momentum") ||
        id.includes("earnings") ||
        id.includes("stage") ||
        id.includes("quality") ||
        id.includes("relative-strength")
      );
    case "long_term":
      return (
        id.includes("buffett") ||
        id.includes("graham") ||
        id.includes("lynch") ||
        id.includes("greenblatt") ||
        id.includes("quality") ||
        id.includes("magic")
      );
    default:
      return false;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
