/**
 * Institutional AI Screener — result models (Sprint 9D.R1).
 */

import { SCREEN_ENGINE_EMPTY, safeScreenNumber, safeScreenText } from "./ScreenModels";
import type { ScreenType } from "./ScreenDefinition";

export interface ScreenMatchResult {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  aiScore: number;
  trustScore: number;
  validationScore: number;
  confidence: number;
  reasonSummary: string;
  matchedRules: string[];
  rank: number;
  screenId: string;
  screenCategory: ScreenType;
}

export interface ScreenRunResults {
  screenId: string;
  screenName: string;
  results: ScreenMatchResult[];
  totalMatches: number;
  empty: boolean;
  emptyMessage: string;
  generatedAt: string;
  fromCache: boolean;
}

export function emptyScreenRunResults(
  screenId = "",
  screenName = "",
  message: string = SCREEN_ENGINE_EMPTY.awaitingScan
): ScreenRunResults {
  return {
    screenId: safeScreenText(screenId, ""),
    screenName: safeScreenText(screenName, ""),
    results: [],
    totalMatches: 0,
    empty: true,
    emptyMessage: message,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  };
}

export function normalizeScreenMatch(
  input: {
    ticker: string;
    company?: string | null;
    sector?: string | null;
    industry?: string | null;
    price?: number | null;
    marketCap?: number | null;
    aiScore?: number | null;
    trustScore?: number | null;
    validationScore?: number | null;
    confidence?: number | null;
    reasonSummary?: string | null;
    matchedRules?: string[] | null;
    rank?: number | null;
    screenId?: string | null;
    screenCategory?: ScreenType | null;
  },
  defaults?: { screenId?: string; screenCategory?: ScreenType }
): ScreenMatchResult {
  return {
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    company: safeScreenText(input.company, "—"),
    sector: safeScreenText(input.sector, "—"),
    industry: safeScreenText(input.industry, "—"),
    price: safeScreenNumber(input.price, 0),
    marketCap: safeScreenNumber(input.marketCap, 0),
    aiScore: safeScreenNumber(input.aiScore, 0),
    trustScore: safeScreenNumber(input.trustScore, 0),
    validationScore: safeScreenNumber(input.validationScore, 0),
    confidence: safeScreenNumber(input.confidence, 0),
    reasonSummary: safeScreenText(input.reasonSummary, "No reason available"),
    matchedRules: Array.isArray(input.matchedRules)
      ? input.matchedRules.map((r) => safeScreenText(r, "")).filter(Boolean)
      : [],
    rank: Math.max(0, Math.floor(safeScreenNumber(input.rank, 0))),
    screenId: safeScreenText(input.screenId ?? defaults?.screenId, ""),
    screenCategory:
      input.screenCategory ?? defaults?.screenCategory ?? "Custom",
  };
}
