/**
 * Sprint 9F.4 — Recommendation Data Integrity Engine.
 *
 * Single source of truth for every displayed trade number.
 * No module may invent its own Expected Return / RR / Entry formula.
 *
 * Canonical definitions (global):
 *   Effective Entry  = midpoint(entryLow, entryHigh) when both valid,
 *                      else the single entry price
 *   Expected Return  = (Target1 − EffectiveEntry) / EffectiveEntry × 100
 *                      (SELL: (EffectiveEntry − Target1) / EffectiveEntry × 100)
 *   Risk             = |EffectiveEntry − StopLoss|
 *   Reward           = |Target1 − EffectiveEntry|
 *   Risk Reward      = Reward / Risk
 */

import { HORIZON_HOLDING_ENVELOPES } from "@/lib/recommendations/horizons/definitions";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import type {
  HorizonId,
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";

/** Documented Expected Return definition — Target1 return from Effective Entry. */
export const EXPECTED_RETURN_DEFINITION =
  "target1_from_effective_entry" as const;

/** Documented Effective Entry definition — entry-range midpoint. */
export const EFFECTIVE_ENTRY_DEFINITION = "entry_range_midpoint" as const;

/** Absolute RR mismatch tolerance (Part 4). */
export const RISK_REWARD_MISMATCH_TOLERANCE = 0.01;

/** Absolute Expected Return % mismatch tolerance. */
export const EXPECTED_RETURN_MISMATCH_TOLERANCE = 0.01;

export type TradeSideAction = "BUY" | "SELL" | "WATCHLIST" | "Long" | "Short";

export interface EffectiveEntryInput {
  entry: number;
  entryLow?: number | null;
  entryHigh?: number | null;
}

export interface CanonicalTradeMetrics {
  /** Canonical Effective Entry (midpoint or single). */
  effectiveEntry: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targets: number[];
  risk: number;
  reward: number;
  riskReward: number;
  /** Canonical Expected Return % (Target1 from Effective Entry). */
  expectedReturnPercent: number;
  /** Same as expectedReturnPercent under the global definition. */
  primaryTargetPercent: number;
  returnToTarget1Percent: number;
  returnToTarget2Percent: number | null;
  returnToTarget3Percent: number | null;
}

export interface IntegrityFailure {
  symbol: string;
  module: HorizonId | string;
  field: string;
  expectedValue: number | string;
  displayedValue: number | string;
  difference: number | string;
  formula: string;
}

export interface IntegrityAuditReport {
  passed: number;
  failed: number;
  failures: IntegrityFailure[];
  canonicalFormulas: {
    expectedReturn: string;
    riskReward: string;
    effectiveEntry: string;
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function isSell(action: TradeSideAction): boolean {
  return action === "SELL" || action === "Short";
}

/**
 * Canonical Effective Entry.
 * Midpoint of Entry Range when both bounds are valid; else single entry.
 */
export function resolveEffectiveEntry(
  input: EffectiveEntryInput
): number | null {
  const low = positive(input.entryLow);
  const high = positive(input.entryHigh);
  if (low != null && high != null && high >= low) {
    return round2((low + high) / 2);
  }
  return positive(input.entry);
}

function targetReturnPercent(
  sell: boolean,
  entry: number,
  target: number
): number {
  return sell
    ? round2(((entry - target) / entry) * 100)
    : round2(((target - entry) / entry) * 100);
}

/**
 * Canonical Expected Return = Target1 return from Effective Entry.
 */
export function computeCanonicalExpectedReturn(input: {
  action: TradeSideAction;
  effectiveEntry: number;
  target1: number;
}): number | null {
  const entry = positive(input.effectiveEntry);
  const t1 = positive(input.target1);
  if (entry == null || t1 == null) return null;
  const sell = isSell(input.action);
  if (sell ? !(t1 < entry) : !(t1 > entry)) return null;
  return targetReturnPercent(sell, entry, t1);
}

/**
 * Canonical Risk / Reward / Risk Reward from Effective Entry, Stop, Target1.
 */
export function computeCanonicalRiskReward(input: {
  action: TradeSideAction;
  effectiveEntry: number;
  stopLoss: number;
  target1: number;
}): { risk: number; reward: number; riskReward: number } | null {
  const entry = positive(input.effectiveEntry);
  const stop = positive(input.stopLoss);
  const t1 = positive(input.target1);
  if (entry == null || stop == null || t1 == null) return null;

  const sell = isSell(input.action);
  const risk = sell ? round2(stop - entry) : round2(entry - stop);
  const reward = sell ? round2(entry - t1) : round2(t1 - entry);
  if (!(risk > 0) || !(reward > 0)) {
    return {
      risk: Math.max(0, risk),
      reward: Math.max(0, reward),
      riskReward: 0,
    };
  }
  return {
    risk,
    reward,
    riskReward: round4(reward / risk),
  };
}

/**
 * BUY: SL < EntryLow ≤ EntryHigh < T1 < T2 < T3
 * SELL: T3 < T2 < T1 < EntryLow ≤ EntryHigh < SL
 */
export function validateTradeGeometry(input: {
  action: TradeSideAction;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targets: readonly number[];
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const low = positive(input.entryLow);
  const high = positive(input.entryHigh);
  const stop = positive(input.stopLoss);
  const targets = input.targets
    .map(positive)
    .filter((v): v is number => v != null);
  if (low == null || high == null || stop == null || targets.length < 1) {
    return { ok: false, reasons: ["Missing Entry / Stop / Target."] };
  }
  if (high < low) reasons.push("Entry High must be ≥ Entry Low.");

  const sell = isSell(input.action);
  if (sell) {
    if (!(stop > high)) {
      reasons.push("SELL: Stop Loss must be above Entry Range.");
    }
    if (!(targets[0] < low)) {
      reasons.push("SELL: Target1 must be below Entry Range.");
    }
    for (let i = 1; i < targets.length; i++) {
      if (!(targets[i] < targets[i - 1])) {
        reasons.push("SELL: targets must satisfy T3 < T2 < T1.");
        break;
      }
    }
  } else {
    if (!(stop < low)) {
      reasons.push("BUY: Stop Loss must be below Entry Range.");
    }
    if (!(targets[0] > high)) {
      reasons.push("BUY: Target1 must be above Entry Range.");
    }
    for (let i = 1; i < targets.length; i++) {
      if (!(targets[i] > targets[i - 1])) {
        reasons.push("BUY: targets must satisfy T1 < T2 < T3.");
        break;
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Seal all trade metrics from one geometry — the only published numbers.
 */
export function sealTradeMetrics(input: {
  action: TradeSideAction;
  entry: number;
  entryLow?: number | null;
  entryHigh?: number | null;
  stopLoss: number;
  targets: readonly number[];
}): CanonicalTradeMetrics | null {
  const stop = positive(input.stopLoss);
  const cleanedTargets = input.targets
    .map(positive)
    .filter((v): v is number => v != null)
    .filter((v, i, arr) => arr.findIndex((x) => round2(x) === round2(v)) === i)
    .slice(0, 3);
  if (stop == null || cleanedTargets.length === 0) return null;

  const effectiveEntry = resolveEffectiveEntry({
    entry: input.entry,
    entryLow: input.entryLow,
    entryHigh: input.entryHigh,
  });
  if (effectiveEntry == null) return null;

  const entryLow = positive(input.entryLow) ?? effectiveEntry;
  const entryHigh = positive(input.entryHigh) ?? effectiveEntry;

  const geometry = validateTradeGeometry({
    action: input.action,
    entryLow,
    entryHigh,
    stopLoss: stop,
    targets: cleanedTargets,
  });
  if (!geometry.ok) return null;

  const rr = computeCanonicalRiskReward({
    action: input.action,
    effectiveEntry,
    stopLoss: stop,
    target1: cleanedTargets[0],
  });
  const er = computeCanonicalExpectedReturn({
    action: input.action,
    effectiveEntry,
    target1: cleanedTargets[0],
  });
  if (rr == null || er == null || !(rr.riskReward > 1)) return null;

  const sell = isSell(input.action);
  return {
    effectiveEntry,
    entryLow: round2(entryLow),
    entryHigh: round2(entryHigh),
    stopLoss: round2(stop),
    targets: cleanedTargets.map(round2),
    risk: rr.risk,
    reward: rr.reward,
    riskReward: rr.riskReward,
    expectedReturnPercent: er,
    primaryTargetPercent: er,
    returnToTarget1Percent: er,
    returnToTarget2Percent:
      cleanedTargets[1] != null
        ? targetReturnPercent(sell, effectiveEntry, cleanedTargets[1])
        : null,
    returnToTarget3Percent:
      cleanedTargets[2] != null
        ? targetReturnPercent(sell, effectiveEntry, cleanedTargets[2])
        : null,
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
  const env = HORIZON_HOLDING_ENVELOPES[horizonId];
  return (env.daysMin + env.daysMax) / 2;
}

/**
 * Verify a sealed recommendation row is internally consistent.
 */
export function verifyRecommendationIntegrity(
  row: HorizonRecommendation
): IntegrityFailure[] {
  const failures: IntegrityFailure[] = [];
  const rec = row.recommendation;
  const trade = row.trade;
  const action = rec.action === "SELL" ? "SELL" : "BUY";
  const moduleId = row.horizonId;

  const sealed = sealTradeMetrics({
    action,
    entry: trade.entry,
    entryLow: trade.entryLow,
    entryHigh: trade.entryHigh,
    stopLoss: trade.stopLoss,
    targets: trade.targets,
  });

  if (!sealed) {
    failures.push({
      symbol: row.selection.symbol,
      module: moduleId,
      field: "geometry",
      expectedValue: "valid SL/Entry/Targets ladder",
      displayedValue: "invalid",
      difference: "n/a",
      formula: "BUY: SL < Entry < T1 < T2 < T3",
    });
    return failures;
  }

  const push = (
    field: string,
    expected: number,
    displayed: number,
    formula: string
  ) => {
    const diff = round2(Math.abs(expected - displayed));
    const tol =
      field === "riskReward" || field === "trade.riskReward"
        ? RISK_REWARD_MISMATCH_TOLERANCE
        : EXPECTED_RETURN_MISMATCH_TOLERANCE;
    if (diff > tol) {
      failures.push({
        symbol: row.selection.symbol,
        module: moduleId,
        field,
        expectedValue: expected,
        displayedValue: displayed,
        difference: diff,
        formula,
      });
    }
  };

  push(
    "entry",
    sealed.effectiveEntry,
    round2(rec.entry),
    "Effective Entry = midpoint(entryLow, entryHigh)"
  );
  push(
    "riskReward",
    sealed.riskReward,
    round2(rec.riskReward),
    "RR = |T1−Entry| / |Entry−SL|"
  );
  push(
    "expectedReturnPercent",
    sealed.expectedReturnPercent,
    round2(rec.expectedReturnPercent ?? trade.expectedReturnPercent),
    "ER = (T1 − EffectiveEntry) / EffectiveEntry × 100"
  );
  push(
    "trade.riskReward",
    sealed.riskReward,
    round2(trade.riskReward),
    "RR = |T1−Entry| / |Entry−SL|"
  );
  push(
    "trade.expectedReturnPercent",
    sealed.expectedReturnPercent,
    round2(trade.expectedReturnPercent),
    "ER = (T1 − EffectiveEntry) / EffectiveEntry × 100"
  );

  for (let i = 0; i < Math.min(3, sealed.targets.length); i++) {
    const displayed = rec.targets[i];
    if (typeof displayed === "number") {
      push(
        `target${i + 1}`,
        sealed.targets[i],
        round2(displayed),
        "Targets from trade construction engine"
      );
    }
  }

  const mid = parseHoldingMidDays(trade.holdingPeriod, row.horizonId);
  const env = HORIZON_HOLDING_ENVELOPES[row.horizonId];
  if (mid < env.daysMin * 0.85 || mid > env.daysMax * 1.15) {
    failures.push({
      symbol: row.selection.symbol,
      module: moduleId,
      field: "holdingPeriod",
      expectedValue: env.label,
      displayedValue: trade.holdingPeriod,
      difference: `mid ${round2(mid)}d outside ${env.daysMin}–${env.daysMax}`,
      formula: "Holding mid ∈ horizon envelope",
    });
  }

  return failures;
}

/**
 * Part 12 — integrity audit across every recommendation in a snapshot.
 */
export function auditRecommendationIntegrity(
  snapshot: HorizonPipelineSnapshot
): IntegrityAuditReport {
  const failures: IntegrityFailure[] = [];
  let passed = 0;
  let failed = 0;

  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    for (const row of snapshot[horizonId]) {
      const rowFailures = verifyRecommendationIntegrity(row);
      if (rowFailures.length === 0) {
        passed += 1;
      } else {
        failed += 1;
        failures.push(...rowFailures);
      }
    }
  }

  return {
    passed,
    failed,
    failures,
    canonicalFormulas: {
      expectedReturn:
        "ER% = (Target1 − EffectiveEntry) / EffectiveEntry × 100 (SELL mirrored)",
      riskReward:
        "RR = |Target1 − EffectiveEntry| / |EffectiveEntry − StopLoss|",
      effectiveEntry:
        "EffectiveEntry = midpoint(entryLow, entryHigh) when both valid, else entry",
    },
  };
}

/**
 * Apply sealed metrics onto a trade + recommendation pair.
 */
export function applySealedMetricsToRecommendation(
  row: HorizonRecommendation
): HorizonRecommendation | null {
  const action = row.recommendation.action === "SELL" ? "SELL" : "BUY";
  const sealed = sealTradeMetrics({
    action,
    entry: row.trade.entry,
    entryLow: row.trade.entryLow,
    entryHigh: row.trade.entryHigh,
    stopLoss: row.trade.stopLoss,
    targets: row.trade.targets,
  });
  if (!sealed) return null;

  return {
    ...row,
    trade: {
      ...row.trade,
      entry: sealed.effectiveEntry,
      entryLow: sealed.entryLow,
      entryHigh: sealed.entryHigh,
      stopLoss: sealed.stopLoss,
      targets: sealed.targets as [number, number, number],
      risk: sealed.risk,
      reward: sealed.reward,
      riskReward: sealed.riskReward,
      expectedReturnPercent: sealed.expectedReturnPercent,
    },
    recommendation: {
      ...row.recommendation,
      entry: sealed.effectiveEntry,
      entryLow: sealed.entryLow,
      entryHigh: sealed.entryHigh,
      stopLoss: sealed.stopLoss,
      targets: sealed.targets,
      risk: sealed.risk,
      reward: sealed.reward,
      riskReward: sealed.riskReward,
      expectedReturnPercent: sealed.expectedReturnPercent,
    },
  };
}
