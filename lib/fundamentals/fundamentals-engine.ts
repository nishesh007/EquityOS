/**
 * Financial Fundamentals Engine — Sprint 8C compute layer.
 * Orchestrates all scoring modules into a single FinancialFundamentals output.
 */

import { computeAltmanZScore } from "@/lib/fundamentals/altman";
import { computeBalanceSheetMetrics } from "@/lib/fundamentals/balance-sheet";
import { computeBeneishMScore } from "@/lib/fundamentals/beneish";
import { computeCapitalAllocationScore } from "@/lib/fundamentals/capital-allocation";
import { computeCashflowMetrics } from "@/lib/fundamentals/cashflow";
import { computeGrowthAnalysis } from "@/lib/fundamentals/growth";
import { computePiotroskiScore } from "@/lib/fundamentals/piotroski";
import { computeProfitabilityMetrics } from "@/lib/fundamentals/profitability";
import { computeQualityScore } from "@/lib/fundamentals/quality";
import { computeValuationAnalysis } from "@/lib/fundamentals/valuation";
import { parseInrCrores } from "@/lib/fundamentals/normalize";
import { formatCurrencyCr as formatCr } from "@/lib/fundamentals/registry";
import type {
  FinancialFundamentals,
  FundamentalsBundle,
} from "@/lib/fundamentals/types";
import type { CompanyFinancials, CompanyProfile } from "@/types";

export function computeFinancialFundamentals(
  bundle: FundamentalsBundle,
  profile?: Pick<
    CompanyProfile,
    "symbol" | "sector" | "marketCap" | "shareholding" | "financials"
  >
): FinancialFundamentals {
  const { statements, ratios, growth } = bundle;
  const sector = profile?.sector ?? bundle.sector;
  const financials = profile?.financials ?? bundle.financials;
  const marketCapDisplay = profile?.marketCap ?? bundle.marketCap;

  const revenueCr = parseInrCrores(financials.revenue);
  const netProfitCr = parseInrCrores(financials.netProfit);

  const profitability = computeProfitabilityMetrics({
    income: statements.income,
    balance: statements.balance,
    ratios,
    fallbackRoe: financials.roe,
    fallbackRoce: financials.roce,
  });

  const balanceSheet = computeBalanceSheetMetrics({
    balance: statements.balance,
    income: statements.income,
    ratios,
    sector,
  });

  const cashflow = computeCashflowMetrics({
    cashflow: statements.cashflow,
    income: statements.income,
    ratios,
    netProfitCr,
    revenueCr,
    roce: profitability.roce ?? financials.roce,
  });

  const growthAnalysis = computeGrowthAnalysis({
    income: statements.income,
    growth,
    fallbackRevenueGrowth: financials.revenueGrowth,
    fallbackProfitGrowth: financials.netProfitGrowth,
  });

  const valuation = computeValuationAnalysis({
    ratios,
    marketCapDisplay,
    profitGrowth: growthAnalysis.profitGrowth ?? financials.netProfitGrowth,
    fallbackPe: financials.pe,
    fallbackPb: financials.pb,
  });

  const capitalAllocationScore = computeCapitalAllocationScore({
    roe: profitability.roe,
    roce: profitability.roce,
    profitGrowth: growthAnalysis.profitGrowth,
    debtEquity: balanceSheet.debtEquity,
    fcfMargin: cashflow.fcfMargin,
    cashConversion: cashflow.cashConversion,
  });

  const qualityScore = computeQualityScore({
    profitabilityScore: profitability.profitabilityScore,
    financialStrength: balanceSheet.financialStrength,
    cashConversion: cashflow.cashConversion,
    revenueGrowth: growthAnalysis.revenueGrowth,
    profitGrowth: growthAnalysis.profitGrowth,
    promoterHolding: profile?.shareholding.promoter ?? bundle.shareholding.promoter,
  });

  const piotroski = computePiotroskiScore({
    income: statements.income,
    balance: statements.balance,
    cashflow: statements.cashflow,
    fallbackRoa: profitability.roa !== null ? profitability.roa / 100 : undefined,
  });

  const marketCapCr = parseInrCrores(marketCapDisplay);
  const altman = computeAltmanZScore({
    income: statements.income,
    balance: statements.balance,
    marketCapCr: marketCapCr > 0 ? marketCapCr : undefined,
    fallbackZ:
      balanceSheet.debtEquity !== null && profitability.roa !== null
        ? 2.4 + profitability.roa * 0.08 - balanceSheet.debtEquity * 0.5
        : undefined,
  });

  const beneish = computeBeneishMScore({
    income: statements.income,
    balance: statements.balance,
    fallbackM:
      growthAnalysis.profitGrowth !== null && growthAnalysis.revenueGrowth !== null
        ? -2.5 +
          (growthAnalysis.profitGrowth < growthAnalysis.revenueGrowth ? 0.3 : -0.1)
        : undefined,
  });

  return {
    symbol: profile?.symbol ?? bundle.symbol,
    computedAt: new Date().toISOString(),
    source: bundle.source,

    revenue: financials.revenue || "—",
    revenueCagr: growthAnalysis.revenueCagr,
    profitCagr: growthAnalysis.profitCagr,
    eps: profitability.eps,
    dilutedEps: profitability.dilutedEps,
    operatingMargin: profitability.operatingMargin,
    netMargin: profitability.netMargin,
    grossMargin: profitability.grossMargin,
    roe: profitability.roe,
    roce: profitability.roce,
    roa: profitability.roa,
    debtEquity: balanceSheet.debtEquity,
    interestCoverage: balanceSheet.interestCoverage,
    currentRatio: balanceSheet.currentRatio,
    quickRatio: balanceSheet.quickRatio,
    cashConversion: cashflow.cashConversion,
    fcf: formatCr(cashflow.fcfCr),
    fcfMargin: cashflow.fcfMargin,
    dividendYield: valuation.dividendYield,
    bookValue: valuation.bookValue,
    pe: valuation.pe,
    forwardPe: valuation.forwardPe,
    pb: valuation.pb,
    evEbitda: valuation.evEbitda,
    peg: valuation.peg,
    enterpriseValue: valuation.enterpriseValueDisplay,
    marketCap: valuation.marketCapDisplay,

    capitalAllocationScore,
    qualityScore,
    growthScore: growthAnalysis.growthScore,
    profitabilityScore: profitability.profitabilityScore,
    financialStrength: balanceSheet.financialStrength,
    valuationScore: valuation.valuationScore,

    piotroskiFScore: piotroski.rawScore,
    altmanZScore: altman.zScore,
    beneishMScore: beneish.mScore,
  };
}

/** Map engine output to legacy CompanyFinancials for existing UI components. */
export function enrichCompanyFinancials(
  fundamentals: FinancialFundamentals,
  existing: CompanyFinancials,
  yoyGrowth?: { revenueGrowth: number; profitGrowth: number }
): CompanyFinancials {
  return {
    revenue: fundamentals.revenue || existing.revenue || "—",
    revenueGrowth: yoyGrowth?.revenueGrowth ?? existing.revenueGrowth,
    netProfit: existing.netProfit || "—",
    netProfitGrowth: yoyGrowth?.profitGrowth ?? existing.netProfitGrowth,
    roe: fundamentals.roe ?? existing.roe,
    roce: fundamentals.roce ?? existing.roce,
    pe: fundamentals.pe ?? existing.pe,
    pb: fundamentals.pb ?? existing.pb,
    debtToEquity: fundamentals.debtEquity ?? existing.debtToEquity,
  };
}

export function attachFundamentalsToProfile(
  profile: CompanyProfile,
  bundle: FundamentalsBundle
): CompanyProfile {
  const fundamentals = computeFinancialFundamentals(bundle, profile);
  return {
    ...profile,
    fundamentals,
    financials: enrichCompanyFinancials(fundamentals, profile.financials, {
      revenueGrowth:
        bundle.growth.revenueGrowth || profile.financials.revenueGrowth,
      profitGrowth:
        bundle.growth.profitGrowth || profile.financials.netProfitGrowth,
    }),
  };
}
