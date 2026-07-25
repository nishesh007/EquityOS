/**
 * Opportunity Engine institutional scan schedule helpers (IST).
 * Pure functions — no engine / API side effects.
 */

import {
  getISTDateKey,
  isOpportunityScanSession,
  isTradingDay,
} from "@/lib/market/session";

/** Scalping cadence — drives the master OE scan clock. */
export const SCALPING_SCAN_INTERVAL_MS = 5 * 60 * 1000;

/** Intraday / Swing / BTST / Short / Medium / Long Term cadence. */
export const STANDARD_SCAN_INTERVAL_MS = 15 * 60 * 1000;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** IST wall-clock minutes since local midnight. */
export function getIstMinutesSinceMidnight(now = new Date()): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/**
 * Floor IST time to the start of an interval bucket (minutes since midnight).
 * Example: 11:17 with 5-min interval → 11:15 → 675.
 */
export function floorIstMinutesToInterval(
  minutesSinceMidnight: number,
  intervalMinutes: number
): number {
  if (intervalMinutes <= 0) return minutesSinceMidnight;
  return Math.floor(minutesSinceMidnight / intervalMinutes) * intervalMinutes;
}

/** Current scalping (5-min) bucket start as IST minutes. */
export function currentScalpingBucketMinutes(now = new Date()): number {
  return floorIstMinutesToInterval(getIstMinutesSinceMidnight(now), 5);
}

/**
 * True when a new master scan is required for the current 5-minute IST bucket.
 * Reuses existing scan data when lastScannedAt already falls in this bucket.
 */
export function shouldRunOpportunityScan(
  lastScannedAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!isTradingDay(now) || !isOpportunityScanSession(now)) return false;

  const tradingDay = getISTDateKey(now);
  const bucket = currentScalpingBucketMinutes(now);

  if (!lastScannedAt) return true;
  const last = new Date(lastScannedAt);
  if (Number.isNaN(last.getTime())) return true;

  if (getISTDateKey(last) !== tradingDay) return true;
  return currentScalpingBucketMinutes(last) < bucket;
}

/** Next 5-minute IST boundary as ISO, or null outside the scan session. */
export function nextOpportunityScanAt(now = new Date()): string | null {
  if (!isTradingDay(now)) return null;
  if (!isOpportunityScanSession(now)) return null;

  const minutes = getIstMinutesSinceMidnight(now);
  const nextBucket = floorIstMinutesToInterval(minutes, 5) + 5;
  // Session ends at 15:30 (930 minutes) — last scheduled scan is 15:30 itself.
  if (minutes >= 15 * 60 + 30) return null;

  const dayKey = getISTDateKey(now);
  const [year, month, day] = dayKey.split("-").map(Number);
  const hours = Math.floor(nextBucket / 60);
  const mins = nextBucket % 60;
  // IST → UTC: subtract 5:30
  return new Date(
    Date.UTC(year, month - 1, day, hours - 5, mins - 30, 0, 0)
  ).toISOString();
}

export type StrategyScanCadenceMinutes = 5 | 15;

export const STRATEGY_SCAN_CADENCE_MINUTES: Readonly<
  Record<string, StrategyScanCadenceMinutes>
> = Object.freeze({
  scalping: 5,
  intraday: 15,
  swing: 15,
  btst: 15,
  short_term: 15,
  medium_term: 15,
  long_term: 15,
});
