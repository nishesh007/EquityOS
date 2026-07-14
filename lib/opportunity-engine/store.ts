import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
  PostMarketReport,
  ScanHistoryEntry,
  ScanMetrics,
} from "@/lib/opportunity-engine/types";
import { MAX_SCAN_HISTORY } from "@/lib/opportunity-engine/types";
import { getTradingDateKey, isMarketOpen } from "@/lib/market/session";
import {
  archiveOpportunitySnapshot,
  loadPersistedData,
  persistEngineData,
} from "@/lib/opportunity-engine/persistence";
import {
  buildFreshTradingDayState,
  emptyOpportunityCategories,
  isTimestampOnTradingDate,
  resolveStoredTradingDate,
  shouldRolloverTradingDay,
  type TradingDayRolloverResult,
} from "@/lib/opportunity-engine/trading-day";

function createInitialState(tradingDate: string | null = null): OpportunityEngineState {
  return {
    tradingDate,
    lastScannedAt: null,
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: isMarketOpen(),
    scanCount: 0,
    universeSize: 0,
    categories: emptyOpportunityCategories(),
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

  const migratedTradingDate = resolveStoredTradingDate(persisted.state);

  state = {
    ...createInitialState(),
    ...persisted.state,
    tradingDate: migratedTradingDate,
    marketOpen: isMarketOpen(),
    categories: {
      ...emptyOpportunityCategories(),
      ...persisted.state.categories,
    },
    scanHistory: persisted.state.scanHistory ?? [],
    lastScanMetrics: persisted.state.lastScanMetrics ?? null,
  };
  firstDetectedMap = new Map(Object.entries(persisted.firstDetectedMap));
}

/**
 * Detect trading-date changes, archive the previous day snapshot, and clear
 * the active registry so opportunities never mix across sessions.
 */
export function ensureTradingDayLifecycle(
  tradingDate: string = getTradingDateKey()
): TradingDayRolloverResult {
  hydrateFromDisk();

  const previousTradingDate = resolveStoredTradingDate(state);

  if (previousTradingDate == null) {
    state = { ...state, tradingDate };
    persistNow();
    return {
      rolledOver: false,
      initialized: true,
      previousTradingDate: null,
      tradingDate,
    };
  }

  if (!shouldRolloverTradingDay(previousTradingDate, tradingDate)) {
    if (state.tradingDate !== tradingDate) {
      state = { ...state, tradingDate };
      persistNow();
    }
    return {
      rolledOver: false,
      initialized: false,
      previousTradingDate,
      tradingDate,
    };
  }

  archiveOpportunitySnapshot({
    tradingDate: previousTradingDate,
    archivedAt: new Date().toISOString(),
    state: {
      ...state,
      tradingDate: previousTradingDate,
      categories: { ...state.categories },
      scanHistory: [...state.scanHistory],
      lastScanMetrics: state.lastScanMetrics ? { ...state.lastScanMetrics } : null,
      postMarket: state.postMarket,
    },
    firstDetectedMap: Object.fromEntries(firstDetectedMap),
  });

  firstDetectedMap.clear();
  state = buildFreshTradingDayState(tradingDate, isMarketOpen());
  persistNow();

  return {
    rolledOver: true,
    initialized: false,
    previousTradingDate,
    tradingDate,
  };
}

export function getOpportunityEngineState(): OpportunityEngineState {
  hydrateFromDisk();
  ensureTradingDayLifecycle();
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
  ensureTradingDayLifecycle();
  state = { ...state, isScanning };
  persistNow();
}

export function setUniverseSize(size: number): void {
  hydrateFromDisk();
  ensureTradingDayLifecycle();
  state = { ...state, universeSize: size };
  persistNow();
}

export function mergeCategoryResults(
  category: OpportunityCategory,
  candidates: OpportunityCandidate[]
): { added: number; removed: number; updated: number } {
  hydrateFromDisk();
  ensureTradingDayLifecycle();
  const tradingDate = state.tradingDate ?? getTradingDateKey();
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
    const firstDetectedAt =
      existingFirst && isTimestampOnTradingDate(existingFirst, tradingDate)
        ? existingFirst
        : candidate.firstDetectedAt &&
            isTimestampOnTradingDate(candidate.firstDetectedAt, tradingDate)
          ? candidate.firstDetectedAt
          : now;

    firstDetectedMap.set(key, firstDetectedAt);

    const rank = index + 1;
    const previousRank = existing?.rank ?? null;
    if (existing && (existing.aiConvictionScore !== candidate.aiConvictionScore || existing.rank !== rank)) {
      updated += 1;
    }

    return {
      ...candidate,
      rank,
      previousRank,
      firstDetectedAt,
      lastDetectedAt: now,
      lastUpdatedAt: now,
    };
  });

  state = {
    ...state,
    tradingDate,
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
  ensureTradingDayLifecycle();
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
  ensureTradingDayLifecycle();
  const tradingDate = state.tradingDate ?? getTradingDateKey();

  // Never attach a post-market report from a different trading date.
  if (postMarket.sessionDate !== tradingDate) {
    return;
  }

  state = {
    ...state,
    tradingDate,
    isFrozen: true,
    postMarket,
    marketOpen: false,
    nextScanAt: null,
  };
  persistNow();
}

export function unfreezeIfMarketOpen(): void {
  hydrateFromDisk();
  ensureTradingDayLifecycle();
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

export function resetOpportunityStore(options?: { clearHydration?: boolean }): void {
  state = createInitialState();
  firstDetectedMap.clear();
  hydrated = !options?.clearHydration;
  if (hydrated) {
    persistNow();
  }
}

/** Test helper: replace in-memory state without touching disk hydration flags. */
export function __setOpportunityStoreForTests(options: {
  state?: OpportunityEngineState;
  firstDetectedMap?: Record<string, string>;
  skipPersist?: boolean;
}): void {
  hydrated = true;
  if (options.state) {
    state = {
      ...createInitialState(),
      ...options.state,
      categories: {
        ...emptyOpportunityCategories(),
        ...options.state.categories,
      },
    };
  }
  if (options.firstDetectedMap) {
    firstDetectedMap = new Map(Object.entries(options.firstDetectedMap));
  }
  if (!options.skipPersist) {
    persistNow();
  }
}

export function getFirstDetectedMapForTests(): Map<string, string> {
  hydrateFromDisk();
  return new Map(firstDetectedMap);
}

export function clearScanningOnError(): void {
  hydrateFromDisk();
  if (state.isScanning) {
    state = { ...state, isScanning: false };
    persistNow();
  }
}
