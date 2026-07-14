/**
 * Earnings countdown engine — IST-aware labels for institutional calendar cards.
 */

import type {
  CountdownStatus,
  EarningsCountdownView,
} from "./InstitutionalEarningsModels";

const IST = "Asia/Kolkata";

export function getIstDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseDateKey(dateKey: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function daysUntilResult(resultDate: string, now = new Date()): number | null {
  const parsed = parseDateKey(resultDate);
  if (!parsed) return null;
  const todayKey = getIstDateKey(now);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

function getIstMinutesOfDay(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function parseResultTimeMinutes(resultTime: string | null | undefined): number | null {
  if (!resultTime) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(resultTime.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Build countdown view for an earnings event.
 * Supports Today / Tomorrow / N Days / Hours / Minutes / Result Released / Expired.
 */
export function buildEarningsCountdown(
  resultDate: string,
  resultTime: string | null = null,
  now = new Date()
): EarningsCountdownView {
  const days = daysUntilResult(resultDate, now);

  if (days == null) {
    return {
      status: "expired",
      label: "Expired",
      daysRemaining: null,
      hoursRemaining: null,
      minutesRemaining: null,
      isUpcoming: false,
      isReleased: false,
      isExpired: true,
    };
  }

  if (days < -1) {
    return {
      status: "expired",
      label: "Expired",
      daysRemaining: days,
      hoursRemaining: null,
      minutesRemaining: null,
      isUpcoming: false,
      isReleased: true,
      isExpired: true,
    };
  }

  if (days === -1) {
    return {
      status: "result_released",
      label: "Result Released",
      daysRemaining: days,
      hoursRemaining: null,
      minutesRemaining: null,
      isUpcoming: false,
      isReleased: true,
      isExpired: false,
    };
  }

  if (days === 0) {
    const sessionMinutes = parseResultTimeMinutes(resultTime);
    const nowMinutes = getIstMinutesOfDay(now);

    if (sessionMinutes != null && nowMinutes >= sessionMinutes) {
      return {
        status: "result_released",
        label: "Result Released",
        daysRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining: 0,
        isUpcoming: false,
        isReleased: true,
        isExpired: false,
      };
    }

    if (sessionMinutes != null) {
      const remaining = sessionMinutes - nowMinutes;
      if (remaining < 60) {
        return {
          status: "minutes",
          label: `${remaining} Minutes`,
          daysRemaining: 0,
          hoursRemaining: 0,
          minutesRemaining: remaining,
          isUpcoming: true,
          isReleased: false,
          isExpired: false,
        };
      }
      const hours = Math.floor(remaining / 60);
      return {
        status: "hours",
        label: `${hours} Hours`,
        daysRemaining: 0,
        hoursRemaining: hours,
        minutesRemaining: remaining,
        isUpcoming: true,
        isReleased: false,
        isExpired: false,
      };
    }

    return {
      status: "today",
      label: "Today",
      daysRemaining: 0,
      hoursRemaining: null,
      minutesRemaining: null,
      isUpcoming: true,
      isReleased: false,
      isExpired: false,
    };
  }

  if (days === 1) {
    return {
      status: "tomorrow",
      label: "Tomorrow",
      daysRemaining: 1,
      hoursRemaining: null,
      minutesRemaining: null,
      isUpcoming: true,
      isReleased: false,
      isExpired: false,
    };
  }

  return {
    status: "days" as CountdownStatus,
    label: `${days} Days`,
    daysRemaining: days,
    hoursRemaining: null,
    minutesRemaining: null,
    isUpcoming: true,
    isReleased: false,
    isExpired: false,
  };
}

export function isUpcomingEvent(
  resultDate: string,
  resultTime: string | null = null,
  now = new Date()
): boolean {
  return buildEarningsCountdown(resultDate, resultTime, now).isUpcoming;
}
