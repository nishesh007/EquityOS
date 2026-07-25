import { describe, expect, it } from "vitest";
import {
  isParticipationCoverageSufficient,
  minParticipationSampleSize,
} from "@/lib/market-breadth/participation";
import {
  deriveOpportunityUiPhase,
  opportunityPhaseCopy,
} from "@/lib/opportunity-engine/ui-phase";

describe("participation coverage gate", () => {
  it("rejects tiny partial samples on a large universe", () => {
    expect(
      isParticipationCoverageSufficient({ sampleSize: 2, universeSize: 2000 })
    ).toBe(false);
    expect(minParticipationSampleSize(2000)).toBe(60);
  });

  it("accepts a complete technical sample", () => {
    expect(
      isParticipationCoverageSufficient({ sampleSize: 60, universeSize: 2000 })
    ).toBe(true);
  });

  it("scales the floor for small universes", () => {
    expect(minParticipationSampleSize(40)).toBe(20);
    expect(
      isParticipationCoverageSufficient({ sampleSize: 20, universeSize: 40 })
    ).toBe(true);
  });

  it("treats mid-sample as incomplete for the full gate (UI may still show provisional)", () => {
    expect(
      isParticipationCoverageSufficient({ sampleSize: 24, universeSize: 2000 })
    ).toBe(false);
    expect(minParticipationSampleSize(2000)).toBe(60);
  });
});

describe("opportunity UI phase", () => {
  it("only uses empty copy after a completed zero scan", () => {
    expect(
      deriveOpportunityUiPhase({
        isScanning: false,
        lastScannedAt: null,
        scanCount: 0,
        recommendationCount: 0,
      })
    ).toBe("initializing");

    expect(
      deriveOpportunityUiPhase({
        isScanning: false,
        lastScannedAt: "2026-07-24T10:00:00.000Z",
        scanCount: 1,
        recommendationCount: 0,
      })
    ).toBe("empty");

    expect(opportunityPhaseCopy("empty").title).toBe("No active opportunities");
    expect(opportunityPhaseCopy("queued").title).toBe("Scan queued");
    expect(opportunityPhaseCopy("running").title).toBe("Scan running");
  });
});
