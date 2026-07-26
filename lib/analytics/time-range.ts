/**
 * Sprint 11F.1 — Shared analytics time-range presets.
 */

import type { DateRange, TimeRangePreset } from "@/lib/analytics/types";

export interface TimeRangePresetOption {
  id: TimeRangePreset;
  label: string;
}

export const TIME_RANGE_PRESETS: readonly TimeRangePresetOption[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "3_months", label: "3 Months" },
  { id: "6_months", label: "6 Months" },
  { id: "1_year", label: "1 Year" },
  { id: "all_time", label: "All Time" },
] as const;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay(); // 0 Sun … 6 Sat
  const offset = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - offset);
  return next;
}

function startOfMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

function toRange(start: Date, end: Date, label: string): DateRange {
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label,
  };
}

/**
 * Resolve a preset into an absolute DateRange.
 * `all_time` uses epoch start → now (callers may still ignore bounds).
 */
export function resolveTimeRangePreset(
  preset: TimeRangePreset,
  now: Date = new Date()
): DateRange {
  const end = endOfDay(now);
  const label =
    TIME_RANGE_PRESETS.find((option) => option.id === preset)?.label ?? preset;

  switch (preset) {
    case "today":
      return toRange(startOfDay(now), end, label);
    case "this_week":
      return toRange(startOfWeekMonday(now), end, label);
    case "this_month":
      return toRange(startOfMonth(now), end, label);
    case "3_months":
      return toRange(startOfDay(addMonths(now, -3)), end, label);
    case "6_months":
      return toRange(startOfDay(addMonths(now, -6)), end, label);
    case "1_year":
      return toRange(startOfDay(addYears(now, -1)), end, label);
    case "all_time":
      return toRange(new Date(0), end, label);
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

/** True when an ISO timestamp falls within [start, end] inclusive. */
export function isWithinDateRange(iso: string, range: DateRange): boolean {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return false;
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  return ts >= start && ts <= end;
}

export function filterByDateRange<T>(
  items: readonly T[],
  range: DateRange,
  getTimestamp: (item: T) => string
): T[] {
  return items.filter((item) => isWithinDateRange(getTimestamp(item), range));
}
