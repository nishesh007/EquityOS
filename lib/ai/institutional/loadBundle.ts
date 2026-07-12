/**
 * Institutional data bundle loader — single cached source for AI engines.
 */

import { loadCompanyContext } from "@/lib/ai/context/companyContext";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import { detectOpportunities } from "@/lib/engine/calculators/opportunities";
import { createAnalysisContext } from "@/lib/engine/analysis-context";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { fetchFundamentalsBundle } from "@/lib/fundamentals";
import type { FundamentalsBundle } from "@/lib/fundamentals/types";
import { retrieveInstitutionalContext } from "@/lib/rag/retriever";
import type { RetrievedChunk } from "@/lib/rag/retriever";
import { buildInstitutionalMoatAssessment } from "@/lib/research/moatEngine";
import { buildInstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import { buildInstitutionalValuation } from "@/lib/research/valuationEngine";
import { fetchCompanyProfile } from "@/services/companyData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import type { CompanyProfile, EquityIntelligence, Opportunity } from "@/types";
import type { InstitutionalMoatAssessment } from "@/lib/research/moatEngine";
import type { InstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";

export interface InstitutionalBundle {
  context: CompanyContext;
  profile: CompanyProfile;
  bundle: FundamentalsBundle | null;
  intelligence: EquityIntelligence | null;
  valuation: InstitutionalValuation;
  risk: InstitutionalRiskAssessment;
  moat: InstitutionalMoatAssessment;
  opportunities: Opportunity[];
  ragChunks: RetrievedChunk[];
  ragFormatted: string;
}

async function loadInstitutionalBundleUncached(
  symbol: string,
  prompt: string
): Promise<InstitutionalBundle | null> {
  const normalized = symbol.toUpperCase();

  const [context, profile, bundleResult, intelligence, rag] = await Promise.all([
    loadCompanyContext(normalized),
    fetchCompanyProfile(normalized),
    fetchFundamentalsBundle(normalized),
    fetchEquityIntelligence(normalized),
    retrieveInstitutionalContext({
      prompt,
      symbol: normalized,
      companies: [normalized],
      limit: 10,
    }),
  ]);

  if (!context || !profile) return null;

  const bundle = bundleResult?.data ?? null;
  const valuation = buildInstitutionalValuation(context, profile, bundle);
  const risk = buildInstitutionalRiskAssessment(context, profile, bundle);
  const moat = buildInstitutionalMoatAssessment(context, profile, intelligence);

  const analysisCtx = createAnalysisContext(
    profile,
    bundle ?? undefined,
    context.financialIntelligence?.fundamentals ?? profile.fundamentals
  );
  const opportunities = detectOpportunities(analysisCtx);

  return {
    context,
    profile,
    bundle,
    intelligence,
    valuation,
    risk,
    moat,
    opportunities,
    ragChunks: rag.chunks,
    ragFormatted: rag.formatted,
  };
}

export async function loadInstitutionalBundle(
  symbol: string,
  prompt?: string
): Promise<InstitutionalBundle | null> {
  const normalized = symbol.toUpperCase();
  const researchPrompt = prompt ?? `Analyse ${normalized}`;

  return getCached(
    {
      key: cacheKey("institutional-bundle", normalized, researchPrompt.slice(0, 120)),
      ttlMs: CACHE_TTL.RESEARCH,
    },
    () => loadInstitutionalBundleUncached(normalized, researchPrompt)
  );
}
