/**
 * Historical macro market-reaction repository (Sprint 10D.3).
 * Average NIFTY / BANKNIFTY / INR / bond-yield moves — no prediction logic.
 */

import type {
  MacroHistoricalReaction,
  MacroReactionPoint,
} from "@/types/macro";
import { addDays } from "@/src/core/events/EventFilters";

export interface HistoricalMacroSpec {
  seriesLabel: string;
  meetingCount?: number;
  /** Anchor date of the most recent prior meeting. */
  anchorDate: string;
  /** Days between meetings (approx). */
  spacingDays?: number;
  seed?: number;
}

function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function avg(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** Build a historical reaction series for a recurring macro event. */
export function buildHistoricalMacroReaction(
  spec: HistoricalMacroSpec
): MacroHistoricalReaction {
  const count = spec.meetingCount ?? 8;
  const spacing = spec.spacingDays ?? 45;
  const seed = spec.seed ?? 3;
  const meetings: MacroReactionPoint[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const nifty = round((((seed * 11 + i * 5) % 17) - 8) * 0.18);
    const bank = round(nifty + (((seed + i) % 7) - 3) * 0.12);
    const inr = round((((seed * 3 + i) % 9) - 4) * 0.08);
    const bond = round((((seed * 5 + i * 2) % 11) - 5) * 1.4);
    meetings.push({
      label: `Meeting ${count - i}`,
      date: addDays(spec.anchorDate, -(i + 1) * spacing),
      niftyMovePct: nifty,
      bankNiftyMovePct: bank,
      inrMovePct: inr,
      bondYieldMoveBps: bond,
    });
  }

  return {
    seriesLabel: spec.seriesLabel,
    meetings,
    averages: {
      niftyMovePct: avg(meetings.map((m) => m.niftyMovePct)),
      bankNiftyMovePct: avg(meetings.map((m) => m.bankNiftyMovePct)),
      inrMovePct: avg(meetings.map((m) => m.inrMovePct)),
      bondYieldMoveBps: avg(meetings.map((m) => m.bondYieldMoveBps)),
    },
  };
}

export function getHistoricalMacroBySeries(
  seriesLabel: string,
  today: string,
  seed = 3
): MacroHistoricalReaction {
  return buildHistoricalMacroReaction({
    seriesLabel,
    anchorDate: today,
    seed,
  });
}

export const historicalMacroRepository = {
  build: buildHistoricalMacroReaction,
  getBySeries: getHistoricalMacroBySeries,
};
