/**
 * Institutional AI Compare Engine — head-to-head comparison for 2–5 companies.
 * Scorecard/rating remain research signals; trade recommendation comes from Strategy Engine.
 */

import { CompareEngineError } from "@/lib/ai/core/errors";
import { loadInstitutionalBundle } from "@/lib/ai/institutional/loadBundle";
import {
  type AIDecisionSummary,
  type InvestorProfile,
} from "@/lib/ai/decision/decisionEngine";
import { buildDecisionScores } from "@/lib/ai/decision/scoringEngine";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import {
  buildComparePeerRow,
  rankComparePeers,
} from "@/lib/compare/peerEngine";
import {
  buildCompareAIVerdict,
  rankCompareCompanies,
  findDimensionLeaders,
  type CompareAIVerdict,
  type RankedCompareCompany,
} from "@/lib/compare/rankingEngine";
import {
  buildCompareScorecard,
  buildRadarDimensions,
  buildRecommendationMatrix,
  buildStrengthWeaknessMatrix,
  computeOverallCompareScore,
  type CompareRadarDimension,
  type CompareScorecard,
  type RecommendationMatrixEntry,
  type StrengthWeaknessEntry,
} from "@/lib/compare/scorecardEngine";
import { buildInstitutionalRating } from "@/lib/research/ratingEngine";
import type { SharedRecommendation } from "@/lib/recommendations";
import {
  ensureOpportunityEngineState,
  fetchRecommendationsForSymbols,
} from "@/services/opportunityEngine";
import type { InstitutionalPeer, RecommendationLevel } from "@/types";
import type { InstitutionalRating } from "@/lib/research/ratingEngine";

export const COMPARE_MIN_SYMBOLS = 2;
export const COMPARE_MAX_SYMBOLS = 5;

export { CompareEngineError };

export interface CompareCompanySnapshot {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: string;
  overallScore: number;
  scorecard: CompareScorecard;
  recommendation: RecommendationLevel;
  confidenceScore: number;
  aiConvictionScore: number;
  suitableInvestor: InvestorProfile[];
  redFlags: string[];
  decision: AIDecisionSummary;
}

export interface CompareResult {
  symbols: string[];
  companies: CompareCompanySnapshot[];
  peers: InstitutionalPeer[];
  radar: CompareRadarDimension[];
  rankings: RankedCompareCompany[];
  strengthWeakness: StrengthWeaknessEntry[];
  recommendationMatrix: RecommendationMatrixEntry[];
  dimensionLeaders: ReturnType<typeof findDimensionLeaders>;
  verdict: CompareAIVerdict | null;
  generatedAt: string;
}

interface LoadedCompareCompany {
  rating: InstitutionalRating;
  decision: AIDecisionSummary;
  scorecard: CompareScorecard;
  overallScore: number;
  bundle: NonNullable<Awaited<ReturnType<typeof loadInstitutionalBundle>>>;
}

function toCompareDecision(
  recommendation: SharedRecommendation | null,
  companyName: string,
  symbol: string,
  fallback: {
    suitableInvestor: InvestorProfile[];
    redFlags: string[];
    compositeScore: number;
  }
): AIDecisionSummary {
  if (!recommendation) {
    return {
      symbol,
      companyName,
      recommendation: "Hold",
      confidenceScore: 0,
      aiConvictionScore: 0,
      reasonsToBuy: [],
      reasonsNotToBuy: [
        "No validated Strategy Engine recommendation for this symbol.",
      ],
      redFlags: fallback.redFlags,
      upcomingCatalysts: [],
      timeHorizon: "1 Year",
      timeHorizonRationale: "Unavailable until Strategy Engine validates a setup.",
      suitableInvestor: fallback.suitableInvestor,
      positionSizing: "Watchlist",
      earningsTrend: "Unknown",
      compositeScore: fallback.compositeScore,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    symbol: recommendation.symbol,
    companyName,
    recommendation:
      recommendation.action === "BUY"
        ? "Buy"
        : recommendation.action === "SELL"
          ? "Sell"
          : "Hold",
    confidenceScore: recommendation.confidence,
    aiConvictionScore: recommendation.conviction,
    reasonsToBuy:
      recommendation.action === "BUY" ? recommendation.reasons : [],
    reasonsNotToBuy:
      recommendation.action !== "BUY" ? recommendation.reasons : [],
    redFlags:
      recommendation.opposingStrategies.length > 0
        ? recommendation.opposingStrategies
        : fallback.redFlags,
    upcomingCatalysts: recommendation.evidence,
    timeHorizon:
      recommendation.category === "intraday" ? "Swing" : "1 Year",
    timeHorizonRationale: recommendation.holdingPeriod,
    suitableInvestor: fallback.suitableInvestor,
    positionSizing:
      recommendation.confidence >= 75
        ? "High Conviction"
        : recommendation.confidence >= 55
          ? "Medium Conviction"
          : "Watchlist",
    earningsTrend: recommendation.marketContext,
    compositeScore: recommendation.opportunityScore,
    generatedAt: recommendation.timestamp,
  };
}

async function loadCompareCompany(symbol: string): Promise<LoadedCompareCompany | null> {
  const normalized = normalizeNseSymbol(symbol);
  const prompt = `Compare ${normalized}`;
  const bundle = await loadInstitutionalBundle(normalized, prompt);
  if (!bundle) return null;

  const rating = buildInstitutionalRating({
    context: bundle.context,
    valuation: bundle.valuation,
    risk: bundle.risk,
    moat: bundle.moat,
    intelligence: bundle.intelligence,
  });

  const decisionScores = buildDecisionScores({
    context: bundle.context,
    valuation: bundle.valuation,
    risk: bundle.risk,
    moat: bundle.moat,
    intelligence: bundle.intelligence,
    ragChunks: bundle.ragChunks,
    opportunities: bundle.opportunities,
  });

  const scorecard = buildCompareScorecard({
    context: bundle.context,
    rating,
    valuation: bundle.valuation,
    risk: bundle.risk,
    moat: bundle.moat,
    decisionScores,
  });

  const decision = toCompareDecision(null, bundle.profile.name, normalized, {
    suitableInvestor: ["Value", "Growth"],
    redFlags: bundle.risk.redFlags.map((flag) => flag.label).slice(0, 5),
    compositeScore: decisionScores.compositeScore,
  });

  return {
    bundle,
    rating,
    decision,
    scorecard,
    overallScore: computeOverallCompareScore(scorecard),
  };
}

export function normalizeCompareSymbols(symbols: string[]): string[] {
  const normalized = [...new Set(symbols.map((s) => normalizeNseSymbol(s.trim())).filter(Boolean))];

  if (normalized.length < COMPARE_MIN_SYMBOLS) {
    throw new CompareEngineError(
      `At least ${COMPARE_MIN_SYMBOLS} companies are required for comparison.`,
      400
    );
  }

  if (normalized.length > COMPARE_MAX_SYMBOLS) {
    throw new CompareEngineError(
      `Maximum ${COMPARE_MAX_SYMBOLS} companies can be compared at once.`,
      400
    );
  }

  return normalized;
}

export async function buildCompareResult(symbols: string[]): Promise<CompareResult> {
  const normalized = normalizeCompareSymbols(symbols);
  await ensureOpportunityEngineState();
  const strategyRecommendations = fetchRecommendationsForSymbols(normalized);
  const loaded = await Promise.all(normalized.map((symbol) => loadCompareCompany(symbol)));
  const companies = loaded.filter((item): item is LoadedCompareCompany => item !== null);

  if (companies.length < COMPARE_MIN_SYMBOLS) {
    throw new CompareEngineError(
      `Could not load at least ${COMPARE_MIN_SYMBOLS} companies. Check symbols and try again.`,
      404
    );
  }

  const peerRows = rankComparePeers(
    companies.map((company) =>
      buildComparePeerRow({
        context: company.bundle.context,
        profile: company.bundle.profile,
        valuation: company.bundle.valuation,
        isCompany: true,
      })
    )
  );

  const snapshots: CompareCompanySnapshot[] = companies.map((company) => {
    const strategy = strategyRecommendations.get(
      company.bundle.profile.symbol.toUpperCase()
    );
    const decision = toCompareDecision(
      strategy ?? null,
      company.bundle.profile.name,
      company.bundle.profile.symbol,
      {
        suitableInvestor: company.decision.suitableInvestor,
        redFlags: company.decision.redFlags,
        compositeScore: company.decision.compositeScore,
      }
    );
    return {
      symbol: company.bundle.profile.symbol,
      name: company.bundle.profile.name,
      sector: company.bundle.profile.sector,
      industry: company.bundle.profile.industry,
      price: company.bundle.profile.price,
      marketCap: company.bundle.profile.marketCap,
      overallScore: company.overallScore,
      scorecard: company.scorecard,
      recommendation: decision.recommendation,
      confidenceScore: decision.confidenceScore,
      aiConvictionScore: decision.aiConvictionScore,
      suitableInvestor: decision.suitableInvestor,
      redFlags: decision.redFlags,
      decision,
    };
  });

  const rankings = rankCompareCompanies(
    snapshots.map((company) => ({
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      overallScore: company.overallScore,
      recommendation: company.recommendation,
      confidenceScore: company.confidenceScore,
    }))
  );

  const radar = buildRadarDimensions(
    snapshots.map((company) => ({
      symbol: company.symbol,
      scorecard: company.scorecard,
    }))
  );

  const strengthWeakness = buildStrengthWeaknessMatrix(
    snapshots.map((company) => ({
      symbol: company.symbol,
      name: company.name,
      scorecard: company.scorecard,
    }))
  );

  const recommendationMatrix = buildRecommendationMatrix(
    snapshots.map((company) => ({
      symbol: company.symbol,
      name: company.name,
      decision: company.decision,
    }))
  );

  const verdict = buildCompareAIVerdict({
    ranked: rankings,
    companies: snapshots.map((company) => ({
      symbol: company.symbol,
      name: company.name,
      scorecard: company.scorecard,
      decision: company.decision,
    })),
  });

  return {
    symbols: snapshots.map((c) => c.symbol),
    companies: snapshots,
    peers: peerRows,
    radar,
    rankings,
    strengthWeakness,
    recommendationMatrix,
    dimensionLeaders: findDimensionLeaders(
      snapshots.map((company) => ({
        symbol: company.symbol,
        name: company.name,
        scorecard: company.scorecard,
      }))
    ),
    verdict,
    generatedAt: new Date().toISOString(),
  };
}
