import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import { getISTDateKey } from "@/lib/market/session";

export interface TradingDayRolloverResult {
  rolledOver: boolean;
  /** True when tradingDate was assigned for the first time (no prior day to archive). */
  initialized: boolean;
  previousTradingDate: string | null;
  tradingDate: string;
}

export function emptyOpportunityCategories(): Record<
  OpportunityCategory,
  OpportunityCandidate[]
> {
  return OPPORTUNITY_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {} as Record<OpportunityCategory, OpportunityCandidate[]>
  );
}

/**
 * Resolve the stored trading date, migrating legacy state that only had
 * postMarket.sessionDate.
 */
export function resolveStoredTradingDate(
  state: Pick<OpportunityEngineState, "tradingDate" | "postMarket">
): string | null {
  return state.tradingDate ?? state.postMarket?.sessionDate ?? null;
}

export function shouldRolloverTradingDay(
  storedTradingDate: string | null,
  currentTradingDate: string
): boolean {
  if (storedTradingDate == null || storedTradingDate === "") return false;
  return storedTradingDate !== currentTradingDate;
}

export function buildFreshTradingDayState(
  tradingDate: string,
  marketOpen: boolean
): OpportunityEngineState {
  return {
    tradingDate,
    lastScannedAt: null,
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen,
    scanCount: 0,
    universeSize: 0,
    categories: emptyOpportunityCategories(),
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

/** Whether an ISO timestamp falls on the given IST trading date. */
export function isTimestampOnTradingDate(
  isoTimestamp: string,
  tradingDate: string
): boolean {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return false;
  return getISTDateKey(parsed) === tradingDate;
}
