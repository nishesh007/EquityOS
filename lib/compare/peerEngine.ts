/**
 * Compare peer engine — builds institutional peer rows from live company data.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { CompanyProfile } from "@/types";
import type { InstitutionalPeer } from "@/types";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";

function valuationLabel(
  pe: number,
  verdict: InstitutionalValuation["analysis"]["overallVerdict"]
): InstitutionalPeer["valuation"] {
  if (verdict === "Undervalued" || pe < 18) return "Attractive";
  if (verdict === "Overvalued" || pe > 35) return "Premium";
  return "Fair";
}

export function buildComparePeerRow(input: {
  context: CompanyContext;
  profile: CompanyProfile;
  valuation: InstitutionalValuation;
  isCompany?: boolean;
}): InstitutionalPeer {
  const fi = input.context.financialIntelligence;
  const financials = input.profile.financials;

  const pe = fi?.ratios.pe ?? financials.pe;
  const pb = fi?.ratios.pb ?? financials.pb;
  const roe = fi?.ratios.roe ?? financials.roe;
  const roce = fi?.ratios.roce ?? financials.roce;
  const salesGrowth = fi?.ratios.revenueGrowthYoY ?? financials.revenueGrowth;
  const profitGrowth = fi?.ratios.profitGrowthYoY ?? financials.netProfitGrowth;
  const debt = fi?.ratios.debtToEquity ?? financials.debtToEquity;

  return {
    symbol: input.profile.symbol,
    name: input.profile.name,
    isCompany: input.isCompany ?? true,
    pe: round(pe, 1),
    pb: round(pb, 1),
    roe: round(roe, 1),
    roce: round(roce, 1),
    salesGrowth: round(salesGrowth, 1),
    profitGrowth: round(profitGrowth, 1),
    debt: round(debt, 2),
    marketCap: input.profile.marketCap,
    valuation: valuationLabel(pe, input.valuation.analysis.overallVerdict),
    industryRank: 0,
  };
}

export function rankComparePeers(peers: InstitutionalPeer[]): InstitutionalPeer[] {
  const ranked = [...peers].sort((left, right) => {
    const leftScore =
      left.roe * 0.25 +
      left.roce * 0.25 +
      left.salesGrowth * 0.2 +
      left.profitGrowth * 0.2 -
      left.debt * 5 -
      (left.valuation === "Premium" ? 8 : left.valuation === "Fair" ? 2 : 0);
    const rightScore =
      right.roe * 0.25 +
      right.roce * 0.25 +
      right.salesGrowth * 0.2 +
      right.profitGrowth * 0.2 -
      right.debt * 5 -
      (right.valuation === "Premium" ? 8 : right.valuation === "Fair" ? 2 : 0);
    return rightScore - leftScore;
  });

  return ranked.map((peer, index) => ({
    ...peer,
    industryRank: index + 1,
  }));
}

export function buildSectorRanking(
  companies: Array<{
    symbol: string;
    name: string;
    sector: string;
    overallScore: number;
  }>
): Array<{
  symbol: string;
  name: string;
  sector: string;
  overallScore: number;
  sectorRank: number;
  compareRank: number;
}> {
  const bySector = new Map<string, typeof companies>();

  for (const company of companies) {
    const bucket = bySector.get(company.sector) ?? [];
    bucket.push(company);
    bySector.set(company.sector, bucket);
  }

  const sectorRanks = new Map<string, number>();
  for (const [, bucket] of bySector) {
    const sorted = [...bucket].sort((a, b) => b.overallScore - a.overallScore);
    sorted.forEach((item, index) => sectorRanks.set(item.symbol, index + 1));
  }

  const compareSorted = [...companies].sort((a, b) => b.overallScore - a.overallScore);

  return compareSorted.map((company, index) => ({
    ...company,
    sectorRank: sectorRanks.get(company.symbol) ?? index + 1,
    compareRank: index + 1,
  }));
}

export function derivePeerLeader(peers: InstitutionalPeer[]): {
  symbol: string;
  name: string;
  industryRank: number;
} | null {
  if (peers.length === 0) return null;
  const leader = peers.reduce((best, peer) =>
    peer.industryRank < best.industryRank ? peer : best
  );
  return {
    symbol: leader.symbol,
    name: leader.name,
    industryRank: leader.industryRank,
  };
}
