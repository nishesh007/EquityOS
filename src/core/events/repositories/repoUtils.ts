/**
 * Shared helpers for Event Intelligence repositories (Sprint 10D.2).
 */

import { DEFAULT_EVENT_TIMEZONE } from "@/constants/eventTypes";
import { addDays, toDateKey } from "@/src/core/events/EventFilters";
import type { EventIntelligenceEvent, EventStatus } from "@/types/event";
import type {
  BeatMissResult,
  EarningsHistoricalPerformance,
  QuarterlyHistoryPoint,
} from "@/types/earnings";

export function stamp(base: string): { createdAt: string; updatedAt: string } {
  return {
    createdAt: `${base}T00:00:00.000Z`,
    updatedAt: `${base}T00:00:00.000Z`,
  };
}

export function resolveEventStatus(
  date: string,
  today: string,
  opts?: { live?: boolean }
): EventStatus {
  if (opts?.live && date === today) return "live";
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  if (date < today) return "completed";
  return "upcoming";
}

export function tz(): string {
  return DEFAULT_EVENT_TIMEZONE;
}

export function buildQuarterHistory(
  baseLabel: string,
  seed: number
): EarningsHistoricalPerformance {
  const quarters: QuarterlyHistoryPoint[] = [];
  let beats = 0;
  let misses = 0;
  let inlines = 0;
  let surpriseSum = 0;

  for (let i = 7; i >= 0; i -= 1) {
    const qIndex = ((seed + i) % 4) + 1;
    const fy = 2025 + Math.floor((seed + (7 - i)) / 4);
    const surprise = Number((((seed * 17 + i * 3) % 21) - 8) / 10);
    let result: BeatMissResult = "inline";
    if (surprise > 0.4) {
      result = "beat";
      beats += 1;
    } else if (surprise < -0.4) {
      result = "miss";
      misses += 1;
    } else {
      inlines += 1;
    }
    surpriseSum += surprise;
    quarters.push({
      label: `Q${qIndex} FY${String(fy).slice(2)}`,
      quarter: `Q${qIndex}` as QuarterlyHistoryPoint["quarter"],
      financialYear: `FY${fy}`,
      revenueCr: Math.round(8000 + seed * 400 + i * 180 + surprise * 120),
      eps: Number((18 + seed * 0.8 + i * 0.35 + surprise).toFixed(2)),
      surprisePct: Number(surprise.toFixed(2)),
      result,
      resultDate: toDateKey(
        new Date(2024 + Math.floor(i / 4), (i % 4) * 3, 12 + (seed % 5))
      ),
    });
  }

  return {
    quarters,
    averageSurprisePct: Number((surpriseSum / quarters.length).toFixed(2)),
    beatCount: beats,
    missCount: misses,
    inlineCount: inlines,
    postResultMove: {
      day1Pct: Number((((seed % 9) - 4) * 0.55).toFixed(2)),
      day3Pct: Number((((seed % 11) - 5) * 0.7).toFixed(2)),
      day5Pct: Number((((seed % 13) - 6) * 0.85).toFixed(2)),
      day10Pct: Number((((seed % 15) - 7) * 0.95).toFixed(2)),
      averageVolatilityPct: Number((1.8 + (seed % 5) * 0.35).toFixed(2)),
    },
  };
}

export type CatalogBuilder = (
  today: string
) => EventIntelligenceEvent[];
