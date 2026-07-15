/**
 * Earnings preview engine — orchestrates AI earnings intelligence previews.
 * Reuses fundamentals mock seeds + surprise enrichment; caches visible-card previews.
 */

import { MOCK_COMPANY_SEEDS } from "@/lib/fundamentals/mock-data";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import { getEarningsCalendarService } from "@/src/core/earnings/calendar";
import { getAIExpectation as computeAIExpectation } from "./EarningsExpectationEngine";
import { getExpectedSurprise as computeExpectedSurprise } from "./EarningsSurpriseEngine";
import { buildEarningsRiskView } from "./EarningsRiskEngine";
import { getConfidence as computeConfidence } from "./EarningsConfidenceEngine";
import { buildEarningsSignalView } from "./EarningsSignalEngine";
import { getResearchSummary as composeResearchSummary } from "./EarningsAISummary";
import {
  toEarningsCardPreviewView,
  toEarningsDrawerView,
} from "./EarningsPreviewPresenter";
import type {
  AIExpectationView,
  EarningsCardPreviewView,
  EarningsConfidenceView,
  EarningsDrawerView,
  EarningsPreviewSnapshot,
  EarningsResearchContext,
  EarningsResearchSummary,
  ExpectedSurpriseView,
} from "./EarningsIntelligenceModels";

function cacheKey(ticker: string, resultDate: string): string {
  return `${ticker.trim().toUpperCase()}::${resultDate}`;
}

function resolveValuationStatus(
  seed: (typeof MOCK_COMPANY_SEEDS)[string] | undefined
): EarningsResearchContext["valuationStatus"] {
  const statuses = seed?.valuation?.map((v) => v.status) ?? [];
  if (statuses.includes("undervalued") && !statuses.includes("overvalued")) {
    return "undervalued";
  }
  if (statuses.includes("overvalued") && !statuses.includes("undervalued")) {
    return "overvalued";
  }
  if (statuses.length > 0) return "fair";
  return null;
}

export function buildEarningsResearchContext(
  event: EarningsCalendarEvent
): EarningsResearchContext {
  const seed = MOCK_COMPANY_SEEDS[event.ticker.toUpperCase()];
  const quarters = seed?.quarterlyResults ?? [];
  return {
    event,
    quarters,
    pe: seed?.financials.pe ?? null,
    revenueGrowth: seed?.financials.revenueGrowth ?? null,
    netProfitGrowth: seed?.financials.netProfitGrowth ?? null,
    valuationStatus: resolveValuationStatus(seed),
    fiiPercent: seed?.shareholding.fii ?? null,
    diiPercent: seed?.shareholding.dii ?? null,
    hasAnalystCoverage: Boolean(seed && quarters.length >= 2),
  };
}

export class EarningsPreviewEngine {
  private readonly cache = new Map<string, EarningsPreviewSnapshot>();

  clearCache(): void {
    this.cache.clear();
  }

  getCachedPreview(
    ticker: string,
    resultDate: string
  ): EarningsPreviewSnapshot | null {
    return this.cache.get(cacheKey(ticker, resultDate)) ?? null;
  }

  /** Precompute previews only for the provided (visible) events. */
  precomputeVisible(events: readonly EarningsCalendarEvent[]): void {
    for (const event of events) {
      this.getEarningsPreview(event);
    }
  }

  buildSnapshot(event: EarningsCalendarEvent): EarningsPreviewSnapshot {
    const context = buildEarningsResearchContext(event);
    const expectation = computeAIExpectation(context);
    const surprise = computeExpectedSurprise(context);
    const confidence = computeConfidence({ context, expectation, surprise });
    const risk = buildEarningsRiskView(context);
    const signals = buildEarningsSignalView({
      context,
      expectation,
      surprise,
      confidence,
    });

    return {
      ticker: event.ticker,
      resultDate: event.resultDate,
      outlook: signals.outlook,
      confidence,
      expectation,
      surprise,
      risk,
      signals,
      historicalBeatRateLabel: surprise.historicalBeatRateLabel,
      consensusDirectionLabel: String(surprise.consensusDirection),
      importantWatchItem: signals.importantWatchItem,
      badges: signals.badges,
    };
  }

  getEarningsPreview(
    eventOrTicker: EarningsCalendarEvent | string,
    resultDate?: string
  ): EarningsPreviewSnapshot {
    const event = resolveEvent(eventOrTicker, resultDate);
    const key = cacheKey(event.ticker, event.resultDate);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const snapshot = this.buildSnapshot(event);
    this.cache.set(key, snapshot);
    return snapshot;
  }

  getAIExpectationFor(
    eventOrTicker: EarningsCalendarEvent | string,
    resultDate?: string
  ): AIExpectationView {
    return this.getEarningsPreview(eventOrTicker, resultDate).expectation;
  }

  getExpectedSurpriseFor(
    eventOrTicker: EarningsCalendarEvent | string,
    resultDate?: string
  ): ExpectedSurpriseView {
    return this.getEarningsPreview(eventOrTicker, resultDate).surprise;
  }

  getConfidenceFor(
    eventOrTicker: EarningsCalendarEvent | string,
    resultDate?: string
  ): EarningsConfidenceView {
    return this.getEarningsPreview(eventOrTicker, resultDate).confidence;
  }

  getResearchSummaryFor(
    eventOrTicker: EarningsCalendarEvent | string,
    resultDate?: string
  ): EarningsResearchSummary {
    const event = resolveEvent(eventOrTicker, resultDate);
    const snapshot = this.getEarningsPreview(event);
    const context = buildEarningsResearchContext(event);
    return composeResearchSummary({
      context,
      outlook: snapshot.outlook,
      expectation: snapshot.expectation,
      surprise: snapshot.surprise,
      risk: snapshot.risk,
      confidence: snapshot.confidence,
    });
  }

  getCardPreviewView(
    event: EarningsCalendarEvent
  ): EarningsCardPreviewView {
    return toEarningsCardPreviewView(this.getEarningsPreview(event));
  }

  getDrawerView(event: EarningsCalendarEvent): EarningsDrawerView {
    const snapshot = this.getEarningsPreview(event);
    const research = this.getResearchSummaryFor(event);
    return toEarningsDrawerView({ event, snapshot, research });
  }

  getCardPreviewForTicker(
    ticker: string,
    resultDate?: string
  ): EarningsCardPreviewView {
    return toEarningsCardPreviewView(this.getEarningsPreview(ticker, resultDate));
  }

  getDrawerViewForTicker(
    ticker: string,
    resultDate?: string
  ): EarningsDrawerView {
    const event = resolveEvent(ticker, resultDate);
    return this.getDrawerView(event);
  }
}

function resolveEvent(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): EarningsCalendarEvent {
  if (typeof eventOrTicker !== "string") return eventOrTicker;

  const ticker = eventOrTicker.trim().toUpperCase();
  const service = getEarningsCalendarService();
  const match = service
    .getAllEvents()
    .find(
      (e) =>
        e.ticker === ticker &&
        (!resultDate || e.resultDate === resultDate)
    );

  if (match) return match;

  // Minimal placeholder when calendar has no match — still produces empty-safe preview.
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

let singleton: EarningsPreviewEngine | null = null;

export function getEarningsPreviewEngine(): EarningsPreviewEngine {
  if (!singleton) singleton = new EarningsPreviewEngine();
  return singleton;
}

export function resetEarningsPreviewEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API — getEarningsPreview() */
export function getEarningsPreview(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): EarningsPreviewSnapshot {
  return getEarningsPreviewEngine().getEarningsPreview(eventOrTicker, resultDate);
}

/** Public API — getAIExpectation() */
export function getAIExpectation(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): AIExpectationView {
  return getEarningsPreviewEngine().getAIExpectationFor(eventOrTicker, resultDate);
}

/** Public API — getExpectedSurprise() */
export function getExpectedSurprise(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): ExpectedSurpriseView {
  return getEarningsPreviewEngine().getExpectedSurpriseFor(
    eventOrTicker,
    resultDate
  );
}

/** Public API — getConfidence() */
export function getConfidence(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): EarningsConfidenceView {
  return getEarningsPreviewEngine().getConfidenceFor(eventOrTicker, resultDate);
}

/** Public API — getResearchSummary() */
export function getResearchSummary(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): EarningsResearchSummary {
  return getEarningsPreviewEngine().getResearchSummaryFor(
    eventOrTicker,
    resultDate
  );
}
