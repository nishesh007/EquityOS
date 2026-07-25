import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentScalpingBucketMinutes,
  floorIstMinutesToInterval,
  shouldRunOpportunityScan,
} from "./scan-schedule";

function istDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30));
}

describe("opportunity scan schedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("floors minutes to interval buckets", () => {
    expect(floorIstMinutesToInterval(11 * 60 + 17, 5)).toBe(11 * 60 + 15);
    expect(floorIstMinutesToInterval(9 * 60, 15)).toBe(9 * 60);
  });

  it("skips scans outside the 09:00–15:30 IST window", () => {
    vi.setSystemTime(istDate(2026, 7, 24, 16, 0)); // Friday after close
    expect(shouldRunOpportunityScan(null)).toBe(false);
  });

  it("requires a scan when no prior scan exists in-session", () => {
    vi.setSystemTime(istDate(2026, 7, 24, 11, 12));
    expect(shouldRunOpportunityScan(null)).toBe(true);
  });

  it("reuses scan data within the same 5-minute bucket", () => {
    vi.setSystemTime(istDate(2026, 7, 24, 11, 17));
    const prior = istDate(2026, 7, 24, 11, 15).toISOString();
    expect(shouldRunOpportunityScan(prior)).toBe(false);
    expect(currentScalpingBucketMinutes()).toBe(11 * 60 + 15);
  });

  it("triggers when the next 5-minute bucket begins", () => {
    vi.setSystemTime(istDate(2026, 7, 24, 11, 20));
    const prior = istDate(2026, 7, 24, 11, 15).toISOString();
    expect(shouldRunOpportunityScan(prior)).toBe(true);
  });
});
