/**
 * Earnings coverage engine — universe coverage and high-impact classification.
 */

import { daysUntilResult } from "./EarningsCountdown";
import type {
  EarningsCalendarEvent,
  EarningsCalendarMetrics,
  MarketCapBucket,
} from "./InstitutionalEarningsModels";

export interface CoverageUniverseInput {
  /** Total listed / tracked companies in the research universe. */
  universeSize: number;
  events: readonly EarningsCalendarEvent[];
  portfolioSymbols?: readonly string[];
  watchlistSymbols?: readonly string[];
  now?: Date;
}

function symbolKey(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function inferMarketCapBucket(marketCapLabel: string): MarketCapBucket {
  const normalized = marketCapLabel.replace(/,/g, "").toUpperCase();
  // Heuristic for Indian ₹L Cr / Cr labels
  const lCr = /₹?\s*([\d.]+)\s*L\s*CR/i.exec(normalized);
  if (lCr) {
    const value = Number(lCr[1]);
    if (!Number.isFinite(value)) return "unknown";
    if (value >= 1) return "large";
    return "mid";
  }
  const cr = /₹?\s*([\d.]+)\s*CR/i.exec(normalized);
  if (cr) {
    const value = Number(cr[1]);
    if (!Number.isFinite(value)) return "unknown";
    if (value >= 50_000) return "large";
    if (value >= 10_000) return "mid";
    if (value >= 1_000) return "small";
    return "micro";
  }
  return "unknown";
}

export function classifyHighImpact(event: Pick<
  EarningsCalendarEvent,
  "marketCapBucket" | "fno" | "highConviction" | "highImpact"
>): boolean {
  if (event.highImpact) return true;
  if (event.marketCapBucket === "large") return true;
  if (event.fno && event.highConviction) return true;
  return false;
}

export function computeCoveragePercent(
  companiesCovered: number,
  universeSize: number
): number {
  if (!Number.isFinite(universeSize) || universeSize <= 0) return 0;
  if (!Number.isFinite(companiesCovered) || companiesCovered <= 0) return 0;
  return Math.min(100, Math.round((companiesCovered / universeSize) * 100));
}

export function buildCoverageMetrics(
  input: CoverageUniverseInput
): EarningsCalendarMetrics {
  const now = input.now ?? new Date();
  const portfolio = new Set((input.portfolioSymbols ?? []).map(symbolKey));
  const watchlist = new Set((input.watchlistSymbols ?? []).map(symbolKey));

  const covered = new Set(
    input.events.map((e) => symbolKey(e.ticker)).filter(Boolean)
  );

  let todaysEarnings = 0;
  let tomorrowsEarnings = 0;
  let nextWeekEarnings = 0;
  let portfolioEarnings = 0;
  let watchlistEarnings = 0;
  let highImpactResults = 0;

  for (const event of input.events) {
    const days = daysUntilResult(event.resultDate, now);
    if (days == null) continue;
    if (days === 0) todaysEarnings += 1;
    if (days === 1) tomorrowsEarnings += 1;
    if (days >= 0 && days <= 7) nextWeekEarnings += 1;
    if (days >= 0 && portfolio.has(symbolKey(event.ticker))) {
      portfolioEarnings += 1;
    }
    if (days >= 0 && watchlist.has(symbolKey(event.ticker))) {
      watchlistEarnings += 1;
    }
    if (days >= 0 && classifyHighImpact(event)) {
      highImpactResults += 1;
    }
  }

  const companiesCovered = covered.size;
  const coveragePercent = computeCoveragePercent(
    companiesCovered,
    input.universeSize
  );

  return {
    companiesCovered,
    todaysEarnings,
    tomorrowsEarnings,
    nextWeekEarnings,
    portfolioEarnings,
    watchlistEarnings,
    highImpactResults,
    coveragePercent,
    coverageLabel:
      companiesCovered === 0
        ? "Awaiting Exchange Schedule"
        : `${coveragePercent}% Coverage`,
  };
}
