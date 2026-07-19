import { fetchCompanyProfile } from "@/services/companyData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import { fetchPortfolioSummary } from "@/services/marketData";
import { EquityIntelligenceEngine } from "@/lib/engine";
import type { PortfolioHoldingContext } from "@/lib/engine/calculators/portfolio-doctor";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import type { PortfolioDoctorAnalysis } from "@/types";

const CASH_PERCENT = 0;

async function enrichHoldings(): Promise<PortfolioHoldingContext[]> {
  const portfolio = await fetchPortfolioSummary();
  const totalValue = portfolio.totalValue;

  const contexts = await Promise.all(
    portfolio.holdings.map(async (holding) => {
      const [profile, intelligence] = await Promise.all([
        fetchCompanyProfile(holding.symbol),
        fetchEquityIntelligence(holding.symbol),
      ]);

      if (!profile || !intelligence) return null;

      const value = holding.currentPrice * holding.quantity;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;

      return {
        holding,
        weight,
        profile,
        intelligence,
      } satisfies PortfolioHoldingContext;
    })
  );

  return contexts.filter((ctx): ctx is PortfolioHoldingContext => ctx !== null);
}

export async function fetchPortfolioDoctorAnalysis(): Promise<PortfolioDoctorAnalysis | null> {
  return getCached(
    { key: cacheKey("portfolio-doctor"), ttlMs: CACHE_TTL.QUOTE },
    async () => {
      const holdings = await enrichHoldings();
      if (holdings.length === 0) return null;

      const dataTransparency = EquityIntelligenceEngine.buildDataTransparency({
        provider: holdings[0].intelligence.dataTransparency.provider,
        source: holdings[0].intelligence.dataTransparency.freshness === "live"
          ? "live"
          : holdings[0].intelligence.dataTransparency.freshness === "delayed"
            ? "cached"
            : "unavailable",
        fetchedAt: new Date().toISOString(),
        dataSource: "Portfolio Doctor · Equity Intelligence Engine",
        ttlMs: CACHE_TTL.RESEARCH,
      });

      return EquityIntelligenceEngine.buildPortfolioDoctorAnalysis({
        holdings,
        cashPercent: CASH_PERCENT,
        dataTransparency,
      });
    }
  );
}
