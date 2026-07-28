import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  __resetMarketStateManagerForTests,
  buildModuleFreshness,
  ensureSessionAlignment,
  getCurrentTradingSessionId,
  getMarketCloseTimeForSession,
  isSessionCurrent,
  isTimestampInCurrentSession,
  tradingSessionFromTimestamp,
} from "@/lib/market/market-state-manager";

describe("MarketStateManager", () => {
  beforeEach(() => {
    __resetMarketStateManagerForTests();
    vi.useRealTimers();
  });

  it("uses NSE trading session id YYYY-MM-DD", () => {
    const monday = new Date("2026-07-27T10:00:00+05:30");
    expect(getCurrentTradingSessionId(monday)).toBe("2026-07-27");
  });

  it("on Saturday maps to previous Friday session", () => {
    const saturday = new Date("2026-07-25T10:00:00+05:30");
    expect(getCurrentTradingSessionId(saturday)).toBe("2026-07-24");
  });

  it("detects session mismatch", () => {
    const now = new Date("2026-07-28T10:00:00+05:30");
    expect(isSessionCurrent("2026-07-27", now)).toBe(false);
    expect(isSessionCurrent("2026-07-28", now)).toBe(true);
  });

  it("maps timestamps to trading session", () => {
    const iso = "2026-07-27T10:00:00.000Z";
    expect(tradingSessionFromTimestamp(iso)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds module freshness with age and close time", () => {
    const now = new Date("2026-07-28T12:00:00+05:30");
    const freshness = buildModuleFreshness({
      sessionDate: "2026-07-28",
      generatedAt: "2026-07-28T06:00:00.000Z",
      now,
    });
    expect(freshness.sessionDate).toBe("2026-07-28");
    expect(freshness.marketCloseTime).toBe(
      getMarketCloseTimeForSession("2026-07-28")
    );
    expect(freshness.ageMinutes).toBeGreaterThanOrEqual(0);
  });

  it("invalidates when cached session is older", () => {
    const invalidated = ensureSessionAlignment("2026-07-27", new Date("2026-07-28T09:00:00+05:30"));
    expect(invalidated).toBe(true);
    const again = ensureSessionAlignment("2026-07-28", new Date("2026-07-28T09:00:00+05:30"));
    expect(again).toBe(false);
  });

  it("rejects prior-session breadth timestamps", () => {
    const now = new Date("2026-07-28T10:00:00+05:30");
    expect(
      isTimestampInCurrentSession("2026-07-27T10:00:00.000Z", now)
    ).toBe(false);
    expect(
      isTimestampInCurrentSession("2026-07-28T04:00:00.000Z", now)
    ).toBe(true);
  });
});
