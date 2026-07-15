/**
 * Institutional AI Screener — domain models & presentation guards (Sprint 9D.R1).
 * Never surface null / undefined / NaN to presentation layers.
 */

import type { ScreenType } from "./ScreenDefinition";

export const SCREEN_ENGINE_EMPTY = {
  noMatches: "No Matches",
  awaitingScan: "Awaiting Scan",
  noUniverseSelected: "No Universe Selected",
} as const;

export type ScreenEmptyMessage =
  (typeof SCREEN_ENGINE_EMPTY)[keyof typeof SCREEN_ENGINE_EMPTY];

/** Candidate row passed into the runner from market/universe layers. */
export interface ScreenUniverseCandidate {
  ticker: string;
  company?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: number | null;
  marketCap?: number | null;
  /** Precomputed metric bag — composition only, no recalc. */
  metrics?: Record<string, number | string | null | undefined>;
}

/** Optional scores already produced by existing AI engines. */
export interface ScreenEngineScores {
  ticker: string;
  aiScore?: number | null;
  trustScore?: number | null;
  validationScore?: number | null;
  confidence?: number | null;
  opportunityScore?: number | null;
  reasonSummary?: string | null;
  matchedRules?: string[] | null;
  category?: ScreenType | null;
}

/** Resolved finite scores used during ranking (nulls stripped). */
export interface ResolvedScreenScores {
  ticker: string;
  aiScore: number;
  trustScore: number;
  validationScore: number;
  confidence: number;
  opportunityScore: number;
  reasonSummary: string;
  matchedRules: string[];
  category: ScreenType | null;
}

export interface ScreenRunOptions {
  /** Force bypass cache */
  force?: boolean;
  /** Override universe when screen.universe is custom/portfolio/watchlist */
  universe?: ScreenUniverseCandidate[];
  /** Precomputed engine scores keyed by ticker (Opportunity / Trust / Validation) */
  engineScores?: ScreenEngineScores[];
  /** Wall-clock override for deterministic tests */
  now?: Date;
}

export function safeScreenText(
  value: string | null | undefined,
  fallback: string
): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function safeScreenNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value;
}

export function assertNoSentinelText(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed !== "" &&
    trimmed !== "null" &&
    trimmed !== "undefined" &&
    trimmed !== "NaN"
  );
}
