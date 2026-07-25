/**
 * Sprint 9F — Institutional Recommendation Validation Layer (P0).
 *
 * Mandatory gate: nothing reaches Dashboard / AI Insights / Flash Cards /
 * Watchlists / Portfolio Alerts / APIs until these checks pass.
 *
 * Pure functions — no I/O, no strategy execution, no score invention.
 */

import {
  computeCanonicalExpectedReturn,
  computeCanonicalRiskReward,
  resolveEffectiveEntry,
  sealTradeMetrics,
  RISK_REWARD_MISMATCH_TOLERANCE,
} from "@/lib/recommendations/trade-integrity";

export type RecommendationSideAction = "BUY" | "SELL" | "WATCHLIST";

export const INSTITUTIONAL_MIN_RISK_REWARD = 1;

const PLACEHOLDER_STRINGS = new Set([
  "",
  "—",
  "-",
  "n/a",
  "na",
  "todo",
  "tbd",
  "unknown",
  "placeholder",
  "null",
  "undefined",
]);

export interface InstitutionalTradeLevelsInput {
  action: RecommendationSideAction;
  /** Single execution price or zone midpoint. */
  entry: number;
  entryLow?: number | null;
  entryHigh?: number | null;
  stopLoss: number;
  /** Ordered targets: Target1, Target2, Target3 (missing trailing ok). */
  targets: readonly number[];
  holdingPeriod?: string | null;
  primaryStrategy?: string | null;
  currentPrice?: number | null;
  /** Optional stored RR — recomputed RR is authoritative. */
  statedRiskReward?: number | null;
}

export interface InstitutionalTradeLevelChecks {
  requiredFields: boolean;
  noPlaceholders: boolean;
  stopLossGeometry: boolean;
  entryZoneGeometry: boolean;
  targetOrdering: boolean;
  expectedReturnPositive: boolean;
  riskRewardAboveThreshold: boolean;
  holdingPeriodValid: boolean;
  strategyPresent: boolean;
  currentPriceConsistent: boolean;
  statedRiskConsistent: boolean;
}

export interface InstitutionalTradeLevelMetrics {
  entry: number;
  stopLoss: number;
  targets: number[];
  risk: number;
  reward: number;
  riskReward: number;
  /**
   * Canonical Expected Return (% of Effective Entry → Target1).
   * ER = (T1 − Entry) / Entry × 100
   */
  expectedReturnPercent: number;
  /** Same as expectedReturnPercent under Sprint 9F.4 definition. */
  primaryTargetPercent?: number;
}

export interface ComputeTradeMetricsOptions {
  conviction?: number | null;
  confidence?: number | null;
  holdingDaysMid?: number | null;
  currentPrice?: number | null;
}

export interface InstitutionalTradeLevelValidation {
  valid: boolean;
  score: number;
  checks: InstitutionalTradeLevelChecks;
  reasons: string[];
  metrics: InstitutionalTradeLevelMetrics | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function isPlaceholderString(value: string | null | undefined): boolean {
  if (value == null) return true;
  return PLACEHOLDER_STRINGS.has(value.trim().toLowerCase());
}

function uniquePositiveTargets(targets: readonly number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of targets) {
    const value = positive(raw);
    if (value == null) continue;
    const key = round2(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function resolveEntry(input: InstitutionalTradeLevelsInput): number | null {
  return resolveEffectiveEntry({
    entry: input.entry,
    entryLow: input.entryLow,
    entryHigh: input.entryHigh,
  });
}

/**
 * Recalculate risk / reward / expected return from actual trade levels.
 * BUY: risk = entry − SL, reward = primaryTarget − entry
 * SELL: risk = SL − entry, reward = entry − primaryTarget
 *
 * Expected Return (canonical): (Target1 − EffectiveEntry) / EffectiveEntry × 100
 */
export function computeTradeMetrics(
  action: RecommendationSideAction,
  entry: number,
  stopLoss: number,
  targets: readonly number[],
  _options: ComputeTradeMetricsOptions = {}
): InstitutionalTradeLevelMetrics | null {
  const sealed = sealTradeMetrics({
    action,
    entry,
    stopLoss,
    targets,
  });
  if (sealed) {
    return {
      entry: sealed.effectiveEntry,
      stopLoss: sealed.stopLoss,
      targets: sealed.targets,
      risk: sealed.risk,
      reward: sealed.reward,
      riskReward: sealed.riskReward,
      expectedReturnPercent: sealed.expectedReturnPercent,
      primaryTargetPercent: sealed.primaryTargetPercent,
    };
  }

  // Geometry may be incomplete — still expose raw distances for diagnostics.
  const cleaned = uniquePositiveTargets(targets);
  if (!(entry > 0) || !(stopLoss > 0) || cleaned.length === 0) return null;
  const rr = computeCanonicalRiskReward({
    action,
    effectiveEntry: entry,
    stopLoss,
    target1: cleaned[0],
  });
  const er = computeCanonicalExpectedReturn({
    action,
    effectiveEntry: entry,
    target1: cleaned[0],
  });
  return {
    entry: round2(entry),
    stopLoss: round2(stopLoss),
    targets: cleaned,
    risk: rr?.risk ?? 0,
    reward: rr?.reward ?? 0,
    riskReward: rr?.riskReward ?? 0,
    expectedReturnPercent: er ?? 0,
    primaryTargetPercent: er ?? 0,
  };
}

/**
 * Institutional-grade trade-level validation.
 * Reject on any geometry / RR / required-field failure.
 */
export function validateInstitutionalTradeLevels(
  input: InstitutionalTradeLevelsInput
): InstitutionalTradeLevelValidation {
  const reasons: string[] = [];
  const entry = resolveEntry(input);
  const stopLoss = positive(input.stopLoss);
  const targets = uniquePositiveTargets(input.targets);
  const isSell = input.action === "SELL";

  const requiredFields =
    entry != null &&
    stopLoss != null &&
    targets.length >= 1;

  if (!requiredFields) {
    if (entry == null) reasons.push("Missing Entry.");
    if (stopLoss == null) reasons.push("Missing Stop Loss.");
    if (targets.length < 1) reasons.push("Missing Target.");
  }

  const strategyPresent = !isPlaceholderString(input.primaryStrategy);
  if (!strategyPresent) reasons.push("Missing Strategy.");

  const holdingPeriodValid = !isPlaceholderString(input.holdingPeriod);
  if (!holdingPeriodValid) reasons.push("Missing Holding Period.");

  const noPlaceholders =
    strategyPresent &&
    holdingPeriodValid &&
    entry != null &&
    stopLoss != null &&
    targets.length >= 1;
  if (!noPlaceholders && requiredFields) {
    reasons.push("Placeholder or incomplete trade values.");
  }

  let stopLossGeometry = false;
  let entryZoneGeometry = true;
  let targetOrdering = false;
  let expectedReturnPositive = false;
  let riskRewardAboveThreshold = false;
  let currentPriceConsistent = true;
  let statedRiskConsistent = true;
  let metrics: InstitutionalTradeLevelMetrics | null = null;

  if (entry != null && stopLoss != null && targets.length >= 1) {
    // Entry zone must sit entirely on the correct side of SL / T1.
    const entryLow = positive(input.entryLow) ?? entry;
    const entryHigh = positive(input.entryHigh) ?? entry;
    const primaryTarget = targets[0];

    if (isSell) {
      stopLossGeometry = stopLoss > entryHigh;
      if (!stopLossGeometry) {
        reasons.push("SELL Stop Loss must be above Entry Range.");
      }
      entryZoneGeometry = entryLow <= entryHigh && entryHigh < stopLoss;
      if (!entryZoneGeometry) {
        reasons.push("SELL Entry Range must sit below Stop Loss.");
      }
      targetOrdering = targets.every((target, index) => {
        if (index === 0) return target < entryLow;
        return target < targets[index - 1];
      });
      if (!targetOrdering) {
        reasons.push(
          "SELL targets must satisfy Target3 < Target2 < Target1 < Entry."
        );
      }
    } else {
      // BUY + WATCHLIST use long geometry.
      stopLossGeometry = stopLoss < entryLow;
      if (!stopLossGeometry) {
        reasons.push("BUY Stop Loss must be below Entry Range.");
      }
      entryZoneGeometry = entryLow <= entryHigh && stopLoss < entryLow;
      if (!entryZoneGeometry) {
        reasons.push("BUY Entry Range must sit above Stop Loss.");
      }
      targetOrdering = targets.every((target, index) => {
        if (index === 0) return target > entryHigh;
        return target > targets[index - 1];
      });
      if (!targetOrdering) {
        reasons.push(
          "BUY targets must satisfy Entry < Target1 < Target2 < Target3."
        );
      }
    }

    metrics = computeTradeMetrics(input.action, entry, stopLoss, targets, {
      currentPrice: input.currentPrice,
    });
    expectedReturnPositive =
      metrics != null &&
      metrics.reward > 0 &&
      ((metrics.primaryTargetPercent ?? 0) > 0 ||
        metrics.expectedReturnPercent > 0);
    if (!expectedReturnPositive) {
      reasons.push("Expected Return must be greater than 0.");
    }

    riskRewardAboveThreshold =
      metrics != null && metrics.riskReward > INSTITUTIONAL_MIN_RISK_REWARD;
    if (!riskRewardAboveThreshold) {
      reasons.push(
        `Risk Reward must be greater than ${INSTITUTIONAL_MIN_RISK_REWARD}.`
      );
    }

    // Current price consistency: LTP should not already be past stop in a way
    // that invalidates the setup (optional soft-hard hybrid).
    const cmp = positive(input.currentPrice);
    if (cmp != null && metrics != null) {
      if (isSell) {
        // For shorts, price already far above SL is inconsistent.
        currentPriceConsistent = cmp <= stopLoss * 1.15;
      } else {
        currentPriceConsistent = cmp >= stopLoss * 0.85;
      }
      if (!currentPriceConsistent) {
        reasons.push("Current Price is inconsistent with trade geometry.");
      }
    }

    const stated = positive(input.statedRiskReward);
    if (stated != null && metrics != null && metrics.riskReward > 0) {
      const drift = Math.abs(stated - metrics.riskReward);
      // Soft diagnostic only — OE stated RR is often rounded; published RR
      // is always recomputed. Hard >0.01 rejection is enforced on display seal.
      statedRiskConsistent = drift <= RISK_REWARD_MISMATCH_TOLERANCE;
    }
  }

  const checks: InstitutionalTradeLevelChecks = {
    requiredFields,
    noPlaceholders,
    stopLossGeometry,
    entryZoneGeometry,
    targetOrdering,
    expectedReturnPositive,
    riskRewardAboveThreshold,
    holdingPeriodValid,
    strategyPresent,
    currentPriceConsistent,
    statedRiskConsistent,
  };

  const checkValues = Object.values(checks);
  const passed = checkValues.filter(Boolean).length;
  // Soft diagnostics: stated RR + current-price do not block publishability.
  const hardValid =
    checks.requiredFields &&
    checks.noPlaceholders &&
    checks.stopLossGeometry &&
    checks.entryZoneGeometry &&
    checks.targetOrdering &&
    checks.expectedReturnPositive &&
    checks.riskRewardAboveThreshold &&
    checks.holdingPeriodValid &&
    checks.strategyPresent;
  const valid = hardValid && reasons.length === 0;

  // De-dupe reasons while preserving order.
  const uniqueReasons = [...new Set(reasons)];

  return {
    valid,
    score: Math.round((passed / checkValues.length) * 100),
    checks,
    reasons: uniqueReasons,
    metrics,
  };
}

/**
 * True when a remapped presentation entry still satisfies institutional geometry
 * against the recommendation's stop and targets.
 */
export function isPresentationEntryValid(input: InstitutionalTradeLevelsInput): boolean {
  return validateInstitutionalTradeLevels(input).valid;
}

/**
 * Clamp / fall back an institutional entry plan so it cannot invert SL/targets.
 * Returns null when no valid entry exists — callers must reject the row.
 */
export function resolveValidatedEntry(options: {
  action: RecommendationSideAction;
  preferredEntry: number;
  preferredLow?: number | null;
  preferredHigh?: number | null;
  signalEntry: number;
  stopLoss: number;
  targets: readonly number[];
  halfWidth?: number;
}): {
  entry: number;
  low: number | null;
  high: number | null;
  mode: "zone" | "ideal";
} | null {
  const { action, stopLoss, targets, signalEntry } = options;
  const halfWidth = options.halfWidth ?? 0.005;
  const cleaned = uniquePositiveTargets(targets);
  if (cleaned.length === 0 || !(stopLoss > 0)) return null;

  const primaryTarget = cleaned[0];
  const isSell = action === "SELL";

  const candidates: number[] = [];
  const push = (value: number | null | undefined) => {
    const v = positive(value);
    if (v != null) candidates.push(v);
  };
  push(options.preferredEntry);
  push(
    options.preferredLow != null && options.preferredHigh != null
      ? (options.preferredLow + options.preferredHigh) / 2
      : null
  );
  push(signalEntry);
  // Structural midpoint between SL and T1 as last resort.
  push(isSell ? (stopLoss + primaryTarget) / 2 : (stopLoss + primaryTarget) / 2);

  for (const entry of candidates) {
    const bandHalf = Math.max(entry * halfWidth, entry * 0.0008);
    const low = round2(entry - bandHalf);
    const high = round2(entry + bandHalf);
    const mid = round2((low + high) / 2);
    const validation = validateInstitutionalTradeLevels({
      action,
      entry: mid,
      entryLow: low,
      entryHigh: high,
      stopLoss,
      targets: cleaned,
      holdingPeriod: "validated",
      primaryStrategy: "validated",
    });
    if (validation.valid) {
      return { entry: mid, low, high, mode: "zone" };
    }

    const idealValidation = validateInstitutionalTradeLevels({
      action,
      entry,
      stopLoss,
      targets: cleaned,
      holdingPeriod: "validated",
      primaryStrategy: "validated",
    });
    if (idealValidation.valid) {
      return { entry: round2(entry), low: null, high: null, mode: "ideal" };
    }
  }

  return null;
}
