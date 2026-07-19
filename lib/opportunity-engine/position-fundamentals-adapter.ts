/**
 * Adapt Opportunity Engine scan metrics into Position / Earnings strategy inputs.
 * Reuses existing typed contracts — does not rewrite strategy detection logic.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { BuffettStrategyInput } from "@/src/modules/strategies/buffett/BuffettTypes";
import type { EarningsMomentumStrategyInput } from "@/src/modules/strategies/earningsMomentum/EarningsMomentumTypes";
import type { GrahamStrategyInput } from "@/src/modules/strategies/graham/GrahamTypes";
import type { MagicFormulaStrategyInput } from "@/src/modules/strategies/magicFormula/MagicFormulaTypes";
import type { PeterLynchStrategyInput } from "@/src/modules/strategies/peterLynch/PeterLynchTypes";
import type { QualityCompounderStrategyInput } from "@/src/modules/strategies/qualityCompounder/QualityCompounderTypes";
import type { StrategyMarketInput } from "@/src/modules/strategies";
import type { OhlcBar } from "@/lib/providers/types";

function n(
  candidate: OpportunityCandidate,
  key: string,
  fallback = 0
): number {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function s(candidate: OpportunityCandidate, key: string, fallback = ""): string {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function yearSeries(
  candidate: OpportunityCandidate,
  price: number
): Array<{
  year: number;
  revenue: number;
  eps: number;
  bookValue: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  operatingProfit: number;
  netProfit: number;
  ebit: number;
  operatingIncome: number;
  netIncome: number;
}> {
  const growth = n(candidate, "revenue_growth", 8) / 100;
  const roe = n(candidate, "roe", 14);
  const eps = price / Math.max(n(candidate, "pe", 20), 1);
  const baseRevenue = Math.max(price * 10, 1_000);
  const year = new Date().getFullYear();
  return [0, 1, 2, 3, 4].map((offset) => {
    const factor = Math.pow(1 + growth, 4 - offset);
    const revenue = baseRevenue * factor;
    const yearEps = eps * factor;
    const book = yearEps * Math.max(roe / 10, 1);
    const ocf = revenue * 0.12;
    const fcf = revenue * 0.08;
    const ebit = revenue * 0.15;
    return {
      year: year - (4 - offset),
      revenue,
      eps: yearEps,
      bookValue: book,
      operatingCashFlow: ocf,
      freeCashFlow: fcf,
      operatingProfit: ebit,
      netProfit: revenue * 0.1,
      ebit,
      operatingIncome: ebit,
      netIncome: revenue * 0.1,
    };
  });
}

function dated(candles: readonly OhlcBar[]) {
  return candles.map((c) => ({
    timestamp: new Date(c.timestamp),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

function scoreFromMetrics(candidate: OpportunityCandidate, bias = 55): number {
  const fund = n(candidate, "fundamental_score", bias);
  const trend = n(candidate, "trend_score", bias);
  return Math.max(1, Math.min(100, Math.round((fund + trend) / 2)));
}

export function buildEarningsMomentumInput(
  base: StrategyMarketInput,
  candidate: OpportunityCandidate,
  candles: readonly OhlcBar[]
): EarningsMomentumStrategyInput {
  const price = base.lastPrice;
  const growth = n(candidate, "revenue_growth", 10);
  const eps = price / Math.max(n(candidate, "pe", 22), 1);
  return {
    ...base,
    earningsMomentum: {
      candlesDaily: dated(candles),
      vwap: n(candidate, "vwap", price),
      atr: n(candidate, "atr", price * 0.02),
      ema20: n(candidate, "ema20", price),
      ema50: n(candidate, "ema50", price),
      relativeVolume: n(candidate, "volume_ratio", 1),
      averageVolume20d: n(candidate, "avg_volume_20d"),
      relativeStrength: n(candidate, "relative_strength"),
      lastPrice: price,
      fundamentals: {
        epsActual: eps * 1.08,
        epsEstimate: eps,
        revenueActual: price * 12 * (1 + growth / 100),
        revenueEstimate: price * 12,
        ebitda: price * 2,
        ebitdaPrior: price * 1.8,
        operatingMargin: 18,
        operatingMarginPrior: 16,
        netProfit: price * 1.2,
        patGrowth: growth,
        revenueGrowthYoy: growth,
        revenueGrowthQoq: growth / 4,
        epsGrowthYoy: growth,
        epsGrowthQoq: growth / 4,
        guidance: growth >= 8 ? "upgrade" : growth <= 0 ? "downgrade" : "inline",
        estimateRevision: growth / 10,
        managementCommentaryPositive: growth > 0,
        institutionalBuying: n(candidate, "delivery_percent", 40) > 45,
      },
    },
  };
}

export function buildBuffettInput(
  base: StrategyMarketInput,
  candidate: OpportunityCandidate
): BuffettStrategyInput {
  const price = base.lastPrice;
  const history = yearSeries(candidate, price);
  const score = scoreFromMetrics(candidate, 62);
  return {
    ...base,
    buffett: {
      financialHistory: history.map((row) => ({
        year: row.year,
        revenue: row.revenue,
        eps: row.eps,
        operatingProfit: row.operatingProfit,
        netProfit: row.netProfit,
        operatingCashFlow: row.operatingCashFlow,
        freeCashFlow: row.freeCashFlow,
        grossMargin: 40,
        operatingMargin: 18,
        netMargin: 12,
        roe: n(candidate, "roe", 16),
        roce: n(candidate, "roe", 15),
        roic: n(candidate, "roe", 14),
        debt: price * 2,
        equity: price * 5,
        bookValue: row.bookValue,
      })),
      current: {
        currentPrice: price,
        intrinsicValueEstimate: price * (1 + n(candidate, "fundamental_score", 50) / 200),
        roe: n(candidate, "roe", 16),
        roce: n(candidate, "roe", 15),
        roic: n(candidate, "roe", 14),
        debtEquity: 0.4,
        currentRatio: 1.8,
        interestCoverage: 8,
        grossMargin: 40,
        operatingMargin: 18,
        netMargin: 12,
        bookValue: history[history.length - 1]?.bookValue ?? price * 0.4,
        pe: n(candidate, "pe", 22),
        pb: 3,
        evEbitda: 14,
        fcfYield: 4,
        promoterHolding: 45,
        promoterPledge: 2,
        institutionalHolding: 28,
        sector: s(candidate, "sector", candidate.company),
        industry: s(candidate, "industry", "Unknown"),
        dividendHistoryYears: 5,
        shareBuybacks: true,
        governanceRedFlags: false,
        accountingConcerns: false,
      },
      moat: {
        brandStrength: score,
        networkEffects: score - 5,
        switchingCosts: score - 4,
        costLeadership: score - 6,
        patents: score - 10,
        distributionAdvantage: score - 3,
        marketShare: score,
        pricingPower: score - 2,
        recurringRevenue: score - 1,
        industryLeadership: score,
      },
      management: {
        capitalAllocation: score,
        corporateGovernance: score,
        promoterIntegrity: score,
        shareholderFriendliness: score - 2,
        dividendPolicy: score - 4,
        buybackQuality: score - 5,
        accountingQuality: score,
        relatedPartyRisk: Math.max(5, 100 - score),
      },
    },
  };
}

export function buildGrahamInput(
  base: StrategyMarketInput,
  candidate: OpportunityCandidate
): GrahamStrategyInput {
  const price = base.lastPrice;
  const history = yearSeries(candidate, price);
  const book = history[history.length - 1]?.bookValue ?? price * 0.5;
  return {
    ...base,
    graham: {
      financialHistory: history.map((row) => ({
        year: row.year,
        revenue: row.revenue,
        eps: row.eps,
        bookValue: row.bookValue,
        tangibleBookValue: row.bookValue * 0.9,
        operatingCashFlow: row.operatingCashFlow,
        freeCashFlow: row.freeCashFlow,
        dividendPerShare: row.eps * 0.25,
      })),
      current: {
        currentPrice: price,
        intrinsicValueEstimate: book * 1.4,
        bookValue: book,
        tangibleBookValue: book * 0.9,
        currentAssets: price * 8,
        currentLiabilities: price * 4,
        totalAssets: price * 20,
        totalLiabilities: price * 8,
        workingCapital: price * 4,
        cash: price * 2,
        debt: price * 3,
        debtEquity: 0.45,
        currentRatio: 2,
        quickRatio: 1.4,
        interestCoverage: 7,
        operatingCashFlow: history[history.length - 1]?.operatingCashFlow ?? price,
        freeCashFlow: history[history.length - 1]?.freeCashFlow ?? price * 0.7,
        pe: n(candidate, "pe", 18),
        pb: price / Math.max(book, 1),
        evEbitda: 12,
        marketCap: price * 1e8,
        promoterHolding: 40,
        institutionalHolding: 25,
        dividendHistoryYears: 8,
        governanceRedFlags: false,
        accountingConcerns: false,
        corporateGovernanceScore: scoreFromMetrics(candidate, 60),
      },
    },
  };
}

export function buildPeterLynchInput(
  base: StrategyMarketInput,
  candidate: OpportunityCandidate
): PeterLynchStrategyInput {
  const price = base.lastPrice;
  const history = yearSeries(candidate, price);
  const score = scoreFromMetrics(candidate, 58);
  const growth = n(candidate, "revenue_growth", 12);
  const pe = n(candidate, "pe", 22);
  return {
    ...base,
    peterLynch: {
      financialHistory: history.map((row) => ({
        year: row.year,
        revenue: row.revenue,
        eps: row.eps,
        netProfit: row.netProfit,
        operatingProfit: row.operatingProfit,
        operatingCashFlow: row.operatingCashFlow,
        freeCashFlow: row.freeCashFlow,
        operatingMargin: 16,
        netMargin: 11,
        grossMargin: 38,
      })),
      current: {
        currentPrice: price,
        intrinsicValueEstimate: price * (1 + growth / 100),
        revenueCagr: growth,
        epsCagr: growth,
        pe,
        peg: pe / Math.max(growth, 1),
        pb: 4,
        evEbitda: 15,
        dividendYield: 1.2,
        roe: n(candidate, "roe", 15),
        roce: n(candidate, "roe", 14),
        roic: n(candidate, "roe", 13),
        debtEquity: 0.5,
        currentRatio: 1.7,
        interestCoverage: 6,
        grossMargin: 38,
        operatingMargin: 16,
        netMargin: 11,
        freeCashFlow: history[history.length - 1]?.freeCashFlow ?? price,
        operatingCashFlow: history[history.length - 1]?.operatingCashFlow ?? price,
        marketCap: price * 1e8,
        institutionalHolding: 24,
        promoterHolding: 42,
        promoterPledge: 1,
        sector: s(candidate, "sector", "Unknown"),
        industry: s(candidate, "industry", "Unknown"),
        corporateGovernanceScore: score,
        analystGrowthEstimate: growth,
        governanceRedFlags: false,
        accountingConcerns: false,
      },
      business: {
        scalableBusiness: score,
        marketOpportunity: score,
        competitivePosition: score - 2,
        brandStrength: score - 3,
        productLeadership: score - 4,
        innovation: score - 5,
        customerRetention: score - 2,
        recurringRevenue: score - 1,
      },
    },
  };
}

export function buildMagicFormulaInput(
  base: StrategyMarketInput,
  candidate: OpportunityCandidate
): MagicFormulaStrategyInput {
  const price = base.lastPrice;
  const history = yearSeries(candidate, price);
  const last = history[history.length - 1]!;
  return {
    ...base,
    magicFormula: {
      financialHistory: history.map((row) => ({
        year: row.year,
        revenue: row.revenue,
        ebit: row.ebit,
        ebitda: row.ebit * 1.2,
        operatingIncome: row.operatingIncome,
        netIncome: row.netIncome,
        operatingCashFlow: row.operatingCashFlow,
        freeCashFlow: row.freeCashFlow,
      })),
      current: {
        currentPrice: price,
        enterpriseValue: price * 1.2e8,
        marketCap: price * 1e8,
        ebit: last.ebit,
        ebitda: last.ebit * 1.2,
        revenue: last.revenue,
        operatingIncome: last.operatingIncome,
        netIncome: last.netIncome,
        cash: price * 3,
        debt: price * 2,
        workingCapital: price * 4,
        fixedAssets: price * 10,
        currentAssets: price * 8,
        currentLiabilities: price * 4,
        operatingCashFlow: last.operatingCashFlow,
        freeCashFlow: last.freeCashFlow,
        roe: n(candidate, "roe", 16),
        roce: n(candidate, "roe", 15),
        roic: n(candidate, "roe", 14),
        pe: n(candidate, "pe", 18),
        pb: 3,
        evEbitda: 11,
        dividendYield: 1.5,
        debtEquity: 0.4,
        currentRatio: 1.9,
        institutionalHolding: 26,
        promoterHolding: 38,
        corporateGovernanceScore: scoreFromMetrics(candidate, 60),
        sector: s(candidate, "sector", "Unknown"),
        industry: s(candidate, "industry", "Unknown"),
        governanceRedFlags: false,
        accountingConcerns: false,
      },
    },
  };
}

export function buildQualityCompounderInput(
  base: StrategyMarketInput,
  candidate: OpportunityCandidate
): QualityCompounderStrategyInput {
  const price = base.lastPrice;
  const history = yearSeries(candidate, price);
  const score = scoreFromMetrics(candidate, 64);
  const growth = n(candidate, "revenue_growth", 14);
  const last = history[history.length - 1]!;
  return {
    ...base,
    qualityCompounder: {
      financialHistory: history.map((row) => ({
        year: row.year,
        revenue: row.revenue,
        eps: row.eps,
        operatingProfit: row.operatingProfit,
        operatingCashFlow: row.operatingCashFlow,
        freeCashFlow: row.freeCashFlow,
        grossMargin: 42,
        operatingMargin: 20,
        netMargin: 14,
        roe: n(candidate, "roe", 18),
        roce: n(candidate, "roe", 17),
        roic: n(candidate, "roe", 16),
        bookValue: row.bookValue,
      })),
      current: {
        currentPrice: price,
        intrinsicValueEstimate: price * 1.15,
        revenueCagr: growth,
        epsCagr: growth,
        pe: n(candidate, "pe", 28),
        pb: 5,
        peg: n(candidate, "pe", 28) / Math.max(growth, 1),
        evEbitda: 18,
        fcfYield: 3.5,
        roe: n(candidate, "roe", 18),
        roce: n(candidate, "roe", 17),
        roic: n(candidate, "roe", 16),
        debtEquity: 0.3,
        currentRatio: 2.1,
        interestCoverage: 12,
        grossMargin: 42,
        operatingMargin: 20,
        netMargin: 14,
        bookValue: last.bookValue,
        freeCashFlow: last.freeCashFlow,
        operatingCashFlow: last.operatingCashFlow,
        dividendHistoryYears: 6,
        shareBuybacks: true,
        promoterHolding: 48,
        promoterPledge: 0,
        institutionalHolding: 30,
        sector: s(candidate, "sector", "Unknown"),
        industry: s(candidate, "industry", "Unknown"),
        corporateGovernanceScore: score,
        marketShare: score / 2,
        analystGrowthEstimate: growth,
        governanceRedFlags: false,
        accountingConcerns: false,
        businessDisruption: false,
      },
      business: {
        businessSimplicity: score,
        businessPredictability: score,
        recurringRevenue: score - 2,
        pricingPower: score - 3,
        brandStrength: score,
        distributionNetwork: score - 4,
        customerStickiness: score - 2,
        marketLeadership: score,
        scalability: score - 1,
        industryPosition: score,
      },
      moat: {
        brand: score,
        networkEffects: score - 8,
        switchingCosts: score - 5,
        costAdvantage: score - 6,
        patents: score - 12,
        distribution: score - 4,
        technology: score - 7,
        regulatoryAdvantage: score - 10,
        scaleAdvantage: score - 3,
        recurringCustomers: score - 2,
      },
      management: {
        integrity: score,
        capitalAllocation: score,
        governance: score,
        promoterQuality: score,
        accountingQuality: score,
        shareholderAlignment: score - 2,
        communication: score - 3,
        executionTrackRecord: score,
      },
      capital: {
        roic: n(candidate, "roe", 16),
        reinvestmentRate: 55,
        buybackQuality: score - 5,
        dividendPolicy: score - 4,
        acquisitionHistory: score - 8,
        debtManagement: score,
        cashAllocation: score - 2,
        shareDilutionRisk: Math.max(5, 100 - score),
      },
    },
  };
}
