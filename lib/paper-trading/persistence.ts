/**
 * Paper Trading Lab — filesystem persistence under `.data/paper-trading/`.
 */

import fs from "node:fs";
import path from "node:path";
import type { PaperTradingState } from "@/lib/paper-trading/types";

const DATA_DIR = path.join(process.cwd(), ".data", "paper-trading");
const STATE_FILE = path.join(DATA_DIR, "state.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function createEmptyPaperTradingState(
  now = new Date()
): PaperTradingState {
  return {
    version: 1,
    updatedAt: now.toISOString(),
    lastSyncAt: null,
    trades: [],
    testedRecommendationIds: [],
  };
}

export function loadPaperTradingState(): PaperTradingState {
  ensureDataDir();
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return createEmptyPaperTradingState();
    }
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as PaperTradingState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.trades)) {
      return createEmptyPaperTradingState();
    }
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      lastSyncAt: parsed.lastSyncAt ?? null,
      trades: parsed.trades ?? [],
      testedRecommendationIds: parsed.testedRecommendationIds ?? [],
    };
  } catch {
    return createEmptyPaperTradingState();
  }
}

export function savePaperTradingState(state: PaperTradingState): void {
  ensureDataDir();
  const payload: PaperTradingState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
}
