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
  ensurePersistedDataHydrated,
  loadArchivedOpportunitySnapshot,
  loadPersistedData,
  persistEngineData,
} from "@/lib/opportunity-engine/persistence";
import { countCategoryCandidates } from "@/lib/opportunity-engine/pipeline-telemetry";
import {
  replayRecommendation,
  syncRecommendationMemory,
  transitionRecommendation,
} from "@/lib/opportunity-engine/recommendation-memory";
import type { RecommendationRecordStatus } from "@/lib/opportunity-engine/types";
import { recordPersistenceWrite } from "@/lib/opportunity-engine/scheduler-observability";
import {
  buildFreshTradingDayState,
  emptyOpportunityCategories,
  isTimestampOnTradingDate,
  resolveStoredTradingDate,
  shouldRolloverTradingDay,
  type TradingDayRolloverResult,
} from "@/lib/opportunity-engine/trading-day";
import { getISTDateKey } from "@/lib/market/session";

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
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
    pipeline: null,
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
  recordPersistenceWrite();
}

function applyPersistedData(persisted: NonNullable<ReturnType<typeof loadPersistedData>>): void {
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
    recommendations: persisted.state.recommendations ?? [],
    scanHistory: persisted.state.scanHistory ?? [],
    lastScanMetrics: persisted.state.lastScanMetrics ?? null,
    pipeline: persisted.state.pipeline ?? null,
  };
  firstDetectedMap = new Map(Object.entries(persisted.firstDetectedMap));

  // One-time migration for state files created before permanent
  // recommendation memory existed.
  if (
    state.recommendations.length === 0 &&
    Object.values(state.categories).some((candidates) => candidates.length > 0)
  ) {
    state = {
      ...state,
      recommendations: syncRecommendationMemory(
        state,
        state.lastScannedAt ?? new Date().toISOString()
      ),
    };
    persistNow();
  }
}

function storeLooksEmpty(): boolean {
  return (
    countCategoryCandidates(state.categories) === 0 &&
    (state.recommendations?.length ?? 0) === 0
  );
}

function hydrateFromDisk(): void {
  if (hydrated) return;
  hydrated = true;

  const persisted = loadPersistedData();
  if (!persisted) return;
  applyPersistedData(persisted);
}

/**
 * Ensure sync + remote persistence layers are loaded into the in-memory store.
 * Call from API / RSC before reading recommendations on serverless.
 */
export async function ensureOpportunityEngineHydrated(options?: {
  /** Re-apply persisted payload even if the process store is already warm. */
  forceReload?: boolean;
}): Promise<OpportunityEngineState> {
  const persisted = await ensurePersistedDataHydrated();
  if (!hydrated) {
    hydrateFromDisk();
  } else if (persisted && options?.forceReload) {
    applyPersistedData(persisted);
  } else if (
    persisted &&
    storeLooksEmpty() &&
    countCategoryCandidates(persisted.state.categories) > 0
  ) {
    applyPersistedData(persisted);
  }
  ensureTradingDayLifecycle();
  return getOpportunityEngineState();
}

/** Test/seed helper — drop process-local store so the next hydrate reloads. */
export function resetOpportunityEngineStoreForTests(): void {
  state = createInitialState();
  firstDetectedMap = new Map();
  hydrated = false;
}

/**
 * Detect trading-date changes, archive the previous day snapshot, and open a
 * new trading-day registry.
 *
 * IMPORTANT: Do NOT wipe the last successful recommendation set on rollover.
 * Carry categories forward as a stale bridge until today's first successful
 * scan replaces them. Wiping here is what made recommendations disappear at
 * market open (09:15) before any live scan completed.
 */
export function ensureTradingDayLifecycle(
  tradingDate: string = getTradingDateKey()
): TradingDayRolloverResult {
  hydrateFromDisk();

  const previousTradingDate = resolveStoredTradingDate(state);

  if (previousTradingDate == null) {
    state = { ...state, tradingDate };
    recoverCarryForwardIfEmpty(tradingDate);
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
    recoverCarryForwardIfEmpty(tradingDate);
    return {
      rolledOver: false,
      initialized: false,
      previousTradingDate,
      tradingDate,
    };
  }

  const expiredRecommendations = state.recommendations.reduce(
    (records, record) =>
      record.status === "ACTIVE"
        ? transitionRecommendation(
            records,
            record.recommendationId,
            "EXPIRED",
            "Trading session ended"
          )
        : records,
    state.recommendations
  );

  const priorCategories = { ...state.categories };
  const priorCandidateCount = countCategoryCandidates(priorCategories);
  const priorLastScannedAt = state.lastScannedAt;
  const priorLastScanMetrics = state.lastScanMetrics
    ? { ...state.lastScanMetrics }
    : null;
  const priorUniverseSize = state.universeSize;
  const priorPipeline = state.pipeline;
  const priorFirstDetected = Object.fromEntries(firstDetectedMap);

  archiveOpportunitySnapshot({
    tradingDate: previousTradingDate,
    archivedAt: new Date().toISOString(),
    state: {
      ...state,
      tradingDate: previousTradingDate,
      categories: priorCategories,
      scanHistory: [...state.scanHistory],
      lastScanMetrics: priorLastScanMetrics,
      recommendations: expiredRecommendations,
      postMarket: state.postMarket,
    },
    firstDetectedMap: priorFirstDetected,
  });

  // Carry forward last validated opportunities so the dashboard never goes
  // blank between day boundary / market open and the first successful scan.
  const fresh = buildFreshTradingDayState(tradingDate, isMarketOpen());
  firstDetectedMap.clear();
  state = {
    ...fresh,
    recommendations: expiredRecommendations,
    categories:
      priorCandidateCount > 0 ? priorCategories : emptyOpportunityCategories(),
    lastScannedAt: priorCandidateCount > 0 ? priorLastScannedAt : null,
    lastScanMetrics: priorCandidateCount > 0 ? priorLastScanMetrics : null,
    universeSize: priorUniverseSize,
    pipeline: priorPipeline,
  };

  if (priorCandidateCount > 0) {
    console.info(
      `[OpportunityEngine] Trading-day rollover ${previousTradingDate} → ${tradingDate}: ` +
        `carry-forward ${priorCandidateCount} candidates (stale until today's scan)`
    );
  } else {
    recoverCarryForwardIfEmpty(tradingDate, previousTradingDate);
  }

  persistNow();

  void import("@/lib/market/market-state-manager").then(({ invalidateAllMarketCaches }) => {
    invalidateAllMarketCaches(
      `OE trading-day rollover ${previousTradingDate} → ${tradingDate}`
    );
  });

  return {
    rolledOver: true,
    initialized: false,
    previousTradingDate,
    tradingDate,
  };
}

/**
 * If today's store is empty and we never scanned yet (post-wipe / cold start),
 * restore the newest archived trading-day snapshot as a stale bridge.
 */
function recoverCarryForwardIfEmpty(
  tradingDate: string,
  hintPreviousDate?: string | null
): void {
  if (countCategoryCandidates(state.categories) > 0) return;
  // Only recover when this trading day has never produced a scan. A completed
  // empty scan must remain empty (do not resurrect yesterday indefinitely).
  if (state.scanCount > 0 || state.lastScannedAt != null) return;

  const candidates: string[] = [];
  if (hintPreviousDate) candidates.push(hintPreviousDate);

  // Walk back recent IST calendar days for an archive hit.
  const base = new Date(`${tradingDate}T12:00:00+05:30`);
  for (let i = 1; i <= 10; i += 1) {
    const cursor = new Date(base.getTime() - i * 86_400_000);
    const key = getISTDateKey(cursor);
    if (!candidates.includes(key)) candidates.push(key);
  }

  for (const dateKey of candidates) {
    if (dateKey === tradingDate) continue;
    const archived = loadArchivedOpportunitySnapshot(dateKey);
    if (!archived?.state) continue;
    const count = countCategoryCandidates(archived.state.categories);
    if (count <= 0) continue;

    state = {
      ...state,
      categories: { ...archived.state.categories },
      lastScannedAt: archived.state.lastScannedAt,
      lastScanMetrics: archived.state.lastScanMetrics
        ? { ...archived.state.lastScanMetrics }
        : null,
      universeSize: archived.state.universeSize ?? state.universeSize,
      pipeline: archived.state.pipeline ?? state.pipeline,
      // Keep today's tradingDate; recommendations stay in memory as-is.
    };
    console.info(
      `[OpportunityEngine] Recovered ${count} carry-forward candidates from archive ${dateKey} ` +
        `(tradingDate=${tradingDate}, awaiting today's scan)`
    );
    persistNow();
    return;
  }
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
  scanMetrics: Omit<ScanMetrics, "scannedAt"> & { scannedAt?: string },
  pipelineSummary?: OpportunityEngineState["pipeline"]
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
    pipeline: pipelineSummary ?? state.pipeline ?? null,
  };
  state = {
    ...state,
    recommendations: syncRecommendationMemory(state, scannedAt),
  };
  persistNow();
}

export function updateRecommendationStatus(
  recommendationId: string,
  status: Exclude<RecommendationRecordStatus, "ACTIVE">,
  reason: string
) {
  hydrateFromDisk();
  ensureTradingDayLifecycle();
  const existing = replayRecommendation(state, recommendationId);
  if (!existing) return undefined;
  state = {
    ...state,
    recommendations: transitionRecommendation(
      state.recommendations,
      recommendationId,
      status,
      reason
    ),
  };
  persistNow();
  return replayRecommendation(state, recommendationId);
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
