import { describe, expect, it } from "vitest";
import {
  formatByUnit,
  formatPercentValue,
  formatRatioValue,
  formatResearchMetric,
  formatScore,
  roundResearch,
  toFixedTrimmed,
} from "@/lib/format/research-numbers";

describe("research-numbers formatting", () => {
  it("rounds float artifacts away", () => {
    expect(roundResearch(47.800000000000001, 1)).toBe(47.8);
    expect(toFixedTrimmed(47.800000000000001, 1)).toBe("47.8");
    expect(formatPercentValue(47.800000000000001)).toBe("47.8%");
  });

  it("formats scores as whole numbers", () => {
    expect(formatScore(80.8267716535433)).toBe("81");
    expect(formatScore(61.37795275590551)).toBe("61");
    expect(formatScore(62)).toBe("62");
  });

  it("formats percentages to max 1 decimal", () => {
    expect(formatPercentValue(12.345)).toBe("12.3%");
    expect(formatPercentValue(12, { signed: true })).toBe("+12%");
  });

  it("formats ratios to max 2 decimals", () => {
    expect(formatRatioValue(0.683333333)).toBe("0.68x");
    expect(formatRatioValue(18.5)).toBe("18.5x");
  });

  it("formats by unit for multi-year trends", () => {
    expect(formatByUnit(80.8267716535433, "%")).toBe("80.8%");
    expect(formatByUnit(0.683333, "x")).toBe("0.68x");
    expect(formatByUnit(1234.56, "Cr")).toBe("1235 Cr");
  });

  it("cleans embedded metric strings", () => {
    expect(formatResearchMetric("80.8267716535433% ROE")).toBe("80.8% ROE");
    expect(formatResearchMetric("0.683333x D/E")).toBe("0.68x D/E");
    expect(formatResearchMetric(47.800000000000001)).toBe("47.8");
  });
});
