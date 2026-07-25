/**
 * Sprint 10C — strategy color identity consistency (presentation only).
 */

import { describe, expect, it } from "vitest";
import {
  HORIZON_COLORS,
  horizonAccentStyle,
  horizonCardSurfaceStyle,
  horizonSectionSurfaceStyle,
} from "@/lib/recommendations/horizons/colors";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";

const EXPECTED: Record<
  (typeof INSTITUTIONAL_STRATEGY_IDS)[number],
  { hex: string; identity: string }
> = {
  intraday: { hex: "#1E90FF", identity: "Dodger Blue" },
  swing: { hex: "#FF9800", identity: "Orange" },
  btst: { hex: "#00C896", identity: "Emerald" },
  scalping: { hex: "#8B5CF6", identity: "Purple" },
  short_term: { hex: "#F5B700", identity: "Amber" },
  medium_term: { hex: "#22D3EE", identity: "Cyan" },
  long_term: { hex: "#EF4444", identity: "Crimson" },
};

describe("Sprint 10C strategy color identity", () => {
  it("locks every horizon to the product primary hex", () => {
    for (const id of INSTITUTIONAL_STRATEGY_IDS) {
      expect(HORIZON_COLORS[id].hex).toBe(EXPECTED[id].hex);
      expect(HORIZON_COLORS[id].identity).toBe(EXPECTED[id].identity);
      expect(HORIZON_COLORS[id].wash).toMatch(/^rgba\(/);
    }
  });

  it("exposes CSS variables for card / table surfaces", () => {
    for (const id of INSTITUTIONAL_STRATEGY_IDS) {
      const accent = horizonAccentStyle(id);
      const card = horizonCardSurfaceStyle(id);
      const section = horizonSectionSurfaceStyle(id);
      expect(accent["--strategy-accent" as keyof typeof accent]).toBe(
        HORIZON_COLORS[id].hex
      );
      expect(String(card.backgroundImage)).toContain(
        HORIZON_COLORS[id].rgb
      );
      expect(String(card.backgroundImage)).toContain("0.18");
      expect(String(section.backgroundImage)).toContain(
        HORIZON_COLORS[id].wash
      );
      expect(card.borderColor).toContain(HORIZON_COLORS[id].rgb);
    }
  });
});
