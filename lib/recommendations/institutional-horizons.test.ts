import { describe, expect, it } from "vitest";
import {
  ensureThreeTargets,
  INSTITUTIONAL_HOLDING_PERIODS,
  isHoldingPeriodConsistentWithHorizon,
  resolveInstitutionalHoldingPeriod,
} from "@/lib/recommendations/institutional-horizons";
import { buildTradeLevels } from "@/lib/opportunity-engine/levels";

describe("ensureThreeTargets", () => {
  it("preserves three distinct strategy targets", () => {
    const targets = ensureThreeTargets({
      action: "BUY",
      entry: 100,
      stopLoss: 95,
      targets: [110, 116, 122],
    });
    expect(targets).toEqual([110, 116, 122]);
  });

  it("synthesizes Target 3 when finalTarget collapsed into Target 2", () => {
    const targets = ensureThreeTargets({
      action: "BUY",
      entry: 100,
      stopLoss: 95,
      targets: [110, 116, 116],
    });
    expect(targets).toHaveLength(3);
    expect(targets[0]).toBe(110);
    expect(targets[1]).toBe(116);
    expect(targets[2]).toBeGreaterThan(116);
  });

  it("builds a full BUY ladder from a single target", () => {
    const targets = ensureThreeTargets({
      action: "BUY",
      entry: 100,
      stopLoss: 95,
      targets: [110],
    });
    expect(targets).toHaveLength(3);
    expect(targets[0]).toBe(110);
    expect(targets[1]).toBeGreaterThan(targets[0]);
    expect(targets[2]).toBeGreaterThan(targets[1]);
  });

  it("builds a descending SELL ladder", () => {
    const targets = ensureThreeTargets({
      action: "SELL",
      entry: 100,
      stopLoss: 106,
      targets: [94, 90],
    });
    expect(targets).toHaveLength(3);
    expect(targets[0]).toBe(94);
    expect(targets[1]).toBe(90);
    expect(targets[2]).toBeLessThan(90);
  });
});

describe("institutional holding periods", () => {
  it("returns the canonical horizon for every strategy slot", () => {
    expect(resolveInstitutionalHoldingPeriod("scalping")).toBe("5–30 minutes");
    expect(resolveInstitutionalHoldingPeriod("intraday")).toBe(
      "30 minutes – market close"
    );
    expect(resolveInstitutionalHoldingPeriod("btst")).toBe("1–3 trading days");
    expect(resolveInstitutionalHoldingPeriod("swing")).toBe(
      "5–20 trading days"
    );
    expect(resolveInstitutionalHoldingPeriod("short_term")).toBe("1–3 months");
    expect(resolveInstitutionalHoldingPeriod("medium_term")).toBe(
      "3–12 months"
    );
    expect(resolveInstitutionalHoldingPeriod("long_term")).toBe("12+ months");
  });

  it("flags legacy swing week-based labels as inconsistent", () => {
    expect(
      isHoldingPeriodConsistentWithHorizon("swing", "2–8 weeks")
    ).toBe(false);
    expect(
      isHoldingPeriodConsistentWithHorizon(
        "swing",
        INSTITUTIONAL_HOLDING_PERIODS.swing
      )
    ).toBe(true);
  });
});

describe("buildTradeLevels Target 3", () => {
  it("emits three ordered long targets for every category", () => {
    const categories = [
      "intraday",
      "swing",
      "breakout",
      "momentum",
      "relative_volume",
      "mean_reversion",
      "ai_high_conviction",
    ] as const;

    for (const category of categories) {
      const levels = buildTradeLevels(100, "Long", category, 2);
      expect(levels.target1).toBeGreaterThan(100);
      expect(levels.target2).toBeGreaterThan(levels.target1);
      expect(levels.target3).toBeGreaterThan(levels.target2);
      expect(levels.timeHorizon).toBeTruthy();
    }
  });
});
