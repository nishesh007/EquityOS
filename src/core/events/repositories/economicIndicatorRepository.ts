/**
 * Economic indicator factory (Sprint 10D.3).
 * Builds Actual / Forecast / Consensus / Previous series for macro events.
 */

import type {
  EconomicIndicator,
  HistoricalReading,
} from "@/types/macro";
import { addDays } from "@/src/core/events/EventFilters";

export interface IndicatorSpec {
  unit: string;
  dataSource: string;
  /** Anchor value for previous print. */
  previous: number;
  forecast?: number | null;
  consensus?: number | null;
  actual?: number | null;
  revision?: number | null;
  historicalAverage?: number | null;
  historicalHigh?: number | null;
  historicalLow?: number | null;
  /** How many prior readings to synthesise (default 8). */
  historyCount?: number;
  /** Step between historical prints. */
  historyStep?: number;
  /** Anchor date for the most recent historical reading. */
  historyAnchorDate?: string;
  historyFrequencyDays?: number;
}

function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Build a typed economic indicator payload. */
export function buildEconomicIndicator(spec: IndicatorSpec): EconomicIndicator {
  const previous = spec.previous;
  const forecast = spec.forecast ?? round(previous + 0.1);
  const consensus = spec.consensus ?? forecast;
  const actual = spec.actual ?? null;
  const high = spec.historicalHigh ?? round(previous + Math.abs(previous) * 0.18 + 0.4);
  const low = spec.historicalLow ?? round(previous - Math.abs(previous) * 0.14 - 0.2);
  const avg =
    spec.historicalAverage ??
    round((previous + forecast + (actual ?? previous)) / 3);

  return {
    actual,
    forecast,
    consensus,
    previous,
    revision: spec.revision ?? null,
    unit: spec.unit,
    historicalAverage: avg,
    historicalHigh: high,
    historicalLow: low,
    dataSource: spec.dataSource,
  };
}

/** Synthesise prior prints for trend visualisation. */
export function buildHistoricalReadings(
  spec: IndicatorSpec,
  seed = 1
): HistoricalReading[] {
  const count = spec.historyCount ?? 8;
  const step = spec.historyStep ?? 0.15;
  const freq = spec.historyFrequencyDays ?? 30;
  const anchor = spec.historyAnchorDate ?? "2026-06-01";
  const base = spec.previous;
  const readings: HistoricalReading[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const wobble = ((seed * 7 + i * 3) % 9) - 4;
    const actual = round(base - i * step + wobble * 0.05);
    const forecast = round(actual + (((seed + i) % 5) - 2) * 0.08);
    readings.push({
      label: `T-${i === 0 ? "prev" : String(i)}`,
      date: addDays(anchor, -(i + 1) * freq),
      actual,
      forecast,
    });
  }

  return readings;
}

export const economicIndicatorRepository = {
  build: buildEconomicIndicator,
  history: buildHistoricalReadings,
};
