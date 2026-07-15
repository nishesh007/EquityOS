/**
 * Post-earnings analysis orchestrator — caches completed analyses.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import {
  buildEarningsCountdown,
  getEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import {
  buildEarningsResearchContext,
  type EarningsResearchContext,
} from "@/src/core/earnings/intelligence";
import { compareEstimateVsActual } from "./EstimateComparisonEngine";
import { buildActualsComparison } from "./EarningsComparisonEngine";
import { getGuidanceSummary } from "./GuidanceAnalysisEngine";
import { getMarketReaction } from "./EarningsReactionEngine";
import {
  buildPostEarningsReport,
  getPostEarningsVerdict,
} from "./PostEarningsSummary";
import {
  buildPostEarningsBadges,
  toPostEarningsCardView,
  toPostEarningsDrawerView,
} from "./PostEarningsPresenter";
import type {
  PostEarningsAnalysis,
  PostEarningsCardView,
  PostEarningsDrawerView,
  PostEarningsResearchReport,
  ReactionQuoteInput,
} from "./PostEarningsModels";

function cacheKey(ticker: string, resultDate: string): string {
  return `${ticker.trim().toUpperCase()}::${resultDate}`;
}

export class EarningsPostAnalysisEngine {
  private readonly cache = new Map<string, PostEarningsAnalysis>();
  private readonly quoteHints = new Map<string, ReactionQuoteInput>();

  clearCache(): void {
    this.cache.clear();
  }

  setQuoteHint(ticker: string, quote: ReactionQuoteInput): void {
    this.quoteHints.set(ticker.trim().toUpperCase(), quote);
  }

  getCached(
    ticker: string,
    resultDate: string
  ): PostEarningsAnalysis | null {
    return this.cache.get(cacheKey(ticker, resultDate)) ?? null;
  }

  precomputeVisible(events: readonly EarningsCalendarEvent[], now = new Date()): void {
    for (const event of events) {
      const countdown = buildEarningsCountdown(
        event.resultDate,
        event.resultTime,
        now
      );
      if (countdown.isReleased || countdown.isExpired) {
        this.getPostEarningsAnalysis(event, now);
      }
    }
  }

  buildAnalysis(
    event: EarningsCalendarEvent,
    now = new Date()
  ): PostEarningsAnalysis {
    const context = buildEarningsResearchContext(event);
    const countdown = buildEarningsCountdown(
      event.resultDate,
      event.resultTime,
      now
    );
    const released = countdown.isReleased || countdown.isExpired;

    const comparison = compareEstimateVsActual(context);
    const guidance = getGuidanceSummary(context, comparison);
    const quote = this.quoteHints.get(event.ticker.toUpperCase()) ?? null;
    const reaction = getMarketReaction(quote, comparison);
    const verdict = getPostEarningsVerdict({ comparison, guidance, reaction });
    const actuals = buildActualsComparison(context);

    const draft: PostEarningsAnalysis = {
      ticker: event.ticker,
      resultDate: event.resultDate,
      released,
      comparison,
      guidance,
      reaction,
      verdict,
      badges: [],
      revenueTrend: actuals.trendPoints,
      epsTrend: actuals.trendPoints,
      marginTrend: actuals.trendPoints,
      surpriseTrend: actuals.trendPoints.map((p) => ({
        label: p.label,
        result: p.surprise,
      })),
    };
    draft.badges = buildPostEarningsBadges(draft);
    return draft;
  }

  getPostEarningsAnalysis(
    eventOrTicker: EarningsCalendarEvent | string,
    now = new Date(),
    resultDate?: string
  ): PostEarningsAnalysis {
    const event = resolveEvent(eventOrTicker, resultDate);
    const key = cacheKey(event.ticker, event.resultDate);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const analysis = this.buildAnalysis(event, now);
    this.cache.set(key, analysis);
    return analysis;
  }

  getCardView(
    eventOrTicker: EarningsCalendarEvent | string,
    now = new Date(),
    resultDate?: string
  ): PostEarningsCardView {
    return toPostEarningsCardView(
      this.getPostEarningsAnalysis(eventOrTicker, now, resultDate)
    );
  }

  getDrawerView(
    eventOrTicker: EarningsCalendarEvent | string,
    now = new Date(),
    resultDate?: string
  ): PostEarningsDrawerView {
    const event = resolveEvent(eventOrTicker, resultDate);
    const analysis = this.getPostEarningsAnalysis(event, now);
    const context = buildEarningsResearchContext(event);
    const actuals = buildActualsComparison(context);
    const report = buildPostEarningsReport({
      context,
      comparison: analysis.comparison,
      guidance: analysis.guidance,
      reaction: analysis.reaction,
      verdict: analysis.verdict,
      actuals,
    });
    return toPostEarningsDrawerView({ event, analysis, report });
  }

  getResearchReport(
    eventOrTicker: EarningsCalendarEvent | string,
    now = new Date(),
    resultDate?: string
  ): PostEarningsResearchReport {
    return this.getDrawerView(eventOrTicker, now, resultDate).report;
  }
}

function resolveEvent(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): EarningsCalendarEvent {
  if (typeof eventOrTicker !== "string") return eventOrTicker;
  const ticker = eventOrTicker.trim().toUpperCase();
  const match = getEarningsCalendarService()
    .getAllEvents()
    .find(
      (e) =>
        e.ticker === ticker && (!resultDate || e.resultDate === resultDate)
    );
  if (match) return match;
  return {
    id: `earn-${ticker.toLowerCase()}`,
    companyName: ticker,
    ticker,
    exchange: "NSE",
    sector: "—",
    industry: "—",
    marketCap: "—",
    marketCapBucket: "unknown",
    quarter: "—",
    financialYear: "—",
    resultDate: resultDate ?? "1970-01-01",
    resultTime: null,
    resultSession: "post_market",
    previousResultDate: null,
    highImpact: false,
    fno: false,
    highConviction: false,
    inPortfolio: false,
    inWatchlist: false,
  };
}

let singleton: EarningsPostAnalysisEngine | null = null;

export function getPostEarningsEngine(): EarningsPostAnalysisEngine {
  if (!singleton) singleton = new EarningsPostAnalysisEngine();
  return singleton;
}

export function resetPostEarningsEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API — getPostEarningsAnalysis() */
export function getPostEarningsAnalysis(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): PostEarningsAnalysis {
  return getPostEarningsEngine().getPostEarningsAnalysis(
    eventOrTicker,
    new Date(),
    resultDate
  );
}
