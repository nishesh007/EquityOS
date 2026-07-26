/**
 * Sprint 11B.1 — Historical dataset contracts.
 * Interfaces only — no provider implementations.
 */

import type {
  BacktestRecommendationSnapshot,
  DatasetQuality,
  DatasetSlice,
} from "@/lib/backtesting/types";

export interface OhlcvBar {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export type CorporateActionKind =
  | "split"
  | "bonus"
  | "dividend"
  | "rights"
  | "other";

export interface CorporateActionRecord {
  id: string;
  symbol: string;
  kind: CorporateActionKind;
  exDate: string;
  /** Split/bonus ratio as "from:to" or numeric factor. */
  ratio?: string;
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface HistoricalEventRecord {
  id: string;
  symbol?: string;
  title: string;
  eventType: string;
  at: string;
  importance?: string;
  meta?: Record<string, unknown>;
}

export interface MarketRegimeRecord {
  at: string;
  regime: string;
  confidence?: number;
  label?: string;
  meta?: Record<string, unknown>;
}

export interface HistoricalDatasetRequest {
  symbols: readonly string[];
  start: string;
  end: string;
  includeCorporateActions?: boolean;
  includeEvents?: boolean;
  includeRegime?: boolean;
  includeRecommendations?: boolean;
}

export interface HistoricalDatasetBundle {
  slice: DatasetSlice;
  ohlcv: readonly OhlcvBar[];
  corporateActions: readonly CorporateActionRecord[];
  events: readonly HistoricalEventRecord[];
  regimes: readonly MarketRegimeRecord[];
  recommendations: readonly BacktestRecommendationSnapshot[];
  quality: DatasetQuality;
}

/**
 * Provider contract — implement in a later sprint.
 * Backtesting framework depends only on this interface.
 */
export interface HistoricalDatasetProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): Promise<boolean> | boolean;
  fetchDataset(
    request: HistoricalDatasetRequest
  ): Promise<HistoricalDatasetBundle>;
}

export interface HistoricalDatasetRegistry {
  register(provider: HistoricalDatasetProvider): void;
  get(id: string): HistoricalDatasetProvider | null;
  list(): readonly HistoricalDatasetProvider[];
}

export function createEmptyDatasetQuality(
  source?: string
): DatasetQuality {
  return {
    completeness: 0,
    gaps: 0,
    warnings: ["No historical provider implemented (Sprint 11B.1 architecture)."],
    source,
  };
}

export function createDatasetSlice(input: {
  id: string;
  symbol?: string;
  start: string;
  end: string;
  asOf?: string;
  quality?: DatasetQuality;
}): DatasetSlice {
  return {
    id: input.id,
    symbol: input.symbol,
    start: input.start,
    end: input.end,
    asOf: input.asOf ?? new Date().toISOString(),
    quality: input.quality ?? createEmptyDatasetQuality(),
  };
}
