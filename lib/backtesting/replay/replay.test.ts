import { describe, expect, it } from "vitest";
import {
  buildReplayBundle,
  fingerprintReplayBundle,
  listDemoReplayBundles,
  sliceReplayVisibleState,
} from "@/lib/backtesting/replay";

describe("historical replay engine", () => {
  it("is deterministic for the same demo session", () => {
    const [first] = listDemoReplayBundles();
    const rebuilt = buildReplayBundle({
      session: first.session,
      dataset: first.dataset,
    });
    expect(fingerprintReplayBundle(rebuilt)).toBe(
      fingerprintReplayBundle(first)
    );
  });

  it("never leaks future candles, events, or markers", () => {
    const bundle = listDemoReplayBundles()[0];
    const mid = Math.floor(bundle.steps.length / 2);
    const visible = sliceReplayVisibleState(bundle, mid);

    expect(visible.visibleBars.length).toBe(mid + 1);
    expect(
      visible.visibleBars.every(
        (bar) => bar.timestamp <= (visible.asOf as string)
      )
    ).toBe(true);

    expect(
      visible.visibleMarkers.every((marker) => marker.barIndex <= mid)
    ).toBe(true);

    expect(
      visible.visibleEvents.every(
        (event) => event.at <= (visible.asOf as string)
      )
    ).toBe(true);

    expect(
      visible.visibleCorporateActions.every(
        (action) => action.exDate <= (visible.asOf as string)
      )
    ).toBe(true);

    expect(
      visible.recommendationTimeline.every(
        (rec) => rec.asOf <= (visible.asOf as string)
      )
    ).toBe(true);

    // Full history is longer than the sliced view until the final cursor.
    expect(bundle.steps.length).toBeGreaterThan(visible.visibleBars.length);
  });

  it("shows recommendation snapshot only after signal time", () => {
    const bundle = listDemoReplayBundles()[0];
    const signalAsOf = bundle.dataset.recommendations[0].asOf;
    const beforeIdx = bundle.steps.findIndex((s) => s.asOf >= signalAsOf) - 1;
    if (beforeIdx >= 0) {
      const before = sliceReplayVisibleState(bundle, beforeIdx);
      expect(before.activeRecommendation).toBeNull();
    }
    const atIdx = bundle.steps.findIndex((s) => s.asOf >= signalAsOf);
    const at = sliceReplayVisibleState(bundle, atIdx);
    expect(at.activeRecommendation?.recommendationId).toBe(
      bundle.dataset.recommendations[0].recommendationId
    );
  });
});
