/**
 * Persist daily breadth % and EMA participation for trends (file-backed, server-only).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  BreadthTrendPoint,
  BreadthUniverseId,
  ParticipationTrendPoint,
  TrendDirection,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "market-breadth");
const TREND_FILE = path.join(DATA_DIR, "breadth-trend.json");

interface TrendStore {
  version: 2;
  series: Partial<Record<BreadthUniverseId, BreadthTrendPoint[]>>;
  participation: Partial<
    Record<BreadthUniverseId, ParticipationTrendPoint[]>
  >;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): TrendStore {
  try {
    if (!existsSync(TREND_FILE)) {
      return { version: 2, series: {}, participation: {} };
    }
    const raw = JSON.parse(readFileSync(TREND_FILE, "utf8")) as Partial<TrendStore> & {
      version?: number;
      series?: TrendStore["series"];
    };
    return {
      version: 2,
      series: raw.series ?? {},
      participation: raw.participation ?? {},
    };
  } catch {
    return { version: 2, series: {}, participation: {} };
  }
}

function writeStore(store: TrendStore): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(TREND_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch {
    /* ignore persistence failures — trends degrade gracefully */
  }
}

export function recordBreadthTrend(
  universe: BreadthUniverseId,
  breadthPercent: number,
  netAdvances: number
): { trend5d: BreadthTrendPoint[]; trend20d: BreadthTrendPoint[] } {
  const store = readStore();
  const day = todayKey();
  const existing = store.series[universe] ?? [];
  const withoutToday = existing.filter((point) => point.date !== day);
  const next = [
    ...withoutToday,
    { date: day, breadthPercent, netAdvances },
  ].slice(-60);
  store.series[universe] = next;
  writeStore(store);
  return {
    trend5d: next.slice(-5),
    trend20d: next.slice(-20),
  };
}

export function readBreadthTrend(universe: BreadthUniverseId): {
  trend5d: BreadthTrendPoint[];
  trend20d: BreadthTrendPoint[];
} {
  const series = readStore().series[universe] ?? [];
  return {
    trend5d: series.slice(-5),
    trend20d: series.slice(-20),
  };
}

function trendFromValues(
  current: number | null,
  previous: number | null
): TrendDirection {
  if (current == null || previous == null) return "unknown";
  const delta = current - previous;
  if (Math.abs(delta) < 1) return "flat";
  return delta > 0 ? "up" : "down";
}

export function recordParticipationTrend(
  universe: BreadthUniverseId,
  point: Omit<ParticipationTrendPoint, "date">
): {
  aboveEma20Trend: TrendDirection;
  aboveEma50Trend: TrendDirection;
  aboveEma200Trend: TrendDirection;
} {
  const store = readStore();
  const day = todayKey();
  const existing = store.participation[universe] ?? [];
  const previous = [...existing].reverse().find((p) => p.date !== day) ?? null;
  const withoutToday = existing.filter((p) => p.date !== day);
  const nextPoint: ParticipationTrendPoint = { date: day, ...point };
  store.participation[universe] = [...withoutToday, nextPoint].slice(-60);
  writeStore(store);

  return {
    aboveEma20Trend: trendFromValues(
      point.aboveEma20Pct,
      previous?.aboveEma20Pct ?? null
    ),
    aboveEma50Trend: trendFromValues(
      point.aboveEma50Pct,
      previous?.aboveEma50Pct ?? null
    ),
    aboveEma200Trend: trendFromValues(
      point.aboveEma200Pct,
      previous?.aboveEma200Pct ?? null
    ),
  };
}
