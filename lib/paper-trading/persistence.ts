/**
 * Paper Trading Lab persistence — disk locally, in-memory on Vercel/serverless.
 */

import fs from "node:fs";
import path from "node:path";
import { isDiskPersistenceEnabled } from "@/lib/platform/runtime-fs";
import type { PaperTradingState } from "@/lib/paper-trading/types";

const DATA_DIR = path.join(process.cwd(), ".data", "paper-trading");
const STATE_FILE = path.join(DATA_DIR, "state.json");

let memoryState: PaperTradingState | null = null;

function ensureDataDir(): boolean {
  if (!isDiskPersistenceEnabled()) return false;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn(
      "[PaperTrading] Disk persistence unavailable; using memory:",
      error instanceof Error ? error.message : error
    );
    return false;
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
  if (!isDiskPersistenceEnabled()) {
    return memoryState ?? createEmptyPaperTradingState();
  }

  if (!ensureDataDir()) {
    return memoryState ?? createEmptyPaperTradingState();
  }

  try {
    if (!fs.existsSync(STATE_FILE)) {
      return memoryState ?? createEmptyPaperTradingState();
    }
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as PaperTradingState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.trades)) {
      return memoryState ?? createEmptyPaperTradingState();
    }
    memoryState = {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      lastSyncAt: parsed.lastSyncAt ?? null,
      trades: parsed.trades ?? [],
      testedRecommendationIds: parsed.testedRecommendationIds ?? [],
    };
    return memoryState;
  } catch {
    return memoryState ?? createEmptyPaperTradingState();
  }
}

export function savePaperTradingState(state: PaperTradingState): void {
  const payload: PaperTradingState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  memoryState = payload;

  if (!isDiskPersistenceEnabled()) return;
  if (!ensureDataDir()) return;

  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.warn(
      "[PaperTrading] savePaperTradingState disk write failed:",
      error instanceof Error ? error.message : error
    );
  }
}
