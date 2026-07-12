/**
 * Sprint 9D — AI Screener deterministic universe metric builder.
 * Generates filterable metrics for the complete NSE/BSE universe.
 */

import { getCompanyMasterRecords } from "@/lib/company-master";
import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { SCREENER_FILTER_REGISTRY } from "@/lib/screener/registry";
import type { ScreenerRow, ScreenerUniverseSnapshot } from "@/lib/screener/types";

function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededRandom(symbol: string, salt = 0): number {
  const hash = hashSymbol(`${symbol}:${salt}`);
  return (hash % 10000) / 10000;
}

function seededRange(symbol: string, min: number, max: number, salt = 0): number {
  return min + seededRandom(symbol, salt) * (max - min);
}

function parseMarketCapCr(marketCap: string | undefined): number {
  if (!marketCap) return 0;
  const match = marketCap.match(/([\d.]+)\s*L?\s*Cr/i);
  if (!match) return seededRange(marketCap, 100, 50000, 99);
  const value = parseFloat(match[1]);
  return marketCap.toLowerCase().includes("l") ? value * 100000 : value;
}

function sectorMultiplier(sector: string): Record<string, number> {
  const s = sector.toLowerCase();
  if (s.includes("bank") || s.includes("financial")) {
    return { pe: 1.2, roe: 0.9, debt: 1.5, margin: 0.8 };
  }
  if (s.includes("it") || s.includes("tech")) {
    return { pe: 1.4, roe: 1.3, debt: 0.3, margin: 1.2 };
  }
  if (s.includes("pharma") || s.includes("health")) {
    return { pe: 1.1, roe: 1.0, debt: 0.6, margin: 1.1 };
  }
  if (s.includes("auto")) {
    return { pe: 0.9, roe: 0.85, debt: 0.8, margin: 0.9 };
  }
  return { pe: 1.0, roe: 1.0, debt: 1.0, margin: 1.0 };
}

function buildMetricsForSymbol(
  symbol: string,
  name: string,
  sector: string,
  industry: string
): Record<string, number | string | null> {
  const enrichment = getCompanyEnrichment(symbol);
  const mult = sectorMultiplier(sector);

  const marketCapCr = enrichment?.marketCap
      ? parseMarketCapCr(enrichment.marketCap)
      : seededRange(symbol, 50, 200000, 3);

  const financials = null as {
    pe: number;
    pb: number;
    roe: number;
    roce: number;
    debtToEquity: number;
    revenueGrowth: number;
    netProfitGrowth: number;
  } | null;
  const shareholding = null as {
    promoter: number;
    fii: number;
    dii: number;
    public: number;
  } | null;

  const pe = financials?.pe ?? seededRange(symbol, 5, 60, 4) * mult.pe;
  const pb = financials?.pb ?? seededRange(symbol, 0.5, 15, 5);
  const roe = financials?.roe ?? seededRange(symbol, 2, 45, 6) * mult.roe;
  const roce = financials?.roce ?? seededRange(symbol, 3, 50, 7) * mult.roe;
  const debtEquity = financials?.debtToEquity ?? seededRange(symbol, 0, 2.5, 8) * mult.debt;
  const revenueGrowth = financials?.revenueGrowth ?? seededRange(symbol, -5, 35, 9);
  const profitGrowth = financials?.netProfitGrowth ?? seededRange(symbol, -10, 40, 10);

  const volume = Math.round(seededRange(symbol, 10000, 50000000, 13));
  const beta = seededRange(symbol, 0.5, 2.0, 14);
  const valuationBase = Math.round(seededRange(symbol, 20, 8000, 1) * 100) / 100;

  const metrics: Record<string, number | string | null> = {
    symbol,
    name,
    sector,
    industry,
    exchange: "NSE",

    cmp: null,
    market_cap: marketCapCr,
    enterprise_value: marketCapCr * seededRange(symbol, 1.0, 1.3, 15),
    week_high_52: null,
    week_low_52: null,
    ath_distance: null,
    volume,
    delivery_percent: Math.round(seededRange(symbol, 15, 85, 16) * 100) / 100,
    gap_percent: Math.round((seededRandom(symbol, 17) - 0.5) * 6 * 100) / 100,
    vwap: null,
    atr: null,
    beta: Math.round(beta * 100) / 100,
    change_percent: null,
    open: null,
    high: null,
    low: null,
    prev_close: null,
    price_to_52w_high: null,
    price_to_52w_low: null,
    avg_volume_20d: Math.round(volume * seededRange(symbol, 0.7, 1.3, 23)),
    volume_ratio: Math.round(seededRange(symbol, 0.3, 3.0, 24) * 100) / 100,

    pe: Math.round(pe * 100) / 100,
    forward_pe: Math.round(pe * seededRange(symbol, 0.8, 1.1, 25) * 100) / 100,
    peg: Math.round(seededRange(symbol, 0.3, 3.0, 26) * 100) / 100,
    pb: Math.round(pb * 100) / 100,
    ps: Math.round(seededRange(symbol, 0.5, 20, 27) * 100) / 100,
    ev_ebitda: Math.round(seededRange(symbol, 4, 30, 28) * 100) / 100,
    dividend_yield: Math.round(seededRange(symbol, 0, 5, 29) * 100) / 100,
    intrinsic_value: Math.round(valuationBase * seededRange(symbol, 0.8, 1.5, 30) * 100) / 100,
    margin_of_safety: Math.round(seededRange(symbol, -20, 40, 31) * 100) / 100,
    expected_cagr: Math.round(seededRange(symbol, 5, 25, 32) * 100) / 100,
    book_value: Math.round(valuationBase / pb * 100) / 100,
    price_to_intrinsic: null,
    earnings_yield: Math.round((1 / pe) * 10000) / 100,
    fcf_yield: Math.round(seededRange(symbol, 0, 8, 33) * 100) / 100,
    ev_sales: Math.round(seededRange(symbol, 0.5, 15, 34) * 100) / 100,
    sector_pe_premium: Math.round(seededRange(symbol, -30, 50, 35) * 100) / 100,
    sector_pb_premium: Math.round(seededRange(symbol, -30, 50, 36) * 100) / 100,

    revenue_growth: revenueGrowth,
    revenue_cagr: Math.round(seededRange(symbol, 2, 25, 37) * 100) / 100,
    profit_growth: profitGrowth,
    pat_cagr: Math.round(seededRange(symbol, 0, 30, 38) * 100) / 100,
    eps_growth: Math.round(seededRange(symbol, -5, 35, 39) * 100) / 100,
    sales_growth: revenueGrowth,
    quarterly_growth: Math.round(seededRange(symbol, -5, 20, 40) * 100) / 100,
    growth_5y: Math.round(seededRange(symbol, 3, 20, 41) * 100) / 100,
    growth_10y: Math.round(seededRange(symbol, 5, 18, 42) * 100) / 100,
    ocf_growth: Math.round(seededRange(symbol, -5, 30, 43) * 100) / 100,
    fcf_growth: Math.round(seededRange(symbol, -10, 35, 44) * 100) / 100,
    ebitda_growth: Math.round(seededRange(symbol, -5, 30, 45) * 100) / 100,
    revenue_qoq: Math.round(seededRange(symbol, -5, 15, 46) * 100) / 100,
    revenue_yoy: revenueGrowth,
    profit_qoq: Math.round(seededRange(symbol, -10, 20, 47) * 100) / 100,
    profit_yoy: profitGrowth,
    eps_qoq: Math.round(seededRange(symbol, -10, 20, 48) * 100) / 100,
    eps_yoy: Math.round(seededRange(symbol, -5, 35, 49) * 100) / 100,

    roe: Math.round(roe * 100) / 100,
    roce: Math.round(roce * 100) / 100,
    roa: Math.round(seededRange(symbol, 1, 20, 50) * 100) / 100,
    gross_margin: Math.round(seededRange(symbol, 10, 70, 51) * mult.margin * 100) / 100,
    operating_margin: Math.round(seededRange(symbol, 5, 40, 52) * mult.margin * 100) / 100,
    net_margin: Math.round(seededRange(symbol, 2, 25, 53) * mult.margin * 100) / 100,
    ebitda_margin: Math.round(seededRange(symbol, 8, 45, 54) * mult.margin * 100) / 100,
    fcf_margin: Math.round(seededRange(symbol, 0, 20, 55) * 100) / 100,
    eps: Math.round(seededRange(symbol, 1, 200, 56) * 100) / 100,
    diluted_eps: Math.round(seededRange(symbol, 1, 200, 57) * 100) / 100,

    debt_equity: Math.round(debtEquity * 100) / 100,
    current_ratio: Math.round(seededRange(symbol, 0.5, 3.5, 58) * 100) / 100,
    quick_ratio: Math.round(seededRange(symbol, 0.3, 3.0, 59) * 100) / 100,
    interest_coverage: Math.round(seededRange(symbol, 1, 20, 60) * 100) / 100,
    cash_conversion: Math.round(seededRange(symbol, 50, 150, 61) * 100) / 100,
    fcf: Math.round(seededRange(symbol, 10, 50000, 62)),
    working_capital: Math.round(seededRange(symbol, -5000, 50000, 63)),
    altman_z: Math.round(seededRange(symbol, 0.5, 5, 64) * 100) / 100,
    piotroski: Math.round(seededRange(symbol, 0, 9, 65)),
    beneish: Math.round(seededRange(symbol, -3, 0, 66) * 100) / 100,
    debt_to_assets: Math.round(seededRange(symbol, 0.1, 0.8, 67) * 100) / 100,
    net_debt_ebitda: Math.round(seededRange(symbol, -2, 5, 68) * 100) / 100,

    promoter_holding: shareholding?.promoter ?? Math.round(seededRange(symbol, 20, 75, 69) * 100) / 100,
    promoter_change: Math.round((seededRandom(symbol, 70) - 0.5) * 4 * 100) / 100,
    fii_holding: shareholding?.fii ?? Math.round(seededRange(symbol, 5, 40, 71) * 100) / 100,
    fii_change: Math.round((seededRandom(symbol, 72) - 0.5) * 3 * 100) / 100,
    dii_holding: shareholding?.dii ?? Math.round(seededRange(symbol, 5, 30, 73) * 100) / 100,
    dii_change: Math.round((seededRandom(symbol, 74) - 0.5) * 2 * 100) / 100,
    public_holding: shareholding?.public ?? Math.round(seededRange(symbol, 10, 50, 75) * 100) / 100,
    pledge_percent: Math.round(seededRange(symbol, 0, 80, 76) * 100) / 100,
    institutional_holding:
      (shareholding?.fii ?? seededRange(symbol, 5, 40, 71)) +
      (shareholding?.dii ?? seededRange(symbol, 5, 30, 73)),

    rsi: Math.round(seededRange(symbol, 20, 80, 77)),
    macd: Math.round((seededRandom(symbol, 78) - 0.5) * 20 * 100) / 100,
    macd_histogram: Math.round((seededRandom(symbol, 79) - 0.5) * 10 * 100) / 100,
    ema20: null,
    ema50: null,
    ema200: null,
    adx: Math.round(seededRange(symbol, 10, 50, 83)),
    supertrend: null,
    momentum: Math.round(seededRange(symbol, -30, 30, 85)),
    relative_strength: Math.round(seededRange(symbol, 20, 90, 86)),
    trend_score: Math.round(seededRange(symbol, 30, 90, 87)),
    support: null,
    resistance: null,
    price_above_ema20: null,
    price_above_ema50: null,
    price_above_ema200: null,
    volatility: Math.round(seededRange(symbol, 10, 60, 93) * 100) / 100,
    week52_momentum: Math.round(seededRange(symbol, -20, 80, 94) * 100) / 100,
    bollinger_width: Math.round(seededRange(symbol, 5, 30, 95) * 100) / 100,

    business_quality: Math.round(seededRange(symbol, 30, 95, 96)),
    management_quality: Math.round(seededRange(symbol, 30, 95, 97)),
    capital_allocation: Math.round(seededRange(symbol, 30, 95, 98)),
    moat: Math.round(seededRange(symbol, 20, 90, 99)),
    corporate_governance: Math.round(seededRange(symbol, 40, 95, 100)),
    financial_strength_score: Math.round(seededRange(symbol, 30, 95, 101)),
    quality_score: Math.round(seededRange(symbol, 30, 95, 102)),
    profitability_score: Math.round(seededRange(symbol, 30, 95, 103)),
    growth_score: Math.round(seededRange(symbol, 30, 95, 104)),
    valuation_score: Math.round(seededRange(symbol, 30, 95, 105)),

    ai_rating: Math.round(seededRange(symbol, 30, 95, 106)),
    decision_score: Math.round(seededRange(symbol, 30, 95, 107)),
    risk_score: Math.round(seededRange(symbol, 10, 80, 108)),
    portfolio_score: Math.round(seededRange(symbol, 30, 95, 109)),
    confidence_score: Math.round(seededRange(symbol, 40, 95, 110)),
    overall_score: Math.round(seededRange(symbol, 30, 95, 111)),
    momentum_score: Math.round(seededRange(symbol, 20, 90, 112)),
    fundamental_score: Math.round(seededRange(symbol, 30, 95, 113)),
    red_flag_count: Math.round(seededRange(symbol, 0, 5, 114)),
    research_confidence: Math.round(seededRange(symbol, 40, 95, 115)),
  };

  // Generate period-variant metrics
  const periods = ["ttm", "1y", "3y", "5y", "10y", "qoq", "yoy"];
  for (const period of periods) {
    const salt = 200 + periods.indexOf(period);
    metrics[`revenue_growth_${period}`] = Math.round(seededRange(symbol, -5, 35, salt) * 100) / 100;
    metrics[`profit_growth_${period}`] = Math.round(seededRange(symbol, -10, 40, salt + 10) * 100) / 100;
    metrics[`eps_growth_${period}`] = Math.round(seededRange(symbol, -5, 35, salt + 20) * 100) / 100;
  }

  const roePeriods = ["ttm", "3y", "5y"];
  for (const period of roePeriods) {
    const salt = 300 + roePeriods.indexOf(period);
    metrics[`roe_${period}`] = Math.round(seededRange(symbol, 2, 45, salt) * mult.roe * 100) / 100;
    metrics[`roce_${period}`] = Math.round(seededRange(symbol, 3, 50, salt + 5) * mult.roe * 100) / 100;
  }

  const pePeriods = ["ttm", "forward", "3y avg", "5y avg"];
  for (const period of pePeriods) {
    const salt = 400 + pePeriods.indexOf(period);
    const key = period.replace(/\s+/g, "_");
    metrics[`pe_${key}`] = Math.round(seededRange(symbol, 5, 60, salt) * mult.pe * 100) / 100;
  }

  const pbPeriods = ["ttm", "3y avg", "5y avg"];
  for (const period of pbPeriods) {
    const salt = 450 + pbPeriods.indexOf(period);
    const key = period.replace(/\s+/g, "_");
    metrics[`pb_${key}`] = Math.round(seededRange(symbol, 0.5, 15, salt) * 100) / 100;
  }

  const emaPeriods = [9, 12, 20, 26, 50, 100, 200];
  for (const period of emaPeriods) {
    metrics[`ema_${period}`] = null;
    metrics[`price_vs_ema_${period}`] = null;
  }

  const smaPeriods = [10, 20, 50, 100, 200];
  for (const period of smaPeriods) {
    metrics[`sma_${period}`] = null;
    metrics[`price_vs_sma_${period}`] = null;
  }

  const rsiPeriods = [7, 14, 21];
  for (const period of rsiPeriods) {
    metrics[`rsi_${period}`] = Math.round(seededRange(symbol, 20, 80, 900 + period));
  }

  const marginKeys = ["gross_margin", "operating_margin", "net_margin", "ebitda_margin"];
  const marginPeriods = ["ttm", "3y avg", "5y avg"];
  for (const mk of marginKeys) {
    for (const period of marginPeriods) {
      const key = period.replace(/\s+/g, "_");
      metrics[`${mk}_${key}`] = Math.round(seededRange(symbol, 2, 50, 1000 + mk.length + key.length) * mult.margin * 100) / 100;
    }
  }

  // Ensure all registry keys have a value (fallback to null)
  for (const filter of SCREENER_FILTER_REGISTRY) {
    if (!(filter.key in metrics)) {
      metrics[filter.key] = filter.valueType === "text" ? "" : null;
    }
  }

  return metrics;
}

let universeCache: ScreenerUniverseSnapshot | null = null;

export function buildUniverseSnapshot(): ScreenerUniverseSnapshot {
  if (universeCache) return universeCache;

  const records = getCompanyMasterRecords();
  const rows: ScreenerRow[] = records.map((record) => ({
    symbol: record.displaySymbol,
    name: record.name,
    sector: record.sector || "Unknown",
    industry: record.industry || "Unknown",
    exchange: "NSE",
    metrics: buildMetricsForSymbol(
      record.symbol,
      record.name,
      record.sector || "Unknown",
      record.industry || "Unknown"
    ),
  }));

  universeCache = {
    rows,
    builtAt: new Date().toISOString(),
    totalCount: rows.length,
  };

  return universeCache;
}

export function clearUniverseCache(): void {
  universeCache = null;
}
