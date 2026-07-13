import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
  PostMarketReport,
  ScanHistoryEntry,
  ScanMetrics,
} from "@/lib/opportunity-engine/types";
import { MAX_SCAN_HISTORY, OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import { isMarketOpen } from "@/lib/market/session";
import {
  loadPersistedData,
  persistEngineData,
} from "@/lib/opportunity-engine/persistence";

function emptyCategories(): Record<OpportunityCategory, OpportunityCandidate[]> {
  return OPPORTUNITY_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {} as Record<OpportunityCategory, OpportunityCandidate[]>
  );
}

function createInitialState(): OpportunityEngineState {
  return {
    lastScannedAt: null,
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: isMarketOpen(),
    scanCount: 0,
    universeSize: 0,
    categories: emptyCategories(),
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

let state: OpportunityEngineState = createInitialState();
let firstDetectedMap = new Map<string, string>();
let hydrated = false;

function candidateKey(symbol: string, category: OpportunityCategory): string {
  return `${symbol.toUpperCase()}:${category}`;
}

function persistNow(): void {
  persistEngineData({
    state,
    firstDetectedMap: Object.fromEntries(firstDetectedMap),
  });
}

function hydrateFromDisk(): void {
  if (hydrated) return;
  hydrated = true;

  const persisted = loadPersistedData();
  if (!persisted) return;

  state = {
    ...createInitialState(),
    ...persisted.state,
    marketOpen: isMarketOpen(),
    categories: {
      ...emptyCategories(),
      ...persisted.state.categories,
    },
    scanHistory: persisted.state.scanHistory ?? [],
    lastScanMetrics: persisted.state.lastScanMetrics ?? null,
  };
  firstDetectedMap = new Map(Object.entries(persisted.firstDetectedMap));
}

export function getOpportunityEngineState(): OpportunityEngineState {
  hydrateFromDisk();
  return {
    ...state,
    marketOpen: isMarketOpen(),
    categories: { ...state.categories },
    scanHistory: [...state.scanHistory],
    lastScanMetrics: state.lastScanMetrics ? { ...state.lastScanMetrics } : null,
  };
}

export function setScanning(isScanning: boolean): void {
  hydrateFromDisk();
  state = { ...state, isScanning };
  persistNow();
}

export function setUniverseSize(size: number): void {
  hydrateFromDisk();
  state = { ...state, universeSize: size };
  persistNow();
}

export function mergeCategoryResults(
  category: OpportunityCategory,
  candidates: OpportunityCandidate[]
): { added: number; removed: number; updated: number } {
  hydrateFromDisk();
  const now = new Date().toISOString();
  const previous = state.categories[category];
  const previousBySymbol = new Map(
    previous.map((candidate) => [candidate.symbol.toUpperCase(), candidate])
  );
  const previousSymbols = new Set(previous.map((c) => c.symbol.toUpperCase()));
  const nextSymbols = new Set(candidates.map((c) => c.symbol.toUpperCase()));

  let added = 0;
  for (const symbol of nextSymbols) {
    if (!previousSymbols.has(symbol)) added += 1;
  }
  const removed = [...previousSymbols].filter((s) => !nextSymbols.has(s)).length;

  let updated = 0;
  const merged = candidates.map((candidate, index) => {
    const symbol = candidate.symbol.toUpperCase();
    const key = candidateKey(candidate.symbol, category);
    const existing = previousBySymbol.get(symbol);
    const existingFirst = firstDetectedMap.get(key);

    if (!existingFirst) {
      firstDetectedMap.set(key, candidate.firstDetectedAt || now);
    }

    const rank = index + 1;
    const previousRank = existing?.rank ?? null;
    if (existing && (existing.aiConvictionScore !== candidate.aiConvictionScore || existing.rank !== rank)) {
      updated += 1;
    }

    return {
      ...candidate,
      rank,
      previousRank,
      firstDetectedAt: existingFirst ?? candidate.firstDetectedAt ?? now,
      lastDetectedAt: now,
      lastUpdatedAt: now,
    };
  });

  state = {
    ...state,
    categories: {
      ...state.categories,
      [category]: merged,
    },
  };
  persistNow();

  return { added, removed, updated };
}

export function finalizeScan(
  nextScanAt: string | null,
  scanMetrics: Omit<ScanMetrics, "scannedAt"> & { scannedAt?: string }
): void {
  hydrateFromDisk();
  const scannedAt = scanMetrics.scannedAt ?? new Date().toISOString();
  const nextScanCount = state.scanCount + 1;

  const historyEntry: ScanHistoryEntry = {
    scannedAt,
    durationMs: scanMetrics.durationMs,
    symbolsScanned: scanMetrics.symbolsScanned,
    added: scanMetrics.added,
    removed: scanMetrics.removed,
    updated: scanMetrics.updated,
    scanCount: nextScanCount,
  };

  state = {
    ...state,
    lastScannedAt: scannedAt,
    nextScanAt,
    isScanning: false,
    scanCount: nextScanCount,
    marketOpen: isMarketOpen(),
    lastScanMetrics: {
      durationMs: scanMetrics.durationMs,
      symbolsScanned: scanMetrics.symbolsScanned,
      added: scanMetrics.added,
      removed: scanMetrics.removed,
      updated: scanMetrics.updated,
      scannedAt,
    },
    scanHistory: [historyEntry, ...state.scanHistory].slice(0, MAX_SCAN_HISTORY),
  };
  persistNow();
}

export function freezeScan(postMarket: PostMarketReport): void {
  hydrateFromDisk();
  state = {
    ...state,
    isFrozen: true,
    postMarket,
    marketOpen: false,
    nextScanAt: null,
  };
  persistNow();
}

export function unfreezeIfMarketOpen(): void {
  hydrateFromDisk();
  if (isMarketOpen() && state.isFrozen) {
    state = {
      ...state,
      isFrozen: false,
      postMarket: null,
      marketOpen: true,
    };
    persistNow();
  }
}

export function resetOpportunityStore(): void {
  state = createInitialState();
  firstDetectedMap.clear();
  hydrated = true;
  persistNow();
}

export function clearScanningOnError(): void {
  hydrateFromDisk();
  if (state.isScanning) {
    state = { ...state, isScanning: false };
    persistNow();
  }
}
