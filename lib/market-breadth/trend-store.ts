/**
 * Persist daily breadth % for 5d / 20d trends (file-backed, server-only).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BreadthTrendPoint, BreadthUniverseId } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "market-breadth");
const TREND_FILE = path.join(DATA_DIR, "breadth-trend.json");

interface TrendStore {
  version: 1;
  series: Partial<
    Record<BreadthUniverseId, BreadthTrendPoint[]>
  >;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): TrendStore {
  try {
    if (!existsSync(TREND_FILE)) return { version: 1, series: {} };
    const raw = JSON.parse(readFileSync(TREND_FILE, "utf8")) as TrendStore;
    return raw?.version === 1 ? raw : { version: 1, series: {} };
  } catch {
    return { version: 1, series: {} };
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
