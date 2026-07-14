/**
 * Sprint 9A.1 — NSE/BSE market session utilities (IST).
 */

export type MarketStatus = "open" | "closed" | "pre_open" | "post_close" | "holiday";

const IST_TIMEZONE = "Asia/Kolkata";

/** NSE cash market session (IST). */
const SESSION = {
  PRE_OPEN_START: 9 * 60, // 09:00
  MARKET_OPEN: 9 * 60 + 15, // 09:15
  MARKET_CLOSE: 15 * 60 + 30, // 15:30
} as const;

/** Major NSE holidays for 2026 (extend as needed). */
const NSE_HOLIDAYS_2026 = new Set([
  "2026-01-26",
  "2026-03-10",
  "2026-03-30",
  "2026-04-02",
  "2026-04-14",
  "2026-05-01",
  "2026-08-15",
  "2026-10-02",
  "2026-10-20",
  "2026-11-05",
  "2026-11-24",
  "2026-12-25",
]);

function getISTParts(date = new Date()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  dayOfWeek: number;
  dateKey: string;
} {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hours = Number(get("hour"));
  const minutes = Number(get("minute"));
  const weekday = get("weekday");
  const dayOfWeek =
    weekday === "Sun" ? 0 : weekday === "Mon" ? 1 : weekday === "Tue" ? 2 : weekday === "Wed" ? 3 : weekday === "Thu" ? 4 : weekday === "Fri" ? 5 : 6;

  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { year, month, day, hours, minutes, dayOfWeek, dateKey };
}

function isTradingHoliday(dateKey: string): boolean {
  return NSE_HOLIDAYS_2026.has(dateKey);
}

function minutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function isTradingCalendarDay(dayOfWeek: number, dateKey: string): boolean {
  return dayOfWeek !== 0 && dayOfWeek !== 6 && !isTradingHoliday(dateKey);
}

/** IST calendar date key (YYYY-MM-DD) for `now`. */
export function getISTDateKey(now = new Date()): string {
  return getISTParts(now).dateKey;
}

/** Whether `now` falls on an NSE trading calendar day (weekday, not holiday). */
export function isTradingDay(now = new Date()): boolean {
  const { dayOfWeek, dateKey } = getISTParts(now);
  return isTradingCalendarDay(dayOfWeek, dateKey);
}

/**
 * Trading session date for opportunity-engine lifecycle.
 * - On a trading day: that IST calendar date.
 * - On weekends/holidays: the previous trading date (keeps post-market
 *   visible until the next session, without mixing into a new day).
 */
export function getTradingDateKey(now = new Date()): string {
  const parts = getISTParts(now);
  if (isTradingCalendarDay(parts.dayOfWeek, parts.dateKey)) {
    return parts.dateKey;
  }

  let cursor = new Date(now.getTime());
  for (let guard = 0; guard < 14; guard += 1) {
    cursor = new Date(cursor.getTime() - 86_400_000);
    const previous = getISTParts(cursor);
    if (isTradingCalendarDay(previous.dayOfWeek, previous.dateKey)) {
      return previous.dateKey;
    }
  }

  return parts.dateKey;
}

/** Whether NSE cash market is currently open for live polling. */
export function isMarketOpen(now = new Date()): boolean {
  const { dayOfWeek, dateKey, hours, minutes } = getISTParts(now);
  if (!isTradingCalendarDay(dayOfWeek, dateKey)) return false;

  const elapsed = minutesSinceMidnight(hours, minutes);
  return elapsed >= SESSION.MARKET_OPEN && elapsed < SESSION.MARKET_CLOSE;
}

/** Current market status for display. */
export function getMarketStatus(now = new Date()): MarketStatus {
  const { dayOfWeek, dateKey, hours, minutes } = getISTParts(now);
  if (isTradingHoliday(dateKey)) {
    return "holiday";
  }
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "closed";
  }

  const elapsed = minutesSinceMidnight(hours, minutes);
  if (elapsed >= SESSION.PRE_OPEN_START && elapsed < SESSION.MARKET_OPEN) {
    return "pre_open";
  }
  if (elapsed >= SESSION.MARKET_OPEN && elapsed < SESSION.MARKET_CLOSE) {
    return "open";
  }
  if (elapsed >= SESSION.MARKET_CLOSE) {
    return "post_close";
  }
  return "closed";
}

/** Polling interval during market hours (ms). Zero when closed. */
export function getQuotePollIntervalMs(now = new Date()): number {
  return isMarketOpen(now) ? 5_000 : 0;
}

/** Server-side quote cache TTL — 5s during session, longer after close. */
export function getQuoteCacheTtlMs(now = new Date()): number {
  return isMarketOpen(now) ? 5_000 : 300_000;
}

/** Last NSE cash session close as ISO timestamp (IST wall clock). */
export function getLastSessionCloseISO(now = new Date()): string {
  const { year, month, day, dayOfWeek, dateKey } = getISTParts(now);
  let closeDate = new Date(Date.UTC(year, month - 1, day, 10, 0, 0)); // 15:30 IST = 10:00 UTC

  const { hours, minutes } = getISTParts(now);
  const elapsed = minutesSinceMidnight(hours, minutes);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend || isTradingHoliday(dateKey) || elapsed < SESSION.MARKET_CLOSE) {
    closeDate = new Date(closeDate.getTime() - 86_400_000);
    let guard = 0;
    while (guard < 10) {
      const parts = getISTParts(closeDate);
      if (parts.dayOfWeek !== 0 && parts.dayOfWeek !== 6 && !isTradingHoliday(parts.dateKey)) {
        break;
      }
      closeDate = new Date(closeDate.getTime() - 86_400_000);
      guard += 1;
    }
  }

  const closeParts = getISTParts(closeDate);
  return new Date(
    Date.UTC(closeParts.year, closeParts.month - 1, closeParts.day, 10, 0, 0)
  ).toISOString();
}

export function getMarketStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "open":
      return "Market Open";
    case "pre_open":
      return "Pre-Open";
    case "holiday":
      return "Holiday";
    case "post_close":
      return "Market Closed";
    default:
      return "Market Closed";
  }
}
