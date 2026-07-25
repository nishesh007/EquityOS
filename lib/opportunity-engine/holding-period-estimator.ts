/**
 * Sprint 9F.1 / 9F.3 — Dynamic holding-period estimation.
 *
 * Holding period is derived from target distance, ATR velocity, and
 * (Sprint 9F.3) the institutional horizon class so estimates cannot leak
 * (e.g. Medium Term must not print "2–10 Trading Days").
 */

import type { OpportunityCategory } from "@/lib/opportunity-engine/types";
import {
  HORIZON_HOLDING_ENVELOPES,
  type HorizonHoldingEnvelope,
} from "@/lib/recommendations/horizons/definitions";
import type { HorizonId } from "@/lib/recommendations/horizons/types";

export interface HoldingPeriodEstimateInput {
  category: OpportunityCategory;
  side: "Long" | "Short";
  entry: number;
  stopLoss: number;
  target1: number;
  target3: number;
  atr: number;
  adx?: number | null;
  volatility?: number | null;
  volumeRatio?: number | null;
  trendScore?: number | null;
  strategyId?: string | null;
  /** Sprint 9F.3 — institutional horizon forces the holding class. */
  horizonId?: HorizonId | null;
}

export interface HoldingPeriodEstimate {
  daysLow: number;
  daysHigh: number;
  label: string;
  daysToPrimary: number;
  daysToFinal: number;
  methodology: string;
  /** Mid holding in trading days. */
  daysMid: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function estimateDailyVelocity(input: HoldingPeriodEstimateInput): number {
  const atr = Math.max(input.atr, input.entry * 0.002);
  const adx = input.adx ?? 20;
  const volRatio = input.volumeRatio ?? 1;
  const trend = input.trendScore ?? 50;
  const vol = input.volatility ?? 25;

  const trendBoost = clamp((trend - 40) / 100, -0.1, 0.25);
  const adxBoost = clamp(adx / 200, 0.05, 0.35);
  const volumeBoost = clamp((volRatio - 1) * 0.06, -0.05, 0.2);
  const volDrag = clamp((vol - 30) / 400, -0.05, 0.12);

  const fraction = clamp(
    0.28 + trendBoost + adxBoost + volumeBoost - volDrag,
    0.12,
    0.75
  );
  return atr * fraction;
}

function formatIntradayMinutes(minutesLow: number, minutesHigh: number): string {
  const low = Math.max(5, Math.round(minutesLow));
  const high = Math.max(low + 5, Math.round(minutesHigh));
  if (high <= 60) return `${low}–${high} Minutes`;
  if (low < 60) {
    return `${low} Minutes – ${Math.round(high / 60)} Hours`;
  }
  const hLow = Math.max(1, Math.round(low / 60));
  const hHigh = Math.max(hLow + 1, Math.round(high / 60));
  if (hHigh <= 6) return `${hLow}–${hHigh} Hours`;
  return `${hLow} Hours – market close`;
}

function formatTradingDays(daysLow: number, daysHigh: number): string {
  const low = Math.max(1, Math.round(daysLow));
  const high = Math.max(low + 1, Math.round(daysHigh));
  return `${low}–${high} Trading Days`;
}

function formatMonths(daysLow: number, daysHigh: number): string {
  const monthsLow = Math.max(1, Math.round(daysLow / 21));
  const monthsHigh = Math.max(monthsLow + 1, Math.round(daysHigh / 21));
  return `${monthsLow}–${monthsHigh} Months`;
}

/**
 * Horizon-class velocity: longer horizons assume slower thesis convergence
 * (business/earnings cycle), not full ATR consumed each session.
 */
function horizonVelocityScale(horizonId: HorizonId): number {
  switch (horizonId) {
    case "scalping":
      return 3.2;
    case "intraday":
      return 1.6;
    case "btst":
      return 0.85;
    case "swing":
      return 0.55;
    case "short_term":
      return 0.18;
    case "medium_term":
      return 0.08;
    case "long_term":
      return 0.035;
    default:
      return 0.4;
  }
}

function fitToEnvelope(
  daysPrimary: number,
  daysFinal: number,
  envelope: HorizonHoldingEnvelope
): { low: number; high: number; mid: number } {
  const rawMid = (daysPrimary + daysFinal) / 2;
  // Place mid inside envelope; width reflects target ladder span.
  const spanRatio = clamp(daysFinal / Math.max(daysPrimary, 0.01), 1.05, 2.2);
  let mid = clamp(rawMid, envelope.daysMin, envelope.daysMax);
  let low = mid / Math.sqrt(spanRatio);
  let high = mid * Math.sqrt(spanRatio);
  low = clamp(low, envelope.daysMin, envelope.daysMax);
  high = clamp(high, envelope.daysMin, envelope.daysMax);
  if (high <= low) {
    high = Math.min(envelope.daysMax, low * 1.25);
  }
  mid = (low + high) / 2;
  return { low, high, mid };
}

function labelForHorizon(
  horizonId: HorizonId,
  low: number,
  high: number
): string {
  switch (horizonId) {
    case "scalping":
    case "intraday":
      return formatIntradayMinutes(low * 375, high * 375);
    case "btst":
    case "swing":
      return formatTradingDays(low, high);
    case "short_term":
    case "medium_term":
    case "long_term":
      return formatMonths(low, high);
    default:
      return formatTradingDays(low, high);
  }
}

/**
 * Estimate holding period from geometry + market behaviour.
 * When horizonId is set, the result is constrained to that horizon's envelope.
 */
export function estimateHoldingPeriod(
  input: HoldingPeriodEstimateInput
): HoldingPeriodEstimate {
  const entry = input.entry;
  const atr = Math.max(input.atr, entry * 0.002);
  const distPrimary = Math.abs(input.target1 - entry);
  const distFinal = Math.max(distPrimary, Math.abs(input.target3 - entry));
  const baseVelocity = Math.max(estimateDailyVelocity(input), atr * 0.12);

  const horizonId = input.horizonId ?? null;
  const velocity = horizonId
    ? Math.max(baseVelocity * horizonVelocityScale(horizonId), atr * 0.02)
    : baseVelocity;

  let daysToPrimary = distPrimary / velocity;
  let daysToFinal = distFinal / Math.max(velocity * 0.72, atr * 0.05);

  const risk = Math.abs(entry - input.stopLoss);
  if (risk > atr * 2) {
    const stretch = clamp(risk / (atr * 2), 1, 2.2);
    daysToPrimary *= stretch;
    daysToFinal *= stretch;
  }

  if (horizonId) {
    const envelope = HORIZON_HOLDING_ENVELOPES[horizonId];
    const fitted = fitToEnvelope(daysToPrimary, daysToFinal, envelope);
    return {
      daysLow: round1(fitted.low),
      daysHigh: round1(fitted.high),
      label: labelForHorizon(horizonId, fitted.low, fitted.high),
      daysToPrimary: round1(fitted.low),
      daysToFinal: round1(fitted.high),
      daysMid: round1(fitted.mid),
      methodology: `horizon-calibrated ATR velocity (${horizonId})`,
    };
  }

  // Legacy OE-category path (no horizon id).
  const category = input.category;
  const strategyId = input.strategyId;
  const sessionLike =
    strategyId === "scalping" ||
    strategyId === "orb" ||
    category === "intraday" ||
    category === "mean_reversion" ||
    category === "relative_volume";

  if (sessionLike) {
    const sessionMinutes = 375;
    const scalp =
      strategyId === "scalping" || category === "mean_reversion";
    const minuteFactor =
      scalp ? 0.35 : category === "relative_volume" ? 1.8 : 1;
    const minutesPrimary = clamp(
      daysToPrimary * sessionMinutes * minuteFactor,
      8,
      360
    );
    const minutesFinal = clamp(
      daysToFinal * sessionMinutes * minuteFactor,
      minutesPrimary + 10,
      390
    );
    const low = minutesPrimary / sessionMinutes;
    const high = minutesFinal / sessionMinutes;
    return {
      daysLow: round1(low),
      daysHigh: round1(high),
      label: formatIntradayMinutes(minutesPrimary * 0.85, minutesFinal * 1.05),
      daysToPrimary: round1(low),
      daysToFinal: round1(high),
      daysMid: round1((low + high) / 2),
      methodology: "session-velocity from ATR × trend/ADX/volume",
    };
  }

  if (category === "ai_high_conviction") {
    daysToPrimary = Math.max(daysToPrimary * 4.5, 252);
    daysToFinal = Math.max(daysToFinal * 5.5, daysToPrimary * 1.35);
    const low = daysToPrimary * 0.85;
    const high = daysToFinal * 1.15;
    return {
      daysLow: round1(low),
      daysHigh: round1(high),
      label: formatMonths(low, high),
      daysToPrimary: round1(daysToPrimary),
      daysToFinal: round1(daysToFinal),
      daysMid: round1((low + high) / 2),
      methodology: "value-convergence velocity",
    };
  }

  const low = Math.max(2, daysToPrimary * 0.85);
  const high = Math.max(low + 1, daysToFinal * 1.15);
  return {
    daysLow: round1(low),
    daysHigh: round1(high),
    label: formatTradingDays(low, high),
    daysToPrimary: round1(daysToPrimary),
    daysToFinal: round1(daysToFinal),
    daysMid: round1((low + high) / 2),
    methodology: "target-distance / ATR velocity",
  };
}
