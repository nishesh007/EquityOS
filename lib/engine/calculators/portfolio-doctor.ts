/**
 * Portfolio Doctor — institutional-grade portfolio-level analysis engine.
 * Aggregates per-holding Equity Intelligence into portfolio health, risk,
 * diversification, diagnostics, and rebalancing recommendations.
 */

import { amountToCrore, clamp, round, toneForScore } from "@/lib/engine/utils";
import type {
  CompanyProfile,
  DataTransparency,
  DiagnosticSeverity,
  DiversificationAnalysis,
  DiversificationGrade,
  EquityIntelligence,
  MarketCapTier,
  PortfolioDiagnostic,
  PortfolioDoctorAnalysis,
  PortfolioDoctorSummary,
  PortfolioHealthFactor,
  PortfolioHealthScore,
  PortfolioHealthVerdict,
  PortfolioHolding,
  PortfolioQualityMetrics,
  PortfolioRecommendation,
  PortfolioRiskEngine,
  PortfolioRiskMetric,
  PositionSizingItem,
  PositionWeightStatus,
  RebalancingAllocationItem,
  RebalancingSimulator,
  RiskLevelLabel,
  ScoreTone,
  SectorAllocationItem,
} from "@/types";

const HEALTH_WEIGHTS = {
  quality: 0.2,
  diversification: 0.2,
  valuation: 0.15,
  momentum: 0.15,
  risk: 0.2,
  cashAllocation: 0.1,
};

const CAGR_MIN = 0;
const CAGR_MAX = 35;

const IDEAL_SECTOR_WEIGHTS: Record<string, number> = {
  IT: 18,
  Banking: 16,
  Pharma: 12,
  FMCG: 10,
  Auto: 8,
  Telecom: 6,
  Infrastructure: 6,
  NBFC: 5,
  Conglomerate: 8,
  Energy: 6,
  Metals: 5,
};

const CYCLICAL_SECTORS = new Set([
  "Auto",
  "Metals",
  "Infrastructure",
  "Energy",
  "Real Estate",
  "Cement",
]);

const SECTOR_COLORS = [
  "#6366f1",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
];

export interface PortfolioHoldingContext {
  holding: PortfolioHolding;
  weight: number;
  profile: CompanyProfile;
  intelligence: EquityIntelligence;
}

export interface PortfolioDoctorInput {
  holdings: PortfolioHoldingContext[];
  cashPercent?: number;
  dataTransparency: DataTransparency;
}

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return round(clamp(value, 0, 100));
}

function clampCagr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return round(clamp(value, CAGR_MIN, CAGR_MAX), 1);
}

function healthVerdict(score: number): PortfolioHealthVerdict {
  const normalized = normalizeScore(score);
  if (normalized >= 80) return "Excellent Portfolio";
  if (normalized >= 65) return "Healthy Portfolio";
  if (normalized >= 50) return "Needs Improvement";
  if (normalized >= 35) return "Weak Portfolio";
  return "High Risk Portfolio";
}

function riskLevelLabel(score: number): RiskLevelLabel {
  const normalized = normalizeScore(score);
  if (normalized <= 25) return "Low";
  if (normalized <= 50) return "Medium";
  if (normalized <= 75) return "High";
  return "Very High";
}

function riskInterpretation(score: number): string {
  const normalized = normalizeScore(score);
  if (normalized <= 20) return "Very Low Risk";
  if (normalized <= 40) return "Low Risk";
  if (normalized <= 60) return "Moderate Risk";
  if (normalized <= 80) return "High Risk";
  return "Very High Risk";
}

function riskTone(score: number): ScoreTone {
  const normalized = normalizeScore(score);
  if (normalized <= 35) return "gain";
  if (normalized <= 55) return "accent";
  return "loss";
}

function weightedAverage(
  items: PortfolioHoldingContext[],
  selector: (ctx: PortfolioHoldingContext) => number
): number {
  if (items.length === 0) return 0;
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = items.reduce(
    (sum, item) => sum + normalizeScore(selector(item)) * item.weight,
    0
  );
  return normalizeScore(weighted / totalWeight);
}

function parseMarketCapTier(marketCap: string): MarketCapTier {
  const crore = amountToCrore(marketCap);
  if (crore >= 500_000) return "Large";
  if (crore >= 50_000) return "Mid";
  return "Small";
}

function diversificationGrade(hhi: number, maxConcentration: number): DiversificationGrade {
  if (hhi < 0.12 && maxConcentration < 25) return "A";
  if (hhi < 0.18 && maxConcentration < 30) return "B";
  if (hhi < 0.25 && maxConcentration < 35) return "C";
  if (hhi < 0.35 && maxConcentration < 40) return "D";
  return "F";
}

function severityFromScore(score: number, invert = false): DiagnosticSeverity {
  const effective = invert ? 100 - score : score;
  if (effective >= 65) return "green";
  if (effective >= 40) return "yellow";
  return "red";
}

function riskMetric(
  key: string,
  label: string,
  rawScore: number,
  explanation: string
): PortfolioRiskMetric {
  const score = normalizeScore(rawScore);
  return {
    key,
    label,
    score,
    level: riskLevelLabel(score),
    tone: riskTone(score),
    explanation,
  };
}

function buildDiversification(holdings: PortfolioHoldingContext[]): DiversificationAnalysis {
  const sectorMap = new Map<string, number>();
  const capMap = new Map<MarketCapTier, number>();

  let maxWeight = 0;
  let maxSymbol = "";

  for (const item of holdings) {
    const sector = item.profile.sector || "Other";
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + item.weight);
    const tier = parseMarketCapTier(item.profile.marketCap);
    capMap.set(tier, (capMap.get(tier) ?? 0) + item.weight);
    if (item.weight > maxWeight) {
      maxWeight = item.weight;
      maxSymbol = item.holding.symbol;
    }
  }

  const sorted = [...holdings].sort((a, b) => b.weight - a.weight);
  const top5 = sorted.slice(0, 5).reduce((sum, h) => sum + h.weight, 0);
  const hhi = holdings.reduce((sum, h) => sum + (h.weight / 100) ** 2, 0);

  const allSectors = new Set([
    ...sectorMap.keys(),
    ...Object.keys(IDEAL_SECTOR_WEIGHTS),
  ]);

  const sectorAllocation: SectorAllocationItem[] = [...allSectors].map((sector) => {
    const current = round(sectorMap.get(sector) ?? 0);
    const ideal = IDEAL_SECTOR_WEIGHTS[sector] ?? round(100 / allSectors.size);
    const difference = round(current - ideal);
    const tone: ScoreTone =
      Math.abs(difference) <= 5 ? "gain" : Math.abs(difference) <= 12 ? "accent" : "loss";
    return { sector, currentPercent: current, idealPercent: ideal, difference, tone };
  }).sort((a, b) => b.currentPercent - a.currentPercent);

  const largeCapPercent = round(capMap.get("Large") ?? 0);
  const midCapPercent = round(capMap.get("Mid") ?? 0);
  const smallCapPercent = round(capMap.get("Small") ?? 0);

  const grade = diversificationGrade(hhi, maxWeight);
  const score = diversificationScore({ grade, maxSingleStockPercent: round(maxWeight) });

  return {
    score,
    sectorAllocation,
    marketCapAllocation: (["Large", "Mid", "Small"] as MarketCapTier[]).map((tier) => ({
      tier,
      percent: round(capMap.get(tier) ?? 0),
    })),
    largeCapPercent,
    midCapPercent,
    smallCapPercent,
    maxSingleStockPercent: round(maxWeight),
    maxSingleStockSymbol: maxSymbol,
    top5HoldingsPercent: round(top5),
    grade,
    gradeExplanation:
      grade === "A"
        ? "Well-diversified across sectors and position sizes."
        : grade === "B"
          ? "Reasonably diversified with minor concentration pockets."
          : grade === "C"
            ? "Moderate concentration — consider spreading across more sectors."
            : grade === "D"
              ? "High concentration risk in a few names or sectors."
              : "Severely concentrated — urgent diversification needed.",
    herfindahlIndex: round(hhi, 3),
  };
}

function diversificationScore(diversification: {
  grade: DiversificationGrade;
  maxSingleStockPercent: number;
}): number {
  const gradeScores: Record<DiversificationGrade, number> = {
    A: 92,
    B: 78,
    C: 62,
    D: 45,
    F: 28,
  };
  const concentrationPenalty = normalizeScore(
    100 - diversification.maxSingleStockPercent * 1.8
  );
  return normalizeScore(
    gradeScores[diversification.grade] * 0.6 + concentrationPenalty * 0.4
  );
}

function buildHealthScore(
  holdings: PortfolioHoldingContext[],
  diversification: DiversificationAnalysis,
  cashPercent: number
): PortfolioHealthScore {
  const divScore = normalizeScore(diversification.score);
  const qualityScore = weightedAverage(
    holdings,
    (h) => h.intelligence.financialQuality.overallScore
  );
  const valuationScore = weightedAverage(
    holdings,
    (h) => h.intelligence.decision.valuation.overallScore
  );
  const momentumScore = weightedAverage(holdings, (h) => {
    const factor = h.intelligence.score.factors.find((f) => f.key === "momentum");
    return factor?.score ?? h.intelligence.decision.technical.overallScore;
  });
  const portfolioRiskMeter = weightedAverage(
    holdings,
    (h) => h.intelligence.decision.risk.overallRiskMeter
  );
  const riskScore = normalizeScore(100 - portfolioRiskMeter);
  const idealCash = 8;
  const cashScore = normalizeScore(100 - Math.abs(cashPercent - idealCash) * 8);

  const factors: PortfolioHealthFactor[] = [
    {
      key: "quality",
      label: "Quality",
      score: qualityScore,
      weight: HEALTH_WEIGHTS.quality,
      tone: toneForScore(qualityScore),
      explanation: "Value-weighted average financial quality across holdings.",
    },
    {
      key: "diversification",
      label: "Diversification",
      score: divScore,
      weight: HEALTH_WEIGHTS.diversification,
      tone: toneForScore(divScore),
      explanation: `Grade ${diversification.grade} — top holding at ${diversification.maxSingleStockPercent}%.`,
    },
    {
      key: "valuation",
      label: "Valuation",
      score: valuationScore,
      weight: HEALTH_WEIGHTS.valuation,
      tone: toneForScore(valuationScore),
      explanation: "Aggregate valuation attractiveness of current positions.",
    },
    {
      key: "momentum",
      label: "Momentum",
      score: momentumScore,
      weight: HEALTH_WEIGHTS.momentum,
      tone: toneForScore(momentumScore),
      explanation: "Portfolio-wide price and earnings momentum.",
    },
    {
      key: "risk",
      label: "Risk",
      score: riskScore,
      weight: HEALTH_WEIGHTS.risk,
      tone: toneForScore(riskScore),
      explanation: "Inverse of aggregate portfolio risk exposure across holdings.",
    },
    {
      key: "cash-allocation",
      label: "Cash Allocation",
      score: cashScore,
      weight: HEALTH_WEIGHTS.cashAllocation,
      tone: toneForScore(cashScore),
      explanation: `Current cash ${cashPercent}% vs ideal ~${idealCash}% buffer.`,
    },
  ];

  const overall = normalizeScore(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  const summary =
    overall >= 75
      ? "Portfolio is in strong health with balanced risk-return characteristics."
      : overall >= 60
        ? "Portfolio is fundamentally sound but has areas for improvement."
        : overall >= 45
          ? "Portfolio needs attention — concentration or quality gaps detected."
          : "Portfolio health is weak — review diversification and position quality urgently.";

  return { overall, verdict: healthVerdict(overall), factors, summary };
}

function buildRiskEngine(
  holdings: PortfolioHoldingContext[],
  diversification: DiversificationAnalysis
): PortfolioRiskEngine {
  const maxConc = diversification.maxSingleStockPercent;
  const concentrationRisk = riskMetric(
    "concentration",
    "Concentration Risk",
    clamp(maxConc * 2.2 + diversification.top5HoldingsPercent * 0.3, 10, 95),
    `Largest position ${diversification.maxSingleStockSymbol} at ${maxConc}%; top 5 at ${diversification.top5HoldingsPercent}%.`
  );

  const volatilityRisk = riskMetric(
    "volatility",
    "Volatility Risk",
    weightedAverage(holdings, (h) => h.intelligence.decision.risk.overallRiskMeter),
    "Weighted average of per-holding volatility and downside risk meters."
  );

  const topSector = diversification.sectorAllocation[0];
  const sectorRisk = riskMetric(
    "sector",
    "Sector Risk",
    clamp((topSector?.currentPercent ?? 0) * 1.6, 10, 90),
    topSector
      ? `Largest sector exposure: ${topSector.sector} at ${topSector.currentPercent}%.`
      : "Sector exposure is distributed."
  );

  const sectorCount = diversification.sectorAllocation.filter((s) => s.currentPercent > 0).length;
  const correlationRisk = riskMetric(
    "correlation",
    "Correlation Risk",
    clamp(70 - sectorCount * 8 + (topSector?.currentPercent ?? 0) * 0.5, 15, 85),
    "Estimated correlation based on sector overlap and holding count."
  );

  const drawdownRisk = riskMetric(
    "drawdown",
    "Drawdown Risk",
    weightedAverage(holdings, (h) => {
      const momentum = h.intelligence.score.factors.find((f) => f.key === "momentum");
      return clamp(100 - (momentum?.score ?? 50), 15, 90);
    }),
    "Downside exposure based on momentum weakness and risk snapshots."
  );

  const liquidityRisk = riskMetric(
    "liquidity",
    "Liquidity Risk",
    clamp(
      diversification.smallCapPercent * 1.5 +
        diversification.midCapPercent * 0.5 +
        (100 - diversification.largeCapPercent) * 0.3,
      10,
      80
    ),
    `Large-cap ${diversification.largeCapPercent}%, mid ${diversification.midCapPercent}%, small ${diversification.smallCapPercent}%.`
  );

  const overallRisk = normalizeScore(
    concentrationRisk.score * 0.22 +
      volatilityRisk.score * 0.2 +
      sectorRisk.score * 0.18 +
      correlationRisk.score * 0.15 +
      drawdownRisk.score * 0.15 +
      liquidityRisk.score * 0.1
  );
  const overallTone = riskTone(overallRisk);
  const overallRiskLabel = riskInterpretation(overallRisk);

  return {
    concentrationRisk,
    volatilityRisk,
    sectorRisk,
    correlationRisk,
    drawdownRisk,
    liquidityRisk,
    overallRisk,
    overallRiskLabel,
    overallTone,
    summary:
      overallRisk <= 20
        ? "Risk profile is well-contained for a long-term equity portfolio."
        : overallRisk <= 40
          ? "Low risk — portfolio structure is broadly stable."
          : overallRisk <= 60
            ? "Moderate risk — monitor sector and concentration drift."
            : overallRisk <= 80
              ? "High risk — concentration and sector imbalances need action."
              : "Very high risk — urgent portfolio restructuring recommended.",
  };
}

function buildDiagnostics(holdings: PortfolioHoldingContext[]): PortfolioDiagnostic[] {
  const diagnostics: PortfolioDiagnostic[] = [];
  const sectorMap = new Map<string, { weight: number; symbols: string[] }>();

  for (const item of holdings) {
    const sector = item.profile.sector || "Other";
    const entry = sectorMap.get(sector) ?? { weight: 0, symbols: [] };
    entry.weight += item.weight;
    entry.symbols.push(item.holding.symbol);
    sectorMap.set(sector, entry);
  }

  const itExposure = sectorMap.get("IT");
  if (itExposure && itExposure.weight > 25) {
    diagnostics.push({
      key: "it-exposure",
      label: "Too much IT exposure",
      severity: itExposure.weight > 35 ? "red" : "yellow",
      description: `IT sector at ${round(itExposure.weight)}% — above recommended 18% ideal.`,
      affectedSymbols: itExposure.symbols,
    });
  }

  const bankingExposure = sectorMap.get("Banking");
  if (bankingExposure && bankingExposure.weight > 30) {
    diagnostics.push({
      key: "banking-exposure",
      label: "Too much Banking",
      severity: bankingExposure.weight > 40 ? "red" : "yellow",
      description: `Banking sector at ${round(bankingExposure.weight)}% — rate-cycle sensitivity elevated.`,
      affectedSymbols: bankingExposure.symbols,
    });
  }

  let cyclicalWeight = 0;
  const cyclicalSymbols: string[] = [];
  for (const [sector, data] of sectorMap) {
    if (CYCLICAL_SECTORS.has(sector)) {
      cyclicalWeight += data.weight;
      cyclicalSymbols.push(...data.symbols);
    }
  }
  if (cyclicalWeight > 30) {
    diagnostics.push({
      key: "cyclical-exposure",
      label: "Too many cyclicals",
      severity: cyclicalWeight > 45 ? "red" : "yellow",
      description: `Cyclical sectors at ${round(cyclicalWeight)}% — economic downturn vulnerability.`,
      affectedSymbols: cyclicalSymbols,
    });
  }

  const weakHoldings = holdings.filter((h) => h.intelligence.score.overall < 45);
  if (weakHoldings.length > 0) {
    diagnostics.push({
      key: "weak-companies",
      label: "Weak companies",
      severity: weakHoldings.length >= 2 ? "red" : "yellow",
      description: `${weakHoldings.length} holding(s) below quality threshold (score < 45).`,
      affectedSymbols: weakHoldings.map((h) => h.holding.symbol),
    });
  }

  const lowRoce = holdings.filter((h) => h.profile.financials.roce < 12);
  if (lowRoce.length > 0) {
    diagnostics.push({
      key: "low-roce",
      label: "Low ROCE businesses",
      severity: lowRoce.length >= 2 ? "red" : "yellow",
      description: `${lowRoce.length} holding(s) with ROCE below 12% — capital efficiency concern.`,
      affectedSymbols: lowRoce.map((h) => h.holding.symbol),
    });
  }

  const poorEarnings = holdings.filter(
    (h) => h.intelligence.financialQuality.overallScore < 50
  );
  if (poorEarnings.length > 0) {
    diagnostics.push({
      key: "poor-earnings",
      label: "Poor earnings quality",
      severity: poorEarnings.length >= 2 ? "red" : "yellow",
      description: `${poorEarnings.length} holding(s) with sub-par earnings quality scores.`,
      affectedSymbols: poorEarnings.map((h) => h.holding.symbol),
    });
  }

  const expensive = holdings.filter(
    (h) => h.intelligence.valuation.overallVerdict === "Overvalued"
  );
  if (expensive.length > 0) {
    diagnostics.push({
      key: "expensive-holdings",
      label: "Expensive holdings",
      severity: expensive.length >= 2 ? "red" : "yellow",
      description: `${expensive.length} holding(s) trading above fair value estimates.`,
      affectedSymbols: expensive.map((h) => h.holding.symbol),
    });
  }

  const lossMaking = holdings.filter((h) => h.profile.financials.netProfitGrowth < -5);
  if (lossMaking.length > 0) {
    diagnostics.push({
      key: "loss-making",
      label: "Loss making holdings",
      severity: "red",
      description: `${lossMaking.length} holding(s) with declining earnings trajectory.`,
      affectedSymbols: lossMaking.map((h) => h.holding.symbol),
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      key: "all-clear",
      label: "No major issues",
      severity: "green",
      description: "Portfolio diagnostics show no material red flags at current thresholds.",
    });
  }

  return diagnostics;
}

function buildRecommendations(
  holdings: PortfolioHoldingContext[],
  diversification: DiversificationAnalysis,
  diagnostics: PortfolioDiagnostic[],
  cashPercent: number
): PortfolioRecommendation[] {
  const recs: PortfolioRecommendation[] = [];
  let id = 1;

  const topSector = diversification.sectorAllocation.find((s) => s.difference > 8);
  if (topSector) {
    recs.push({
      id: String(id++),
      action: `Reduce exposure to ${topSector.sector}`,
      reasoning: `${topSector.sector} is ${topSector.difference}% above ideal allocation — trim to improve balance.`,
      priority: topSector.difference > 15 ? "high" : "medium",
      tone: "loss",
    });
  }

  const underweightSectors = diversification.sectorAllocation
    .filter((s) => s.difference < -5 && s.idealPercent >= 8)
    .sort((a, b) => a.difference - b.difference);

  if (underweightSectors.length > 0) {
    const target = underweightSectors[0];
    recs.push({
      id: String(id++),
      action: `Increase exposure to ${target.sector}`,
      reasoning: `${target.sector} is ${Math.abs(target.difference)}% below ideal — adds defensive diversification.`,
      priority: "medium",
      tone: "gain",
    });
  }

  if (cashPercent < 5) {
    recs.push({
      id: String(id++),
      action: "Increase cash",
      reasoning: `Cash buffer at ${cashPercent}% is below 8% ideal — build dry powder for volatility.`,
      priority: "medium",
      tone: "accent",
    });
  }

  const hasCyclical = diagnostics.some((d) => d.key === "cyclical-exposure");
  if (hasCyclical) {
    recs.push({
      id: String(id++),
      action: "Add Defensive",
      reasoning: "High cyclical weight — add FMCG or Pharma to stabilise portfolio beta.",
      priority: "high",
      tone: "gain",
    });
  }

  const expensive = holdings.filter(
    (h) => h.intelligence.valuation.overallVerdict === "Overvalued" && h.weight > 15
  );
  for (const item of expensive.slice(0, 2)) {
    recs.push({
      id: String(id++),
      action: `Book partial profits in ${item.holding.symbol}`,
      reasoning: `${item.holding.name} is overvalued at ${round(item.weight)}% weight — lock gains and rebalance.`,
      priority: "medium",
      tone: "accent",
    });
  }

  const weak = holdings.filter((h) => h.intelligence.score.overall < 45);
  if (weak.length > 0) {
    recs.push({
      id: String(id++),
      action: "Average only quality stocks",
      reasoning: `Avoid averaging down in ${weak.map((h) => h.holding.symbol).join(", ")} — quality scores are weak.`,
      priority: "high",
      tone: "loss",
    });
  }

  if (diversification.grade === "D" || diversification.grade === "F") {
    recs.push({
      id: String(id++),
      action: "Improve diversification",
      reasoning: `Diversification grade ${diversification.grade} — spread across more sectors and cap sizes.`,
      priority: "high",
      tone: "accent",
    });
  }

  return recs.slice(0, 8);
}

function computeSuggestedWeights(
  holdings: PortfolioHoldingContext[]
): Map<string, number> {
  const qualityScores = holdings.map((h) => ({
    symbol: h.holding.symbol,
    score: h.intelligence.score.overall,
  }));
  const totalQuality = qualityScores.reduce((sum, q) => sum + q.score, 0);

  const suggested = new Map<string, number>();
  for (const item of holdings) {
    const qualityWeight = (item.intelligence.score.overall / totalQuality) * 100;
    const equalWeight = 100 / holdings.length;
    const blended = qualityWeight * 0.6 + equalWeight * 0.4;
    suggested.set(item.holding.symbol, round(blended));
  }

  const total = [...suggested.values()].reduce((sum, w) => sum + w, 0);
  for (const [symbol, weight] of suggested) {
    suggested.set(symbol, round((weight / total) * 100));
  }

  return suggested;
}

function buildRebalancing(
  holdings: PortfolioHoldingContext[],
  suggestedWeights: Map<string, number>
): RebalancingSimulator {
  const currentAllocation: RebalancingAllocationItem[] = holdings.map((h) => ({
    symbol: h.holding.symbol,
    name: h.holding.name,
    currentPercent: round(h.weight),
    suggestedPercent: suggestedWeights.get(h.holding.symbol) ?? round(h.weight),
    change: round(
      (suggestedWeights.get(h.holding.symbol) ?? h.weight) - h.weight
    ),
  }));

  const suggestedAllocation = [...currentAllocation].sort(
    (a, b) => b.suggestedPercent - a.suggestedPercent
  );

  const majorChanges = currentAllocation.filter((a) => Math.abs(a.change) >= 3);
  const summary =
    majorChanges.length > 0
      ? `${majorChanges.length} position(s) need rebalancing by 3%+ to align with quality-weighted targets.`
      : "Portfolio is close to suggested allocation — minor tweaks only.";

  return { currentAllocation, suggestedAllocation, summary };
}

function buildPositionSizing(
  holdings: PortfolioHoldingContext[],
  suggestedWeights: Map<string, number>
): PositionSizingItem[] {
  const equalWeight = 100 / holdings.length;

  return holdings.map((h) => {
    const suggested = suggestedWeights.get(h.holding.symbol) ?? h.weight;
    const ideal = round(equalWeight);
    const diff = h.weight - ideal;
    let status: PositionWeightStatus = "neutral";
    if (diff > 3) status = "overweight";
    else if (diff < -3) status = "underweight";

    const tone: ScoreTone =
      status === "neutral" ? "gain" : status === "overweight" ? "loss" : "accent";

    return {
      symbol: h.holding.symbol,
      name: h.holding.name,
      currentWeight: round(h.weight),
      idealWeight: ideal,
      suggestedWeight: round(suggested),
      status,
      tone,
    };
  });
}

function buildQuality(holdings: PortfolioHoldingContext[]): PortfolioQualityMetrics {
  const avgRoe = round(
    weightedAverage(holdings, (h) => h.profile.financials.roe)
  );
  const avgRoce = round(
    weightedAverage(holdings, (h) => h.profile.financials.roce)
  );
  const avgDebt = round(
    weightedAverage(holdings, (h) => h.profile.financials.debtToEquity),
    2
  );
  const avgGrowth = round(
    weightedAverage(holdings, (h) => h.profile.financials.revenueGrowth)
  );
  const avgPe = round(
    weightedAverage(holdings, (h) => h.profile.financials.pe)
  );
  const avgDiv = round(
    weightedAverage(holdings, (h) => {
      const divFactor = h.intelligence.score.factors.find(
        (f) => f.key === "business-quality"
      );
      return divFactor ? divFactor.score * 0.03 : 1.2;
    }),
    2
  );

  const qualityScore = normalizeScore(
    weightedAverage(holdings, (h) => h.intelligence.financialQuality.overallScore)
  );

  return {
    averageRoe: avgRoe,
    averageRoce: avgRoce,
    averageDebtToEquity: avgDebt,
    averageGrowth: avgGrowth,
    averagePe: avgPe,
    averageDividendYield: avgDiv,
    qualityScore,
    qualityTone: toneForScore(qualityScore),
    summary:
      qualityScore >= 70
        ? "Portfolio holds high-quality businesses with strong fundamentals."
        : qualityScore >= 55
          ? "Mixed quality — some holdings drag the aggregate score."
          : "Quality is below institutional standards — review weak positions.",
  };
}

function buildSummary(
  health: PortfolioHealthScore,
  risk: PortfolioRiskEngine,
  diversification: DiversificationAnalysis,
  holdings: PortfolioHoldingContext[]
): PortfolioDoctorSummary {
  const expectedCagr = clampCagr(
    weightedAverage(holdings, (h) => h.intelligence.thesis.expectedCagr)
  );

  const worstHolding = [...holdings].sort(
    (a, b) =>
      normalizeScore(b.intelligence.decision.risk.overallRiskMeter) -
      normalizeScore(a.intelligence.decision.risk.overallRiskMeter)
  )[0];

  const bestOpp = [...holdings]
    .filter((h) => h.intelligence.opportunities.length > 0)
    .sort((a, b) => b.intelligence.score.overall - a.intelligence.score.overall)[0];

  return {
    healthScore: health.overall,
    riskLevel: risk.overallRiskLabel,
    diversificationGrade: diversification.grade,
    expectedCagr,
    worstRisk: worstHolding
      ? `${worstHolding.holding.symbol} — ${riskInterpretation(
          normalizeScore(worstHolding.intelligence.decision.risk.overallRiskMeter)
        )}`
      : "No elevated single-stock risk",
    bestOpportunity: bestOpp
      ? `${bestOpp.holding.symbol} — ${bestOpp.intelligence.opportunities[0]?.label ?? "quality compounder"}`
      : "No standout opportunity detected",
    headline: health.summary,
  };
}

export function buildPortfolioDoctorAnalysis(
  input: PortfolioDoctorInput
): PortfolioDoctorAnalysis {
  const { holdings, cashPercent = 0, dataTransparency } = input;

  const diversification = buildDiversification(holdings);
  const healthScore = buildHealthScore(holdings, diversification, cashPercent);
  const riskEngine = buildRiskEngine(holdings, diversification);
  const diagnostics = buildDiagnostics(holdings);
  const recommendations = buildRecommendations(
    holdings,
    diversification,
    diagnostics,
    cashPercent
  );
  const suggestedWeights = computeSuggestedWeights(holdings);
  const rebalancing = buildRebalancing(holdings, suggestedWeights);
  const positionSizing = buildPositionSizing(holdings, suggestedWeights);
  const quality = buildQuality(holdings);
  const summary = buildSummary(healthScore, riskEngine, diversification, holdings);

  return {
    generatedAt: dataTransparency.lastUpdated,
    healthScore,
    diversification,
    riskEngine,
    diagnostics,
    recommendations,
    rebalancing,
    positionSizing,
    sectorAllocation: diversification.sectorAllocation.filter(
      (s) => s.currentPercent > 0
    ),
    quality,
    summary,
    dataTransparency,
  };
}

export { SECTOR_COLORS, severityFromScore };
