/**
 * Sprint 9F.1 / 9F.4 — Expected return helpers.
 *
 * Sprint 9F.4: Published "Expected Return" is Target1 return from Effective Entry.
 * Probability-weighted expectancy remains available as a diagnostic only —
 * it must NEVER be written to SharedRecommendation.expectedReturnPercent.
 */

import {
  computeCanonicalExpectedReturn,
  type TradeSideAction,
} from "@/lib/recommendations/trade-integrity";

export interface ExpectedReturnInput {
  side: "Long" | "Short" | "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  targets: readonly number[];
  /** 0–100 conviction or confidence used to scale hit rates. */
  conviction?: number | null;
  confidence?: number | null;
  /** Holding estimate in days (affects path expectancy mild decay). */
  holdingDaysMid?: number | null;
  currentPrice?: number | null;
}

export interface ExpectedReturnResult {
  /**
   * Published Expected Return % — Target1 from Effective Entry (Sprint 9F.4).
   */
  expectedReturnPercent: number;
  /** Same as expectedReturnPercent under the global definition. */
  primaryTargetPercent: number;
  /** Probability of stopping out (diagnostic). */
  stopProbability: number;
  /** Hit probabilities for T1 / T2 / T3 (diagnostic). */
  targetProbabilities: number[];
  methodology: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isSell(side: ExpectedReturnInput["side"]): boolean {
  return side === "Short" || side === "SELL";
}

function toAction(side: ExpectedReturnInput["side"]): TradeSideAction {
  return isSell(side) ? "SELL" : "BUY";
}

/**
 * Canonical published Expected Return (Sprint 9F.4):
 *   ER = (Target1 − Entry) / Entry × 100
 */
export function computeTarget1ExpectedReturn(input: {
  side: ExpectedReturnInput["side"];
  entry: number;
  target1: number;
}): number | null {
  return computeCanonicalExpectedReturn({
    action: toAction(input.side),
    effectiveEntry: input.entry,
    target1: input.target1,
  });
}

/**
 * Published Expected Return + diagnostic ladder metadata.
 * `expectedReturnPercent` is ALWAYS Target1 return (never probability-weighted).
 */
export function computeProbabilityWeightedExpectedReturn(
  input: ExpectedReturnInput
): ExpectedReturnResult | null {
  const entry = input.entry;
  if (!(entry > 0) || !(input.stopLoss > 0) || input.targets.length === 0) {
    return null;
  }

  const sell = isSell(input.side);
  const risk = sell ? input.stopLoss - entry : entry - input.stopLoss;
  if (!(risk > 0)) return null;

  const targets = input.targets
    .filter((t) => Number.isFinite(t) && t > 0)
    .filter((t) => (sell ? t < entry : t > entry))
    .slice(0, 3);
  if (targets.length === 0) return null;

  const primary = computeTarget1ExpectedReturn({
    side: input.side,
    entry,
    target1: targets[0],
  });
  if (primary == null) return null;

  // Diagnostic path expectancy (not published as Expected Return).
  const rewards = targets.map((t) => (sell ? entry - t : t - entry));
  const rewardT1 = rewards[0];
  const rr = rewardT1 / risk;
  const conviction = clamp(
    input.conviction ?? input.confidence ?? 60,
    5,
    100
  );
  const convictionFactor = conviction / 100;
  const geometricWin = rr / (1 + rr);
  const pWin = clamp(geometricWin * (0.55 + 0.45 * convictionFactor), 0.18, 0.72);
  const pStop = clamp(1 - pWin, 0.28, 0.82);
  const weights = rewards.map((reward, index) => {
    const proximity = rewardT1 / Math.max(reward, rewardT1 * 0.5);
    const stepDecay = Math.pow(0.62, index);
    return proximity * stepDecay;
  });
  const weightSum = weights.reduce((sum, w) => sum + w, 0) || 1;
  const targetProbabilities = weights.map((w) =>
    round2((w / weightSum) * pWin * 100)
  );

  return {
    expectedReturnPercent: primary,
    primaryTargetPercent: primary,
    stopProbability: round2(pStop * 100),
    targetProbabilities,
    methodology:
      "canonical Target1 return from Effective Entry (Sprint 9F.4); PW ladder retained as diagnostic only",
  };
}
