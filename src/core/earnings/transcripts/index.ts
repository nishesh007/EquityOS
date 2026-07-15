/**
 * Institutional Earnings Transcript Intelligence — public exports (Sprint 9B.R4).
 */

export type {
  TranscriptSentiment,
  GuidanceDirection,
  TranscriptBadgeId,
  RiskCategory,
  CatalystCategory,
  RawTranscriptDocument,
  TranscriptSummaryView,
  ManagementSentimentView,
  GuidanceItem,
  GuidanceChangesView,
  ExtractedRisk,
  ExtractedRisksView,
  ExtractedCatalyst,
  CatalystsView,
  QuestionAnalysisView,
  TranscriptResearchView,
  TranscriptDrawerSectionView,
} from "./TranscriptModels";

export { TRANSCRIPT_EMPTY } from "./TranscriptModels";

export {
  TranscriptIngestionEngine,
  getTranscriptIngestionEngine,
  resetTranscriptIngestionEngine,
  hasTranscriptSeed,
} from "./TranscriptIngestionEngine";

export { getTranscriptSummary as buildTranscriptSummaryFromDoc } from "./TranscriptSummaryEngine";
export { getManagementSentiment as computeManagementSentiment } from "./ManagementSentimentEngine";
export { getGuidanceChanges as computeGuidanceChanges } from "./GuidanceChangeEngine";
export { getExtractedRisks as computeExtractedRisks } from "./RiskExtractionEngine";
export { getCatalysts as computeCatalysts } from "./CatalystExtractionEngine";
export { analyzeQuestions } from "./QuestionAnalysisEngine";
export {
  buildTranscriptBadges,
  transcriptBadgeVariant,
  toTranscriptDrawerSection,
  sanitizeResearchView,
} from "./TranscriptPresenter";

import { getEarningsCalendarService } from "@/src/core/earnings/calendar";
import {
  getTranscriptIngestionEngine,
  resetTranscriptIngestionEngine,
} from "./TranscriptIngestionEngine";
import { getTranscriptSummary as summarizeDoc } from "./TranscriptSummaryEngine";
import { getManagementSentiment as sentimentFromDoc } from "./ManagementSentimentEngine";
import { getGuidanceChanges as guidanceFromDoc } from "./GuidanceChangeEngine";
import { getExtractedRisks as risksFromDoc } from "./RiskExtractionEngine";
import { getCatalysts as catalystsFromDoc } from "./CatalystExtractionEngine";
import { analyzeQuestions } from "./QuestionAnalysisEngine";
import {
  buildTranscriptBadges,
  sanitizeResearchView,
  toTranscriptDrawerSection,
} from "./TranscriptPresenter";
import type {
  CatalystsView,
  ExtractedRisksView,
  GuidanceChangesView,
  ManagementSentimentView,
  TranscriptDrawerSectionView,
  TranscriptResearchView,
  TranscriptSummaryView,
} from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

function researchCacheKey(ticker: string, resultDate: string): string {
  return `${ticker.trim().toUpperCase()}::${resultDate}`;
}

const researchCache = new Map<string, TranscriptResearchView>();

export function resetTranscriptIntelligence(): void {
  researchCache.clear();
  resetTranscriptIngestionEngine();
}

function resolveMeta(ticker: string, resultDate?: string): {
  ticker: string;
  resultDate: string;
  quarter: string;
  financialYear: string;
} {
  const key = ticker.trim().toUpperCase();
  const match = getEarningsCalendarService()
    .getAllEvents()
    .find(
      (e) => e.ticker === key && (!resultDate || e.resultDate === resultDate)
    );
  return {
    ticker: key,
    resultDate: resultDate ?? match?.resultDate ?? "1970-01-01",
    quarter: match?.quarter ?? "—",
    financialYear: match?.financialYear ?? "—",
  };
}

function composeResearch(
  ticker: string,
  resultDate?: string
): TranscriptResearchView {
  const meta = resolveMeta(ticker, resultDate);
  const cacheKey = researchCacheKey(meta.ticker, meta.resultDate);
  const cached = researchCache.get(cacheKey);
  if (cached) return cached;

  const doc = getTranscriptIngestionEngine().ingest(meta);
  const summary = summarizeDoc(doc);
  const sentiment = sentimentFromDoc(doc);
  const guidance = guidanceFromDoc(doc);
  const risks = risksFromDoc(doc);
  const catalysts = catalystsFromDoc(doc);
  const questions = analyzeQuestions(doc);

  const available = summary.available || sentiment.available;
  const positiveSignals = [
    ...summary.growthDrivers.slice(0, 2),
    ...catalysts.catalysts.slice(0, 2).map((c) => c.detail),
  ];
  const negativeSignals = [
    ...summary.weaknesses.slice(0, 2),
    ...risks.risks.slice(0, 2).map((r) => r.detail),
  ];

  const research = sanitizeResearchView({
    ticker: meta.ticker,
    resultDate: meta.resultDate,
    summary,
    sentiment,
    guidance,
    risks,
    catalysts,
    questions,
    positiveSignals:
      positiveSignals.length > 0
        ? positiveSignals
        : [TRANSCRIPT_EMPTY.commentaryPending],
    negativeSignals:
      negativeSignals.length > 0
        ? negativeSignals
        : [TRANSCRIPT_EMPTY.commentaryPending],
    aiVerdict: sentiment.available
      ? `${sentiment.overall} management tone`
      : TRANSCRIPT_EMPTY.transcriptNotAvailable,
    confidence: sentiment.available
      ? sentiment.confidence
      : TRANSCRIPT_EMPTY.transcriptNotAvailable,
    badges: buildTranscriptBadges({ summary, sentiment, guidance }),
    available,
    emptyMessage: available ? "" : summary.emptyMessage || TRANSCRIPT_EMPTY.transcriptNotAvailable,
  });

  researchCache.set(cacheKey, research);
  return research;
}

/** Public API — getTranscriptResearch() */
export function getTranscriptResearch(
  ticker: string,
  resultDate?: string
): TranscriptResearchView {
  return composeResearch(ticker, resultDate);
}

/** Public API — getTranscriptSummary() */
export function getTranscriptSummary(
  ticker: string,
  resultDate?: string
): TranscriptSummaryView {
  return composeResearch(ticker, resultDate).summary;
}

/** Public API — getManagementSentiment() */
export function getManagementSentiment(
  ticker: string,
  resultDate?: string
): ManagementSentimentView {
  return composeResearch(ticker, resultDate).sentiment;
}

/** Public API — getGuidanceChanges() */
export function getGuidanceChanges(
  ticker: string,
  resultDate?: string
): GuidanceChangesView {
  return composeResearch(ticker, resultDate).guidance;
}

/** Public API — getExtractedRisks() */
export function getExtractedRisks(
  ticker: string,
  resultDate?: string
): ExtractedRisksView {
  return composeResearch(ticker, resultDate).risks;
}

/** Public API — getCatalysts() */
export function getCatalysts(
  ticker: string,
  resultDate?: string
): CatalystsView {
  return composeResearch(ticker, resultDate).catalysts;
}

export function getTranscriptDrawerSection(
  ticker: string,
  resultDate?: string
): TranscriptDrawerSectionView {
  return toTranscriptDrawerSection(composeResearch(ticker, resultDate));
}
