/**
 * Institutional AI Compare Engine — head-to-head comparison for 2–5 companies.
 */

import { CompareEngineError } from "@/lib/ai/core/errors";
import { loadInstitutionalBundle } from "@/lib/ai/institutional/loadBundle";
import {
  buildAIDecision,
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

  const decision = buildAIDecision({
    context: bundle.context,
    profile: bundle.profile,
    valuation: bundle.valuation,
    risk: bundle.risk,
    moat: bundle.moat,
    intelligence: bundle.intelligence,
    ragChunks: bundle.ragChunks,
    opportunities: bundle.opportunities,
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

  const snapshots: CompareCompanySnapshot[] = companies.map((company) => ({
    symbol: company.bundle.profile.symbol,
    name: company.bundle.profile.name,
    sector: company.bundle.profile.sector,
    industry: company.bundle.profile.industry,
    price: company.bundle.profile.price,
    marketCap: company.bundle.profile.marketCap,
    overallScore: company.overallScore,
    scorecard: company.scorecard,
    recommendation: company.decision.recommendation,
    confidenceScore: company.decision.confidenceScore,
    aiConvictionScore: company.decision.aiConvictionScore,
    suitableInvestor: company.decision.suitableInvestor,
    redFlags: company.decision.redFlags,
    decision: company.decision,
  }));

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
