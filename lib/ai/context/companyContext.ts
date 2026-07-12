import {
  resolveSearchQuery,
  searchCompanies,
} from "@/lib/company-search";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { fetchFundamentalsBundle } from "@/lib/fundamentals";
import type {
  CorporateAction,
  EnrichedQuarterlyResult,
  EnrichedShareholding,
  FinancialRatios,
  FundamentalsBundle,
  GrowthMetrics,
} from "@/lib/fundamentals/types";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import {
  buildFinancialIntelligence,
  buildFinancialIntelligenceFromProfile,
  type FinancialIntelligence,
} from "@/lib/financials/financialEngine";
import { fetchCompanyProfile } from "@/services/companyData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import { fetchCompanyResearch } from "@/services/researchData";
import type {
  AnnualFinancial,
  CompanyNews,
  CompanyProfile,
  CompanyResearch,
  EquityIntelligence,
  InstitutionalPeer,
  QuarterlyResult,
  ResultsSummary,
  ShareholdingPattern,
  TechnicalAnalysis,
  ValuationMetric,
} from "@/types";

const MAX_NEWS_ITEMS = 8;
const MAX_CORPORATE_ACTIONS = 10;
const MAX_QUARTERLY_RESULTS = 8;
const MAX_ANNUAL_RESULTS = 6;
const MAX_RESOLVED_SYMBOLS = 5;

export interface CompanyContextProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  description: string;
  website: string;
  founded: string;
  employees: string;
}

export interface CompanyContextFinancialRatios {
  headline: CompanyProfile["financials"];
  ratios: FinancialRatios;
  growth: GrowthMetrics;
}

export interface CompanyContextPeer {
  symbol: string;
  name: string;
  isCompany: boolean;
  marketCap: string;
  pe: number;
  pb?: number;
  roe?: number;
  roce?: number;
  salesGrowth?: number;
  profitGrowth?: number;
  debt?: number;
  valuation?: InstitutionalPeer["valuation"];
  industryRank?: number;
}

export interface CompanyContextDataSource {
  provider: string;
  source: string;
  fetchedAt: string;
}

export interface CompanyContext {
  profile: CompanyContextProfile;
  financialIntelligence: FinancialIntelligence | null;
  financialRatios: CompanyContextFinancialRatios;
  quarterlyResults: EnrichedQuarterlyResult[];
  annualResults: AnnualFinancial[];
  shareholding: EnrichedShareholding;
  corporateActions: CorporateAction[];
  news: CompanyNews[];
  technicalIndicators: TechnicalAnalysis | null;
  peerComparison: CompanyContextPeer[];
  valuation: ValuationMetric[];
  latestResults: ResultsSummary | null;
  intelligence: {
    verdict: string;
    conviction: {
      overall: number;
      confidence: number;
      upside: number;
      downside: number;
    };
    summary: string;
  } | null;
  dataSource: CompanyContextDataSource;
  generatedAt: string;
}

function toEnrichedQuarterly(
  results: QuarterlyResult[]
): EnrichedQuarterlyResult[] {
  return results.map((result) => ({ ...result }));
}

function toEnrichedShareholding(
  shareholding: ShareholdingPattern
): EnrichedShareholding {
  return { ...shareholding };
}

function buildFinancialRatios(
  profile: CompanyProfile,
  bundle: FundamentalsBundle | null
): CompanyContextFinancialRatios {
  if (bundle) {
    return {
      headline: bundle.financials,
      ratios: bundle.ratios,
      growth: bundle.growth,
    };
  }

  const fundamentals = profile.fundamentals;

  return {
    headline: profile.financials,
    ratios: {
      pe: profile.financials.pe,
      pb: profile.financials.pb,
      roe: profile.financials.roe,
      roce: profile.financials.roce,
      debtToEquity: profile.financials.debtToEquity,
      eps: fundamentals?.eps ?? undefined,
      operatingMargin: fundamentals?.operatingMargin ?? undefined,
      netMargin: fundamentals?.netMargin ?? undefined,
      dividendYield: fundamentals?.dividendYield ?? undefined,
      evToEbitda: fundamentals?.evEbitda ?? undefined,
      freeCashFlow: fundamentals?.fcf
        ? Number.parseFloat(fundamentals.fcf.replace(/[^\d.-]/g, "")) || undefined
        : undefined,
    },
    growth: {
      revenueGrowth: profile.financials.revenueGrowth,
      profitGrowth: profile.financials.netProfitGrowth,
      epsGrowth: profile.financials.netProfitGrowth,
      operatingCashFlowGrowth: 0,
      freeCashFlowGrowth: 0,
      cagr3Year: fundamentals?.revenueCagr ?? profile.financials.revenueGrowth,
      cagr5Year: fundamentals?.profitCagr ?? profile.financials.netProfitGrowth,
    },
  };
}

function mapInstitutionalPeer(peer: InstitutionalPeer): CompanyContextPeer {
  return {
    symbol: peer.symbol,
    name: peer.name,
    isCompany: peer.isCompany,
    marketCap: peer.marketCap,
    pe: peer.pe,
    pb: peer.pb,
    roe: peer.roe,
    roce: peer.roce,
    salesGrowth: peer.salesGrowth,
    profitGrowth: peer.profitGrowth,
    debt: peer.debt,
    valuation: peer.valuation,
    industryRank: peer.industryRank,
  };
}

function buildPeerComparison(
  profile: CompanyProfile,
  intelligence: EquityIntelligence | null
): CompanyContextPeer[] {
  if (intelligence?.peers?.length) {
    return intelligence.peers.map(mapInstitutionalPeer);
  }

  const subject: CompanyContextPeer = {
    symbol: profile.symbol,
    name: profile.name,
    isCompany: true,
    marketCap: profile.marketCap,
    pe: profile.financials.pe,
    pb: profile.financials.pb,
    roe: profile.financials.roe,
    roce: profile.financials.roce,
    salesGrowth: profile.financials.revenueGrowth,
    profitGrowth: profile.financials.netProfitGrowth,
    debt: profile.financials.debtToEquity,
    industryRank: 1,
  };

  const peers = profile.peers.map((peer, index) => ({
    symbol: peer.symbol,
    name: peer.name,
    isCompany: false,
    marketCap: peer.marketCap,
    pe: peer.pe,
    industryRank: index + 2,
  }));

  return [subject, ...peers];
}

function mergeNews(
  profile: CompanyProfile,
  research: CompanyResearch | null
): CompanyNews[] {
  const merged = new Map<string, CompanyNews>();

  for (const item of profile.news) {
    merged.set(item.id, item);
  }

  for (const item of research?.news ?? []) {
    merged.set(item.id, item);
  }

  return [...merged.values()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, MAX_NEWS_ITEMS);
}

function normalizeCompanyContext(
  profile: CompanyProfile,
  bundle: FundamentalsBundle | null,
  research: CompanyResearch | null,
  intelligence: EquityIntelligence | null
): CompanyContext {
  const quarterlyResults = bundle?.quarterlyResults
    ? bundle.quarterlyResults.slice(0, MAX_QUARTERLY_RESULTS)
    : toEnrichedQuarterly(profile.quarterlyResults).slice(0, MAX_QUARTERLY_RESULTS);

  const annualResults = (bundle?.annualFinancials ?? profile.annualFinancials).slice(
    0,
    MAX_ANNUAL_RESULTS
  );

  const shareholding = bundle?.shareholding
    ? bundle.shareholding
    : toEnrichedShareholding(profile.shareholding);

  const corporateActions = (bundle?.corporateActions ?? []).slice(
    0,
    MAX_CORPORATE_ACTIONS
  );

  const financialIntelligence = bundle
    ? buildFinancialIntelligence(bundle, profile)
    : buildFinancialIntelligenceFromProfile(profile);

  return {
    profile: {
      symbol: profile.symbol,
      name: profile.name,
      sector: profile.sector,
      industry: profile.industry,
      price: profile.price,
      change: profile.change,
      changePercent: profile.changePercent,
      marketCap: profile.marketCap,
      description: profile.description,
      website: profile.website,
      founded: profile.founded,
      employees: profile.employees,
    },
    financialIntelligence,
    financialRatios: buildFinancialRatios(profile, bundle),
    quarterlyResults,
    annualResults,
    shareholding,
    corporateActions,
    news: mergeNews(profile, research),
    technicalIndicators: research?.technicals ?? null,
    peerComparison: buildPeerComparison(profile, intelligence),
    valuation: bundle?.valuation ?? profile.valuation,
    latestResults: research?.results ?? null,
    intelligence: intelligence
      ? {
          verdict: intelligence.decision.verdict,
          conviction: {
            overall: intelligence.decision.conviction.overall,
            confidence: intelligence.decision.conviction.confidence,
            upside: intelligence.decision.conviction.upside,
            downside: intelligence.decision.conviction.downside,
          },
          summary: intelligence.summary.summary,
        }
      : null,
    dataSource: {
      provider: bundle?.provider ?? intelligence?.dataTransparency.provider ?? "EquityOS",
      source: bundle?.source ?? intelligence?.dataTransparency.dataSource ?? "company-profile",
      fetchedAt: bundle?.fetchedAt ?? intelligence?.dataTransparency.lastUpdated ?? new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
  };
}

export function resolveSymbolsFromPrompt(
  prompt: string,
  explicitSymbol: string | null
): string[] {
  if (explicitSymbol) {
    return [normalizeNseSymbol(explicitSymbol)];
  }

  const symbols = new Set<string>();
  const segments = prompt.split(/\b(?:vs?\.?|versus|compare|and|,)\b/i);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const direct = resolveSearchQuery(trimmed);
    if (direct) {
      symbols.add(direct.displaySymbol);
      continue;
    }

    const topMatch = searchCompanies(trimmed, 1)[0];
    if (topMatch) symbols.add(topMatch.displaySymbol);
  }

  if (symbols.size === 0) {
    const fallback =
      resolveSearchQuery(prompt) ?? searchCompanies(prompt, 1)[0] ?? null;
    if (fallback) symbols.add(fallback.displaySymbol);
  }

  return [...symbols].slice(0, MAX_RESOLVED_SYMBOLS);
}

export async function loadCompanyContext(
  symbol: string
): Promise<CompanyContext | null> {
  const normalized = normalizeNseSymbol(symbol);

  return getCached(
    {
      key: cacheKey("ai-company-context", normalized),
      ttlMs: CACHE_TTL.FIVE_MINUTES,
    },
    async () => {
      const [profile, bundleResult, research, intelligence] = await Promise.all([
        fetchCompanyProfile(normalized),
        fetchFundamentalsBundle(normalized),
        fetchCompanyResearch(normalized),
        fetchEquityIntelligence(normalized),
      ]);

      if (!profile) return null;

      return normalizeCompanyContext(
        profile,
        bundleResult?.data ?? null,
        research,
        intelligence
      );
    }
  );
}

export async function loadCompanyContexts(
  prompt: string,
  symbol: string | null
): Promise<CompanyContext[]> {
  const symbols = resolveSymbolsFromPrompt(prompt, symbol);
  if (symbols.length === 0) return [];

  const contexts = await Promise.all(symbols.map((sym) => loadCompanyContext(sym)));

  return contexts.filter(
    (context): context is CompanyContext => context !== null
  );
}
