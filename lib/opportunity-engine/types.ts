import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";

export type OpportunityCategory =
  | "intraday"
  | "swing"
  | "breakout"
  | "momentum"
  | "relative_volume"
  | "mean_reversion"
  | "ai_high_conviction";

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  "intraday",
  "swing",
  "breakout",
  "momentum",
  "relative_volume",
  "mean_reversion",
  "ai_high_conviction",
];

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  intraday: "Intraday Opportunities",
  swing: "Swing Trade Opportunities",
  breakout: "Breakout Candidates",
  momentum: "Momentum Leaders",
  relative_volume: "High Relative Volume",
  mean_reversion: "Mean Reversion Ideas",
  ai_high_conviction: "AI High Conviction Picks",
};

export const CATEGORY_LIMITS: Record<OpportunityCategory, number> = {
  intraday: 12,
  swing: 15,
  breakout: 12,
  momentum: 12,
  relative_volume: 12,
  mean_reversion: 10,
  ai_high_conviction: 10,
};

export interface OpportunityCandidate {
  id: string;
  symbol: string;
  company: string;
  category: OpportunityCategory;
  side: "Long" | "Short";
  rank: number;
  previousRank: number | null;
  aiConvictionScore: number;
  entryZone: { low: number; high: number };
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  confidencePercent: number;
  reason: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  lastUpdatedAt: string;
  timeHorizon?: string;
  quote?: EnrichedQuote;
}

export interface PostMarketReport {
  tomorrowWatchlist: OpportunityCandidate[];
  missedOpportunities: OpportunityCandidate[];
  bestCallsOfDay: OpportunityCandidate[];
  generatedAt: string;
  sessionDate: string;
}

export interface ScanHistoryEntry {
  scannedAt: string;
  durationMs: number;
  symbolsScanned: number;
  added: number;
  removed: number;
  updated: number;
  scanCount: number;
}

export interface ScanMetrics {
  durationMs: number;
  symbolsScanned: number;
  added: number;
  removed: number;
  updated: number;
  scannedAt: string;
}

export interface OpportunityEngineState {
  lastScannedAt: string | null;
  nextScanAt: string | null;
  isFrozen: boolean;
  isScanning: boolean;
  marketOpen: boolean;
  scanCount: number;
  universeSize: number;
  categories: Record<OpportunityCategory, OpportunityCandidate[]>;
  postMarket: PostMarketReport | null;
  scanHistory: ScanHistoryEntry[];
  lastScanMetrics: ScanMetrics | null;
}

export interface ScanResult {
  state: OpportunityEngineState;
  added: number;
  removed: number;
  updated: number;
  durationMs: number;
  symbolsScanned: number;
}

export interface CategoryScanCandidate {
  symbol: string;
  company: string;
  category: OpportunityCategory;
  side: "Long" | "Short";
  score: number;
  reason: string;
  confidencePercent: number;
  aiConvictionScore: number;
  metrics: Record<string, number | null>;
}

export const SCAN_INTERVAL_MS = 15 * 60 * 1000;
export const MAX_SCAN_HISTORY = 50;
