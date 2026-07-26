/**
 * ActionBadge normalization tests.
 */

import { describe, expect, it } from "vitest";
import {
  isActionBadgeValue,
  normalizeActionBadge,
} from "@/components/ui/ActionBadge";

describe("normalizeActionBadge", () => {
  it("maps BUY family", () => {
    expect(normalizeActionBadge("BUY")).toBe("BUY");
    expect(normalizeActionBadge("accumulate")).toBe("BUY");
    expect(normalizeActionBadge("STRONG_BUY")).toBe("BUY");
  });

  it("maps SELL family", () => {
    expect(normalizeActionBadge("SELL")).toBe("SELL");
    expect(normalizeActionBadge("strong_sell")).toBe("SELL");
  });

  it("maps HOLD / watch family", () => {
    expect(normalizeActionBadge("HOLD")).toBe("HOLD");
    expect(normalizeActionBadge("WATCH")).toBe("HOLD");
    expect(normalizeActionBadge("WATCHLIST")).toBe("HOLD");
  });

  it("rejects free-text actions", () => {
    expect(normalizeActionBadge("Reduce exposure")).toBeNull();
    expect(isActionBadgeValue("BUY")).toBe(true);
    expect(isActionBadgeValue("—")).toBe(false);
  });
});
