/**
 * Shared valuation utilities — sector multiples, verdict logic, input extraction.
 */

import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { amountToCrore, clamp, round } from "@/lib/engine/utils";
import { parseInrCrores } from "@/lib/fundamentals/normalize";
import { isValidMarketPrice } from "@/lib/utils";
import type { ValuationVerdict } from "@/types";
import type { ValuationInputs, IntrinsicValuationResult, ValuationModelResult } from "@/lib/valuation/types";

const CRORE = 10_000_000;

const SECTOR_PE: Record<string, number> = {
  Banking: 14,
  IT: 28,
  Pharma: 32,
  FMCG: 45,
  Auto: 22,
  Energy: 10,
  Metals: 12,
  Telecom: 18,
  Infrastructure: 16,
  Conglomerate: 22,
};

const SECTOR_PB: Record<string, number> = {
  Banking: 1.8,
  IT: 8,
  Pharma: 5,
  FMCG: 12,
  Auto: 4,
  Energy: 1.5,
  Metals: 2,
  Telecom: 3,
  Infrastructure: 2.5,
  Conglomerate: 2.5,
};

const SECTOR_EV_EBITDA: Record<string, number> = {
  Banking: 8,
  IT: 18,
  Pharma: 16,
  FMCG: 22,
  Auto: 12,
  Energy: 7,
  Metals: 8,
  Telecom: 10,
  Infrastructure: 11,
  Conglomerate: 12,
};

export function sectorPe(sector: string): number {
  return SECTOR_PE[sector] ?? 20;
}

export function sectorPb(sector: string): number {
  return SECTOR_PB[sector] ?? 3.5;
}

export function sectorEvEbitda(sector: string): number {
  return SECTOR_EV_EBITDA[sector] ?? 14;
}

export function fairPeFromGrowth(profitGrowth: number, sectorPeValue: number): number {
  const growthPremium = Math.min(15, Math.max(0, profitGrowth * 0.4));
  return round(sectorPeValue * 0.9 + growthPremium);
}

export function fairPbFromRoe(roe: number): number {
  return round(Math.max(1, roe / 8));
}

export function fairPeg(profitGrowth: number): number {
  return profitGrowth > 15 ? 1.0 : profitGrowth > 8 ? 1.2 : 1.5;
}

export function isCalculablePrice(price: number): boolean {
  return isValidMarketPrice(price);
}

/**
 * Convert total equity value (₹ Cr) to per-share price using market-cap ratio.
 * fairPerShare = (equityCr / marketCapCr) × currentPrice
 */
export function perShareFromEquityCr(
  equityCr: number,
  marketCapCr: number,
  currentPrice: number
): number {
  if (!isCalculablePrice(currentPrice)) return 0;
  if (!Number.isFinite(equityCr) || equityCr <= 0) return 0;
  if (!Number.isFinite(marketCapCr) || marketCapCr <= 0) return 0;
  const perShare = (equityCr / marketCapCr) * currentPrice;
  return sanitizePerSharePrice(perShare, currentPrice);
}

/**
 * Clamp fair value to a realistic band relative to current price.
 * Rejects absurd unit-mismatch outputs from bad provider data.
 */
export function sanitizePerSharePrice(fairValue: number, currentPrice: number): number {
  if (!Number.isFinite(fairValue) || fairValue <= 0) return 0;
  if (!isCalculablePrice(currentPrice)) return Math.round(fairValue);
  const min = currentPrice * 0.2;
  const max = currentPrice * 4.5;
  const clamped = Math.min(max, Math.max(min, fairValue));
  return Math.round(clamped);
}

export function verdictFromRatio(
  value: number,
  fair: number,
  lowerIsBetter = true
): ValuationVerdict {
  if (!Number.isFinite(value) || !Number.isFinite(fair) || fair <= 0) return "Fairly Valued";
  const ratio = value / fair;
  if (lowerIsBetter) {
    if (ratio <= 0.85) return "Undervalued";
    if (ratio >= 1.15) return "Overvalued";
    return "Fairly Valued";
  }
  if (ratio >= 1.15) return "Undervalued";
  if (ratio <= 0.85) return "Overvalued";
  return "Fairly Valued";
}

export function verdictFromPrice(price: number, fairValue: number): ValuationVerdict {
  if (!isCalculablePrice(price) || !Number.isFinite(fairValue) || fairValue <= 0) {
    return "Fairly Valued";
  }
  const ratio = price / fairValue;
  if (ratio <= 0.88) return "Undervalued";
  if (ratio >= 1.12) return "Overvalued";
  return "Fairly Valued";
}

/** MOS = (Intrinsic Value − Current Price) / Current Price × 100 */
export function marginOfSafety(intrinsicValue: number, currentPrice: number): number {
  if (!isCalculablePrice(currentPrice) || !Number.isFinite(intrinsicValue)) return 0;
  return round(((intrinsicValue - currentPrice) / currentPrice) * 100);
}

/** Upside = max(0, (Intrinsic − Price) / Price × 100) */
export function upsidePercent(intrinsicValue: number, currentPrice: number): number {
  if (!isCalculablePrice(currentPrice) || !Number.isFinite(intrinsicValue)) return 0;
  return round(Math.max(0, ((intrinsicValue - currentPrice) / currentPrice) * 100));
}

/** Downside = max(0, (Price − Intrinsic) / Price × 100) */
export function downsidePercent(intrinsicValue: number, currentPrice: number): number {
  if (!isCalculablePrice(currentPrice) || !Number.isFinite(intrinsicValue)) return 0;
  return round(Math.max(0, ((currentPrice - intrinsicValue) / currentPrice) * 100));
}

export function expectedCagr(
  profitGrowth: number,
  revenueGrowth: number,
  marginOfSafetyPct: number
): number {
  return round(
    Math.min(24, Math.max(4, profitGrowth * 0.55 + revenueGrowth * 0.25 + Math.max(0, marginOfSafetyPct) * 0.08 + 3))
  );
}

export function estimateWacc(beta: number, debtEquity: number): number {
  const riskFree = 7.0;
  const equityPremium = 6.0;
  const costOfEquity = riskFree + beta * equityPremium;
  const costOfDebt = 9.0;
  const taxRate = 0.25;
  const totalCapital = 1 + Math.max(0, debtEquity);
  const equityWeight = 1 / totalCapital;
  const debtWeight = Math.max(0, debtEquity) / totalCapital;
  return round(costOfEquity * equityWeight + costOfDebt * (1 - taxRate) * debtWeight, 2);
}

export function safeValue(value: number | null | undefined, fallback = 0): number {
  return Number.isFinite(value) && value !== null && value !== undefined ? value : fallback;
}

function resolveEps(
  price: number,
  pe: number,
  ffEps: number | null | undefined,
  annualEps: number | undefined,
  ratiosEps: number | undefined
): number {
  const candidates = [ffEps, annualEps, ratiosEps];
  for (const eps of candidates) {
    if (eps && eps > 0 && (!isCalculablePrice(price) || eps <= price * 3)) return eps;
  }
  if (isCalculablePrice(price) && pe > 0) return round(price / pe, 2);
  return 0;
}

function resolveBookValuePerShare(
  price: number,
  pb: number,
  ffBook: number | null | undefined,
  ratiosBook: number | undefined,
  eps: number
): number {
  if (isCalculablePrice(price) && pb > 0) return round(price / pb, 2);
  const candidates = [ffBook, ratiosBook];
  for (const bv of candidates) {
    if (bv && bv > 0 && (!isCalculablePrice(price) || bv <= price * 3)) return bv;
  }
  return eps > 0 ? round(eps * 0.65, 2) : 0;
}

function resolveMarketCapCr(
  ffMarketCap: string | undefined,
  profileMarketCap: string,
  price: number,
  pe: number,
  revenueCr: number
): number {
  if (ffMarketCap && ffMarketCap !== "—") {
    const cr = parseInrCrores(ffMarketCap);
    if (cr > 0) return cr;
  }
  if (profileMarketCap && profileMarketCap !== "—") {
    const cr = parseInrCrores(profileMarketCap);
    if (cr > 0) return cr;
  }
  if (isCalculablePrice(price) && pe > 0 && revenueCr > 0) {
    return revenueCr * pe * 0.08;
  }
  return revenueCr > 0 ? revenueCr * 3 : 0;
}

function resolveEnterpriseValueCr(
  ffEv: string | undefined,
  ratiosEv: number | undefined,
  marketCapCr: number
): number {
  if (ffEv && ffEv !== "—") {
    const cr = parseInrCrores(ffEv);
    if (cr > 0) return cr;
  }
  if (ratiosEv !== undefined && Number.isFinite(ratiosEv) && ratiosEv > 0) {
    if (ratiosEv > marketCapCr * 0.3 && ratiosEv < marketCapCr * 20) {
      return ratiosEv;
    }
    const asCrores = ratiosEv / CRORE;
    if (asCrores > 0) return asCrores;
  }
  return marketCapCr > 0 ? marketCapCr * 1.05 : 0;
}

export function extractValuationInputs(ctx: AnalysisContext): ValuationInputs {
  const { profile, bundle, fundamentals: ff } = ctx;
  const f = profile.financials;
  const ratios = bundle?.ratios;

  const price = safeValue(profile.price);
  const pe = safeValue(ff?.pe ?? f.pe ?? ratios?.pe);
  const pb = safeValue(ff?.pb ?? f.pb ?? ratios?.pb);
  const evEbitda = safeValue(ff?.evEbitda ?? ratios?.evToEbitda ?? (pe > 0 ? pe * 0.7 : 0));
  const peg = safeValue(
    ff?.peg ?? ratios?.peg ?? (f.netProfitGrowth > 0 && pe > 0 ? round(pe / f.netProfitGrowth, 2) : 0)
  );

  const revenueCr = amountToCrore(f.revenue);
  const netProfitCr = amountToCrore(f.netProfit);
  const eps = resolveEps(price, pe, ff?.eps, profile.annualFinancials[0]?.eps, ratios?.eps);
  const bookValuePerShare = resolveBookValuePerShare(price, pb, ff?.bookValue, ratios?.bookValue, eps);

  const marketCapCr = resolveMarketCapCr(ff?.marketCap, profile.marketCap, price, pe, revenueCr);
  const enterpriseValueCr = resolveEnterpriseValueCr(ff?.enterpriseValue, ratios?.enterpriseValue, marketCapCr);

  const sharesOutstanding =
    isCalculablePrice(price) && marketCapCr > 0
      ? Math.round((marketCapCr * CRORE) / price)
      : 0;

  const fcfCr =
    ff?.fcf && ff.fcf !== "—"
      ? amountToCrore(ff.fcf)
      : netProfitCr > 0
        ? Math.round(netProfitCr * 0.75)
        : 0;

  const operatingMargin = safeValue(
    ff?.operatingMargin ?? profile.quarterlyResults[0]?.margin ?? f.roce * 0.4
  );

  const revenueGrowth = safeValue(ff?.revenueCagr ?? f.revenueGrowth);
  const profitGrowth = safeValue(ff?.profitCagr ?? f.netProfitGrowth);
  const roe = safeValue(ff?.roe ?? f.roe);
  const roce = safeValue(ff?.roce ?? f.roce);
  const debtEquity = safeValue(ff?.debtEquity ?? f.debtToEquity);

  const peerPes = profile.peers.map((p) => p.pe).filter((v) => v > 0);
  const avgPeerPe = peerPes.length
    ? peerPes.reduce((a, b) => a + b, 0) / peerPes.length
    : sectorPe(profile.sector) * 0.95;

  const secPe = sectorPe(profile.sector);
  const secPb = sectorPb(profile.sector);
  const secEv = sectorEvEbitda(profile.sector);

  return {
    symbol: profile.symbol,
    name: profile.name,
    price,
    sector: profile.sector,
    industry: profile.industry,
    pe,
    pb,
    evEbitda,
    peg,
    eps,
    bookValuePerShare,
    revenueCr,
    netProfitCr,
    revenueGrowth,
    profitGrowth,
    roe,
    roce,
    debtEquity,
    operatingMargin,
    fcfCr,
    marketCapCr,
    enterpriseValueCr,
    sharesOutstanding,
    beta: 1.0,
    sectorPe: secPe,
    sectorPb: secPb,
    sectorEvEbitda: secEv,
    peerPe: avgPeerPe,
    peerPb: secPb * 0.95,
    peerEvEbitda: secEv * 0.92,
  };
}

export function weightedFairValue(
  models: { fairValue: number; weight: number }[]
): number {
  const valid = models.filter((m) => m.fairValue > 0 && Number.isFinite(m.fairValue));
  if (valid.length === 0) return 0;
  const totalWeight = valid.reduce((s, m) => s + m.weight, 0);
  if (totalWeight <= 0) return 0;
  const blended = valid.reduce((s, m) => s + m.fairValue * m.weight, 0) / totalWeight;
  return Number.isFinite(blended) ? Math.round(blended) : 0;
}

export function overallVerdictFromModels(verdicts: ValuationVerdict[]): ValuationVerdict {
  const counts = { Undervalued: 0, "Fairly Valued": 0, Overvalued: 0 };
  for (const v of verdicts) counts[v]++;
  if (counts.Undervalued > counts.Overvalued + 1) return "Undervalued";
  if (counts.Overvalued > counts.Undervalued + 1) return "Overvalued";
  return "Fairly Valued";
}

export function historicalPercentile(pe: number, profitGrowth: number): number {
  const base = 50;
  const peAdjustment = pe < 18 ? 15 : pe > 35 ? -15 : 0;
  const growthAdjustment = profitGrowth > 15 ? 10 : profitGrowth < 5 ? -10 : 0;
  return clamp(base + peAdjustment + growthAdjustment);
}

export function isValuationAvailable(
  price: number,
  models: { fairValue: number }[]
): boolean {
  return isCalculablePrice(price) && models.some((m) => m.fairValue > 0);
}

/** Map UI ValuationAnalysis back to intrinsic snapshot for downstream engines. */
export function toIntrinsicSnapshot(valuation: {
  intrinsicValue: number;
  estimatedFairValue: number;
  marginOfSafety: number;
  upsidePercent: number;
  expectedCagr: number;
  models: ValuationModelResult[];
  confidence: number;
  overallVerdict: ValuationVerdict;
  available: boolean;
}): IntrinsicValuationResult {
  return {
    intrinsicValue: valuation.intrinsicValue,
    fairValue: valuation.estimatedFairValue,
    marginOfSafety: valuation.marginOfSafety,
    upsidePercent: valuation.upsidePercent,
    expectedCagr: valuation.expectedCagr,
    models: valuation.models,
    blendedConfidence: valuation.confidence,
    overallVerdict: valuation.overallVerdict,
    available: valuation.available,
  };
}
