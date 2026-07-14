/**
 * Dashboard display-value helpers — UI integrity tests.
 */

import { describe, expect, it } from "vitest";
import {
  daysUntilDateKey,
  formatDaysUntilLabel,
  formatOptionalText,
  formatScoreDisplay,
  hasValidationActivity,
} from "@/lib/dashboard/display-value";
import {
  CATEGORY_EMPTY_HEADLINE,
  CATEGORY_EMPTY_NOTE,
} from "@/lib/opportunity-engine/presentation";

describe("formatScoreDisplay", () => {
  it("never shows misleading zero without engine activity", () => {
    expect(formatScoreDisplay(0)).toBe("Collecting...");
    expect(formatScoreDisplay(0, { hasActivity: false })).toBe("Collecting...");
    expect(formatScoreDisplay(null, { hasActivity: false })).toBe("Collecting...");
    expect(formatScoreDisplay(undefined)).toBe("Unavailable");
  });

  it("shows numeric values only when activity produced them", () => {
    expect(formatScoreDisplay(88, { hasActivity: true })).toBe("88");
    expect(formatScoreDisplay(0, { hasActivity: true })).toBe("0");
    expect(formatScoreDisplay(72, { hasActivity: false })).toBe("N/A");
  });
});

describe("hasValidationActivity", () => {
  it("detects real engine activity", () => {
    expect(hasValidationActivity({ totalValidations: 0, totalCalculations: 0 })).toBe(
      false
    );
    expect(hasValidationActivity({ totalValidations: 3 })).toBe(true);
    expect(hasValidationActivity({ decisionTraces: 1 })).toBe(true);
  });
});

describe("empty opportunity copy", () => {
  it("uses richer institutional empty state copy", () => {
    expect(CATEGORY_EMPTY_HEADLINE).toBe(
      "No candidates matched today's institutional criteria."
    );
    expect(CATEGORY_EMPTY_NOTE).toContain("relaxed once");
    expect(CATEGORY_EMPTY_NOTE).toContain("Next scheduled scan");
  });
});

describe("upcoming results countdown", () => {
  it("formats T-minus and in-days labels from trading date", () => {
    const now = new Date("2026-07-14T06:00:00.000Z"); // ~11:30 IST
    expect(daysUntilDateKey("2026-07-17", now)).toBe(3);
    expect(formatDaysUntilLabel(3)).toBe("In 3 Days");
    expect(formatDaysUntilLabel(-3)).toBe("T-3 Days");
    expect(formatDaysUntilLabel(0)).toBe("Today");
  });
});

describe("optional text", () => {
  it("maps blanks and dashes to N/A", () => {
    expect(formatOptionalText(null)).toBe("N/A");
    expect(formatOptionalText("—")).toBe("N/A");
    expect(formatOptionalText("Live")).toBe("Live");
  });
});
