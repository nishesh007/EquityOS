/**
 * AI Decision Engine — institutional-grade composite investment decision.
 * Combines technical, fundamentals, valuation, risk, momentum, quality, and AI research
 * into a single reusable decision output for company pages and Portfolio Doctor.
 */

import type { AnalysisContext } from "@/lib/engine/analysis-context";
import type { EnrichedShareholding } from "@/lib/fundamentals/types";
import { createScoreResult, weightedOverallScore } from "@/lib/engine/framework";
import type { ScoreResult } from "@/lib/engine/types";
import { amountToCrore, clamp, round, toneForScore, verdictForScore } from "@/lib/engine/utils";
import {
  buildDecisionTimeline as buildValuationTimeline,
  buildResearchSummary,
  computePriceTargets,
  deriveRecommendation,
  downsidePercent,
} from "@/lib/valuation";
import type {
  AIDecisionAnalysis,
  AIInvestmentThesis,
  CompanyResearch,
  DecisionMetric,
  EquityScore,
  FinancialQualityAnalysis,
  InvestmentChecklist,
  InvestmentVerdict,
  Opportunity,
  RecommendationLevel,
  RedFlag,
  ResearchConfidence,
  TechnicalAnalysis,
  ValuationAnalysis,
} from "@/types";

const DECISION_WEIGHTS = {
  technical: 0.15,
  fundamentals: 0.2,
  valuation: 0.18,
  quality: 0.17,
  risk: 0.15,
  momentum: 0.1,
  research: 0.05,
};

export interface DecisionEngineInput {
  ctx: AnalysisContext;
  equityScore: EquityScore;
  financialQuality: FinancialQualityAnalysis;
  valuation: ValuationAnalysis;
  researchConfidence: ResearchConfidence;
  thesis: AIInvestmentThesis;
  redFlags: RedFlag[];
  opportunities: Opportunity[];
  checklist: InvestmentChecklist;
  research?: CompanyResearch | null;
}

export interface DecisionEngineResult {
  decision: AIDecisionAnalysis;
  scoreResult: ScoreResult;
}


function recommendationToVerdict(recommendation: RecommendationLevel): InvestmentVerdict {
  switch (recommendation) {
    case "Strong Buy":
    case "Buy":
      return "BUY";
    case "Accumulate":
      return "BUY";
    case "Hold":
      return "HOLD";
    case "Reduce":
      return "WATCH";
    case "Sell":
    case "Strong Sell":
      return "SELL";
  }
}

function findIndicator(technicals: TechnicalAnalysis, name: string): DecisionMetric {
  const indicator = technicals.indicators.find((i) => i.name.startsWith(name));
  const signalScore =
    indicator?.signal === "bullish" ? 72 : indicator?.signal === "bearish" ? 32 : 52;
  return {
    key: name.toLowerCase().replace(/\s+/g, "-"),
    label: name,
    value: indicator?.value ?? "N/A",
    score: signalScore,
    explanation: indicator?.detail ?? "No signal available.",
  };
}

function buildTechnicalSnapshot(
  research: CompanyResearch | null | undefined,
  equityScore: EquityScore,
  profile: AnalysisContext["profile"]
): AIDecisionAnalysis["technical"] {
  const technicals = research?.technicals;
  const ai = research?.ai;
  const price = profile.price;

  if (!technicals) {
    const momentum = equityScore.factors.find((f) => f.key === "momentum");
    return {
      metrics: [
        {
          key: "trend",
          label: "Trend",
          value: profile.changePercent >= 0 ? "Uptrend" : "Downtrend",
          score: momentum?.score ?? 50,
          explanation: momentum?.explanation ?? "Momentum factor from equity score.",
        },
      ],
      support: round(price * 0.94),
      resistance: round(price * 1.06),
      breakoutProbability: clamp(40 + (momentum?.score ?? 50) * 0.4),
      overallScore: momentum?.score ?? 50,
    };
  }

  const emaIndicators = technicals.indicators.filter((i) => i.name.startsWith("EMA"));
  const emaBullish = emaIndicators.filter((i) => i.signal === "bullish").length;
  const maScore = clamp(40 + (emaBullish / Math.max(emaIndicators.length, 1)) * 45);

  const metrics: DecisionMetric[] = [
    {
      key: "trend",
      label: "Trend",
      value: technicals.summary === "bullish" ? "Bullish" : technicals.summary === "bearish" ? "Bearish" : "Neutral",
      score: technicals.score,
      explanation: `${technicals.bullishCount} bullish vs ${technicals.bearishCount} bearish indicators.`,
    },
    findIndicator(technicals, "RSI"),
    findIndicator(technicals, "MACD"),
    findIndicator(technicals, "ADX"),
    findIndicator(technicals, "ATR"),
    findIndicator(technicals, "VWAP"),
    {
      key: "momentum",
      label: "Momentum",
      value: `${profile.changePercent > 0 ? "+" : ""}${profile.changePercent}%`,
      score: equityScore.factors.find((f) => f.key === "momentum")?.score ?? technicals.score,
      explanation: "Price momentum and session change.",
    },
    {
      key: "volume",
      label: "Volume",
      value: findIndicator(technicals, "Volume").value,
      score: findIndicator(technicals, "Volume").score,
      explanation: findIndicator(technicals, "Volume").explanation,
    },
    {
      key: "moving-averages",
      label: "Moving Averages",
      value: `${emaBullish}/${emaIndicators.length} above`,
      score: maScore,
      explanation: "EMA 20/50/200 alignment vs current price.",
    },
  ];

  const support = ai?.support ?? round(price * 0.94);
  const resistance = ai?.resistance ?? round(price * 1.06);
  const breakoutProbability = clamp(
    technicals.score * 0.55 +
      (price > resistance * 0.98 ? 15 : 0) +
      (technicals.bullishCount >= 6 ? 12 : 0)
  );

  return {
    metrics,
    support,
    resistance,
    breakoutProbability: round(breakoutProbability),
    overallScore: technicals.score,
  };
}

function buildFundamentalsSnapshot(
  ctx: AnalysisContext,
  equityScore: EquityScore,
  financialQuality: FinancialQualityAnalysis
): AIDecisionAnalysis["fundamentals"] {
  const { profile, fundamentals: ff } = ctx;
  const f = profile.financials;
  const shareholding: EnrichedShareholding = ctx.bundle?.shareholding ?? { ...profile.shareholding };
  const latestQuarter = profile.quarterlyResults[0];
  const revenueCr = amountToCrore(f.revenue);
  const operatingCashFlow =
    ff?.fcf && ff.fcf !== "—"
      ? amountToCrore(ff.fcf)
      : Math.round(revenueCr * (0.1 + Math.min(f.roce, 30) / 300));

  const roe = ff?.roe ?? f.roe;
  const roce = ff?.roce ?? f.roce;
  const debtEquity = ff?.debtEquity ?? f.debtToEquity;
  const revenueGrowth = ff?.revenueCagr ?? f.revenueGrowth;
  const profitGrowth = ff?.profitCagr ?? f.netProfitGrowth;

  const fundamentalScore =
    equityScore.factors.find((x) => x.key === "fundamental")?.score ??
    financialQuality.overallScore;

  const shareholdingTrend = shareholding.changes
    ? `${shareholding.changes.promoter >= 0 ? "+" : ""}${shareholding.changes.promoter}% promoter QoQ`
    : "Stable";

  const quarterlyMomentum =
    latestQuarter && profile.quarterlyResults[1]
      ? round(
          ((amountToCrore(latestQuarter.revenue) -
            amountToCrore(profile.quarterlyResults[1].revenue)) /
            amountToCrore(profile.quarterlyResults[1].revenue)) *
            100
        )
      : 0;

  return {
    overallScore: fundamentalScore,
    metrics: [
      {
        key: "revenue-trend",
        label: "Revenue Trend",
        value: `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}% YoY`,
        score: ff?.growthScore ?? clamp(45 + revenueGrowth * 2.2),
        explanation: `Top-line growth at ${revenueGrowth}% year-on-year.`,
      },
      {
        key: "profit-trend",
        label: "Profit Trend",
        value: `${profitGrowth > 0 ? "+" : ""}${profitGrowth}% YoY`,
        score: ff?.profitabilityScore ?? clamp(45 + profitGrowth * 1.8),
        explanation: `Net profit growth at ${profitGrowth}% year-on-year.`,
      },
      {
        key: "roe",
        label: "ROE",
        value: `${roe}%`,
        score: clamp(35 + roe * 2.2),
        explanation: "Return on equity — capital efficiency for shareholders.",
      },
      {
        key: "roce",
        label: "ROCE",
        value: `${roce}%`,
        score: clamp(35 + roce * 2.2),
        explanation: "Return on capital employed across the business.",
      },
      {
        key: "debt",
        label: "Debt",
        value: `${debtEquity}x D/E`,
        score: ff?.financialStrength ?? clamp(90 - debtEquity * (profile.sector === "Banking" ? 8 : 35)),
        explanation: "Balance-sheet leverage relative to equity.",
      },
      {
        key: "cash-flow",
        label: "Cash Flow",
        value: `₹${operatingCashFlow.toLocaleString("en-IN")} Cr`,
        score: clamp(50 + f.roce * 1.5),
        explanation: "Estimated operating cash flow from core operations.",
      },
      {
        key: "promoter-holding",
        label: "Promoter Holding",
        value: `${shareholding.promoter}%`,
        score: clamp(40 + shareholding.promoter * 0.8),
        explanation: "Promoter skin-in-the-game and alignment.",
      },
      {
        key: "shareholding-trend",
        label: "Shareholding Trend",
        value: shareholdingTrend,
        score: shareholding.changes
          ? clamp(55 + shareholding.changes.promoter * 8 + shareholding.changes.fii * 2)
          : 58,
        explanation: "Quarterly changes in promoter and institutional holdings.",
      },
      {
        key: "quarterly-momentum",
        label: "Quarterly Momentum",
        value: `${quarterlyMomentum > 0 ? "+" : ""}${quarterlyMomentum}% QoQ`,
        score: clamp(48 + quarterlyMomentum * 1.5),
        explanation: "Latest quarter revenue momentum vs prior quarter.",
      },
    ],
  };
}

function buildValuationSnapshot(valuation: ValuationAnalysis): AIDecisionAnalysis["valuation"] {
  const valScore = clamp(
    (valuation.pe.verdict === "Undervalued" ? 78 : valuation.pe.verdict === "Fairly Valued" ? 58 : 35) +
      valuation.marginOfSafety * 0.25
  );

  const dcfModel = valuation.models.find((m) => m.key === "dcf");
  const grahamModel = valuation.models.find((m) => m.key === "graham");
  const epvModel = valuation.models.find((m) => m.key === "epv");

  return {
    overallScore: valScore,
    metrics: [
      {
        key: "dcf",
        label: "DCF",
        value: dcfModel ? `₹${dcfModel.fairValue.toLocaleString("en-IN")}` : `₹${valuation.intrinsicValue.toLocaleString("en-IN")}`,
        score: clamp(50 + valuation.marginOfSafety * 0.6),
        explanation: dcfModel?.explanation ?? "Discounted cash flow fair value estimate.",
      },
      {
        key: "intrinsic-value",
        label: "Intrinsic Value",
        value: `₹${valuation.intrinsicValue.toLocaleString("en-IN")}`,
        score: valScore,
        explanation: valuation.summary,
      },
      {
        key: "graham",
        label: "Graham Value",
        value: grahamModel ? `₹${grahamModel.fairValue.toLocaleString("en-IN")}` : "—",
        score: grahamModel?.confidence ?? valScore,
        explanation: grahamModel?.explanation ?? "Benjamin Graham intrinsic value.",
      },
      {
        key: "epv",
        label: "Earnings Power",
        value: epvModel ? `₹${epvModel.fairValue.toLocaleString("en-IN")}` : "—",
        score: epvModel?.confidence ?? valScore,
        explanation: epvModel?.explanation ?? "Earnings power value estimate.",
      },
      {
        key: "relative-valuation",
        label: "Relative Valuation",
        value: valuation.relativeVsPeers,
        score:
          valuation.relativeVsPeers === "Undervalued"
            ? 75
            : valuation.relativeVsPeers === "Fairly Valued"
              ? 55
              : 35,
        explanation: "Valuation vs peer group multiples.",
      },
      {
        key: "sector-pe",
        label: "Sector PE",
        value: `${valuation.pe.value}x vs ${valuation.pe.fairValue}x fair`,
        score: clamp(100 - Math.abs(valuation.pe.value - valuation.pe.fairValue) * 2),
        explanation: valuation.pe.verdict,
      },
      {
        key: "fair-value",
        label: "Fair Value",
        value: `₹${valuation.estimatedFairValue.toLocaleString("en-IN")}`,
        score: valScore,
        explanation: "Blended fair value from 7 valuation models.",
      },
      {
        key: "mos",
        label: "MOS",
        value: `${valuation.marginOfSafety > 0 ? "+" : ""}${valuation.marginOfSafety}%`,
        score: clamp(50 + valuation.marginOfSafety),
        explanation: "Margin of safety vs current market price.",
      },
      {
        key: "upside",
        label: "Upside",
        value: `${valuation.upsidePercent > 0 ? "+" : ""}${valuation.upsidePercent}%`,
        score: clamp(50 + valuation.upsidePercent * 0.8),
        explanation: "Upside to blended intrinsic value.",
      },
    ],
  };
}

function buildQualitySnapshot(
  ctx: AnalysisContext,
  financialQuality: FinancialQualityAnalysis,
  thesis: AIInvestmentThesis
): AIDecisionAnalysis["quality"] {
  const ff = ctx.fundamentals;
  const governanceScore =
    financialQuality.scores.find((s) => s.key === "corporate-governance")?.score ?? 62;
  const capitalAllocationScore =
    ff?.capitalAllocationScore ??
    financialQuality.scores.find((s) => s.key === "capital-allocation")?.score ??
    58;
  const qualityScore = ff?.qualityScore ?? financialQuality.overallScore;
  const financialStrengthScore = ff?.financialStrength ?? financialQuality.overallScore;
  const roce = ff?.roce ?? ctx.profile.financials.roce;

  return {
    overallScore: qualityScore,
    metrics: [
      {
        key: "business-quality",
        label: "Business Quality",
        value: `${qualityScore}/100`,
        score: qualityScore,
        explanation: thesis.sections[0]?.content.slice(0, 100) ?? "Business quality assessment.",
      },
      {
        key: "management-quality",
        label: "Management Quality",
        value: thesis.managementQuality.slice(0, 40) + "...",
        score: clamp(55 + (ff?.roe ?? ctx.profile.financials.roe) * 1.2),
        explanation: thesis.managementQuality,
      },
      {
        key: "capital-allocation",
        label: "Capital Allocation",
        value: `${roce}% ROCE`,
        score: capitalAllocationScore,
        explanation: thesis.sections.find((s) => s.title === "Capital Allocation")?.content.slice(0, 120) ?? "",
      },
      {
        key: "financial-strength",
        label: "Financial Strength",
        value: `${financialStrengthScore}/100`,
        score: financialStrengthScore,
        explanation: `${financialQuality.scores.filter((s) => s.score >= 70).length} of ${financialQuality.scores.length} metrics above 70.`,
      },
      {
        key: "corporate-governance",
        label: "Corporate Governance",
        value: governanceScore >= 70 ? "Strong" : governanceScore >= 50 ? "Adequate" : "Weak",
        score: governanceScore,
        explanation: "Board quality, disclosure, and shareholder treatment.",
      },
      {
        key: "moat",
        label: "Moat",
        value: roce >= 20 ? "Wide" : roce >= 15 ? "Moderate" : "Narrow",
        score: clamp(40 + roce * 2),
        explanation: thesis.moat,
      },
    ],
  };
}

function buildRiskSnapshot(
  ctx: AnalysisContext,
  equityScore: EquityScore,
  redFlags: RedFlag[],
  research?: CompanyResearch | null
): AIDecisionAnalysis["risk"] {
  const riskFactor = equityScore.factors.find((f) => f.key === "risk");
  const riskScore = riskFactor?.score ?? 50;
  const overallRiskMeter = clamp(100 - riskScore + redFlags.length * 8);

  const technicalRisk =
    research?.technicals.score !== undefined
      ? clamp(100 - research.technicals.score + (research.ai.riskLevel === "High" ? 20 : research.ai.riskLevel === "Moderate" ? 10 : 0))
      : 45;

  return {
    overallRiskMeter: round(overallRiskMeter),
    metrics: [
      {
        key: "business-risk",
        label: "Business Risk",
        value: redFlags.length > 0 ? `${redFlags.length} flag(s)` : "Low",
        score: clamp(100 - redFlags.length * 15 - (redFlags.some((f) => f.severity === "High") ? 20 : 0)),
        explanation: redFlags[0]?.description ?? `${ctx.profile.industry} competitive and cyclical exposure.`,
      },
      {
        key: "financial-risk",
        label: "Financial Risk",
        value: `${ctx.profile.financials.debtToEquity}x D/E`,
        score: clamp(90 - ctx.profile.financials.debtToEquity * 30),
        explanation: riskFactor?.explanation ?? "Leverage and earnings stability.",
      },
      {
        key: "technical-risk",
        label: "Technical Risk",
        value: research?.ai.riskLevel ?? "Moderate",
        score: clamp(100 - technicalRisk),
        explanation: research?.ai.volumeAnalysis ?? "Price structure and volatility risk.",
      },
      {
        key: "sector-risk",
        label: "Sector Risk",
        value: ctx.profile.sector,
        score: clamp(55 + (ctx.profile.financials.revenueGrowth > 0 ? 10 : -10)),
        explanation: `${ctx.profile.sector} sector cyclicality and regulatory environment.`,
      },
      {
        key: "macro-risk",
        label: "Macro Risk",
        value: ctx.profile.changePercent >= 0 ? "Favourable" : "Headwinds",
        score: clamp(52 + ctx.profile.changePercent),
        explanation: "Broad market and rate environment impact on multiples.",
      },
    ],
  };
}

function buildEntryAndTargets(
  profile: AnalysisContext["profile"],
  valuation: ValuationAnalysis,
  research?: CompanyResearch | null,
  riskMeter?: number
): Pick<AIDecisionAnalysis, "entry" | "targets"> {
  const price = profile.price;
  const swing = research?.swing;
  const support = research?.ai.support ?? round(price * 0.94);
  const resistance = research?.ai.resistance ?? round(price * 1.06);

  const targets = computePriceTargets({
    price,
    intrinsicValue: valuation.intrinsicValue,
    fairValue: valuation.estimatedFairValue,
    technicalScore: research?.technicals.score ?? 50,
    support,
    resistance,
    marginOfSafety: valuation.marginOfSafety,
    upsidePercent: valuation.upsidePercent,
    riskMeter: riskMeter ?? 45,
    swingEntryLow: swing?.entryLow,
    swingEntryHigh: swing?.entryHigh,
    swingStopLoss: swing?.stopLoss,
    swingTarget1: swing?.target1,
    swingTarget3: swing?.target3,
    swingPositionSize: swing?.positionSize,
    swingCapitalAllocation: swing?.capitalAllocationPercent,
  });

  return {
    entry: {
      idealBuyZone: targets.idealBuyZone,
      breakoutBuy: targets.breakoutBuy,
      swingBuy: targets.swingBuy,
      longTermBuy: targets.longTermBuy,
      positionSize: targets.positionSize,
      capitalAllocationPercent: targets.capitalAllocationPercent,
    },
    targets: {
      target1: targets.target1,
      target2: targets.target2,
      target3: targets.target3,
      stopLoss: targets.stopLoss,
      trailingStop: targets.trailingStop,
      invalidationLevel: targets.invalidationLevel,
    },
  };
}

function buildConviction(
  profile: AnalysisContext["profile"],
  valuation: ValuationAnalysis,
  thesis: AIInvestmentThesis,
  researchConfidence: ResearchConfidence,
  decisionScore: number,
  riskMeter: number
): AIDecisionAnalysis["conviction"] {
  const price = profile.price;
  const intrinsic = valuation.intrinsicValue;
  const upside = valuation.upsidePercent;
  const downside = intrinsic > 0 && price > 0
    ? downsidePercent(intrinsic, price)
    : round(Math.max(8, 22 - decisionScore * 0.15 + riskMeter * 0.08));
  const reward = clamp(upside > 0 ? upside : Math.max(0, valuation.marginOfSafety));

  return {
    overall: decisionScore,
    confidence: researchConfidence.overall,
    risk: round(riskMeter),
    reward,
    marginOfSafety: valuation.marginOfSafety,
    intrinsicValue: intrinsic,
    currentPrice: price,
    upside,
    downside,
    expectedCagr: valuation.expectedCagr,
  };
}

function buildAISummary(
  ctx: AnalysisContext,
  thesis: AIInvestmentThesis,
  valuation: ValuationAnalysis,
  redFlags: RedFlag[],
  opportunities: Opportunity[],
  recommendation: RecommendationLevel,
  decisionScore: number
): AIDecisionAnalysis["aiSummary"] {
  const summary = buildResearchSummary({
    profile: { name: ctx.profile.name },
    financials: {
      roce: ctx.profile.financials.roce,
      roe: ctx.profile.financials.roe,
      revenueGrowth: ctx.profile.financials.revenueGrowth,
      pe: ctx.profile.financials.pe,
      debtEquity: ctx.profile.financials.debtToEquity,
    },
    valuation: {
      intrinsicValue: valuation.intrinsicValue,
      fairValue: valuation.estimatedFairValue,
      marginOfSafety: valuation.marginOfSafety,
      upsidePercent: valuation.upsidePercent,
      expectedCagr: valuation.expectedCagr,
      models: valuation.models,
      blendedConfidence: valuation.confidence,
      overallVerdict: valuation.overallVerdict,
      available: valuation.available,
    },
    recommendation,
    decisionScore,
    redFlags,
    opportunities,
    thesis: {
      sections: thesis.sections,
      bullCase: thesis.bullCase,
      bearCase: thesis.bearCase,
      keyRisks: thesis.keyRisks,
      keyCatalysts: thesis.keyCatalysts,
      managementQuality: thesis.managementQuality,
      moat: thesis.moat,
      valuationOpinion: thesis.valuationOpinion,
    },
  });

  return summary;
}

function buildDecisionTimelineFromValuation(
  recommendation: RecommendationLevel,
  conviction: AIDecisionAnalysis["conviction"],
  targets: AIDecisionAnalysis["targets"],
  valuation: ValuationAnalysis
): AIDecisionAnalysis["timeline"] {
  const priceTargets = computePriceTargets({
    price: conviction.currentPrice,
    intrinsicValue: valuation.intrinsicValue,
    fairValue: valuation.estimatedFairValue,
    technicalScore: 50,
    support: round(conviction.currentPrice * 0.94),
    resistance: round(conviction.currentPrice * 1.06),
    marginOfSafety: valuation.marginOfSafety,
    upsidePercent: valuation.upsidePercent,
    riskMeter: conviction.risk,
    swingStopLoss: targets.stopLoss,
    swingTarget1: targets.target1,
    swingTarget3: targets.target3,
  });

  return buildValuationTimeline(
    recommendation,
    conviction.confidence,
    priceTargets,
    valuation.intrinsicValue,
    valuation.marginOfSafety
  );
}

/**
 * Builds the composite AI Decision Analysis from upstream engine outputs.
 * All scoring flows through a single weighted composite — no duplicate factor math.
 */
export function buildDecisionAnalysis(input: DecisionEngineInput): DecisionEngineResult {
  const {
    ctx,
    equityScore,
    financialQuality,
    valuation,
    researchConfidence,
    thesis,
    redFlags,
    opportunities,
    checklist,
    research,
  } = input;

  const technicalScore = research?.technicals.score ??
    equityScore.factors.find((f) => f.key === "momentum")?.score ??
    50;
  const ff = ctx.fundamentals;
  const fundamentalScore =
    equityScore.factors.find((f) => f.key === "fundamental")?.score ??
    ff?.qualityScore ??
    financialQuality.overallScore;
  const valuationScore =
    ff?.valuationScore ??
    equityScore.factors.find((f) => f.key === "valuation")?.score ??
    clamp(50 + valuation.marginOfSafety * 0.5);
  const qualityScore =
    ff?.qualityScore ??
    equityScore.factors.find((f) => f.key === "business-quality")?.score ??
    financialQuality.overallScore;
  const riskScore = equityScore.factors.find((f) => f.key === "risk")?.score ?? 50;
  const momentumScore = equityScore.factors.find((f) => f.key === "momentum")?.score ?? 50;

  const factorScores = [
    createScoreResult({
      key: "technical",
      label: "Technical",
      category: "technical",
      rawScore: technicalScore,
      weight: DECISION_WEIGHTS.technical,
      explanation: "Technical structure and indicator alignment.",
    }),
    createScoreResult({
      key: "fundamentals",
      label: "Fundamentals",
      category: "fundamental",
      rawScore: fundamentalScore,
      weight: DECISION_WEIGHTS.fundamentals,
      explanation: "Revenue, profit, returns, and balance sheet.",
    }),
    createScoreResult({
      key: "valuation",
      label: "Valuation",
      category: "valuation",
      rawScore: valuationScore,
      weight: DECISION_WEIGHTS.valuation,
      explanation: "Relative and intrinsic valuation comfort.",
    }),
    createScoreResult({
      key: "quality",
      label: "Quality",
      category: "quality",
      rawScore: qualityScore,
      weight: DECISION_WEIGHTS.quality,
      explanation: "Business and management quality.",
    }),
    createScoreResult({
      key: "risk",
      label: "Risk",
      category: "risk",
      rawScore: riskScore,
      weight: DECISION_WEIGHTS.risk,
      explanation: "Composite risk factor (higher = lower risk).",
    }),
    createScoreResult({
      key: "momentum",
      label: "Momentum",
      category: "momentum",
      rawScore: momentumScore,
      weight: DECISION_WEIGHTS.momentum,
      explanation: "Price and earnings momentum.",
    }),
    createScoreResult({
      key: "research",
      label: "AI Research",
      category: "ai",
      rawScore: researchConfidence.overall,
      weight: DECISION_WEIGHTS.research,
      explanation: "Research confidence across dimensions.",
    }),
  ];

  const weights = factorScores.map((f) => f.weight);
  const composite = weightedOverallScore(factorScores, weights);
  const checklistBoost = round((checklist.score - 50) * 0.08);
  const decisionScore = clamp(composite.normalizedScore + checklistBoost);

  const recommendation = deriveRecommendation({
    valuation: {
      intrinsicValue: valuation.intrinsicValue,
      fairValue: valuation.estimatedFairValue,
      marginOfSafety: valuation.marginOfSafety,
      upsidePercent: valuation.upsidePercent,
      expectedCagr: valuation.expectedCagr,
      models: valuation.models,
      blendedConfidence: valuation.confidence,
      overallVerdict: valuation.overallVerdict,
      available: valuation.available,
    },
    qualityScore: qualityScore,
    financialScore: fundamentalScore,
    technicalScore,
    growthScore: momentumScore,
    riskScore,
    cashFlowScore: ff?.financialStrength ?? 55,
    balanceSheetScore: ff?.financialStrength ?? clamp(90 - ctx.profile.financials.debtToEquity * 30),
    redFlagCount: redFlags.length,
    highSeverityFlags: redFlags.filter((f) => f.severity === "High").length,
  });
  const verdict = recommendationToVerdict(recommendation);

  const technical = buildTechnicalSnapshot(research, equityScore, ctx.profile);
  const fundamentals = buildFundamentalsSnapshot(ctx, equityScore, financialQuality);
  const valuationSnap = buildValuationSnapshot(valuation);
  const quality = buildQualitySnapshot(ctx, financialQuality, thesis);
  const risk = buildRiskSnapshot(ctx, equityScore, redFlags, research);
  const { entry, targets } = buildEntryAndTargets(ctx.profile, valuation, research, risk.overallRiskMeter);
  const conviction = buildConviction(
    ctx.profile,
    valuation,
    thesis,
    researchConfidence,
    decisionScore,
    risk.overallRiskMeter
  );
  const aiSummary = buildAISummary(ctx, thesis, valuation, redFlags, opportunities, recommendation, decisionScore);
  const timeline = buildDecisionTimelineFromValuation(recommendation, conviction, targets, valuation);

  const scoreResult = createScoreResult({
    key: "decision",
    label: "Decision Score",
    category: "decision",
    rawScore: decisionScore,
    weight: 1,
    confidence: researchConfidence.overall,
    explanation: `${recommendation} — composite of technical, fundamentals, valuation, quality, risk, momentum, and AI research.`,
    contributingFactors: factorScores.map((f) => ({
      key: f.key,
      label: f.label,
      value: f.normalizedScore,
      weight: f.weight,
      impact:
        f.normalizedScore >= 60 ? "positive" : f.normalizedScore >= 45 ? "neutral" : "negative",
    })),
  });

  return {
    decision: {
      decisionScore,
      recommendation,
      verdict,
      conviction,
      entry,
      targets,
      technical,
      fundamentals,
      valuation: valuationSnap,
      quality,
      risk,
      aiSummary,
      timeline,
    },
    scoreResult,
  };
}

export { toneForScore, verdictForScore };
