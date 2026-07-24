/**
 * Persist last usable market-breadth snapshot per universe.
 * Used as previous-session fallback when the in-memory cache is cold.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MarketBreadth } from "@/types";
import type { BreadthUniverseId } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "market-breadth");
const SNAPSHOT_FILE = path.join(DATA_DIR, "last-breadth.json");

interface SnapshotStore {
  version: 1;
  byUniverse: Partial<Record<BreadthUniverseId, MarketBreadth>>;
}

function readStore(): SnapshotStore {
  try {
    if (!existsSync(SNAPSHOT_FILE)) {
      return { version: 1, byUniverse: {} };
    }
    const raw = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as Partial<SnapshotStore>;
    return {
      version: 1,
      byUniverse: raw.byUniverse ?? {},
    };
  } catch {
    return { version: 1, byUniverse: {} };
  }
}

function writeStore(store: SnapshotStore): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(store), "utf8");
  } catch {
    /* degrade gracefully — live / memory cache still work */
  }
}

export function readLastBreadthSnapshot(
  universe: BreadthUniverseId
): MarketBreadth | null {
  const hit = readStore().byUniverse[universe];
  return hit ?? null;
}

export function writeLastBreadthSnapshot(
  universe: BreadthUniverseId,
  breadth: MarketBreadth
): void {
  const store = readStore();
  store.byUniverse[universe] = breadth;
  writeStore(store);
}
