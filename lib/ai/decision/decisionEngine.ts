/**
 * Institutional AI Decision Engine — synthesizes multi-engine signals into actionable decisions.
 */

import { clamp, round } from "@/lib/engine/utils";
import { deriveRecommendation } from "@/lib/valuation";
import { resolveSymbolsFromPrompt } from "@/lib/ai/context/companyContext";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import { loadInstitutionalBundle } from "@/lib/ai/institutional/loadBundle";
import {
  buildDecisionCatalysts,
  formatCatalysts,
} from "@/lib/ai/decision/catalystEngine";
import {
  buildDecisionRedFlags,
  formatRedFlags,
} from "@/lib/ai/decision/redFlagEngine";
import {
  buildDecisionScores,
  deriveEarningsTrendLabel,
} from "@/lib/ai/decision/scoringEngine";
import { buildDecisionConfidence } from "@/lib/ai/decision/confidenceEngine";
import { bulletList, sectionHeading } from "@/lib/research/reportTemplates";
import type { RetrievedChunk } from "@/lib/rag/retriever";
import type {
  CompanyProfile,
  EquityIntelligence,
  Opportunity,
  RecommendationLevel,
} from "@/types";
import type { InstitutionalMoatAssessment } from "@/lib/research/moatEngine";
import type { InstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import type { InstitutionalValuation } from "@/lib/research/valuationEngine";

export type TimeHorizon = "Swing" | "6 Months" | "1 Year" | "3 Years" | "5 Years";
export type InvestorProfile = "Value" | "Growth" | "Dividend" | "Momentum" | "GARP";
export type PositionSizing = "High Conviction" | "Medium Conviction" | "Watchlist";

export interface AIDecisionSummary {
  symbol: string;
  companyName: string;
  recommendation: RecommendationLevel;
  confidenceScore: number;
  aiConvictionScore: number;
  reasonsToBuy: string[];
  reasonsNotToBuy: string[];
  redFlags: string[];
  upcomingCatalysts: string[];
  timeHorizon: TimeHorizon;
  timeHorizonRationale: string;
  suitableInvestor: InvestorProfile[];
  positionSizing: PositionSizing;
  earningsTrend: string;
  compositeScore: number;
  generatedAt: string;
}

export interface DecisionEngineInput {
  context: CompanyContext;
  profile: CompanyProfile;
  valuation: InstitutionalValuation;
  risk: InstitutionalRiskAssessment;
  moat: InstitutionalMoatAssessment;
  intelligence: EquityIntelligence | null;
  ragChunks: RetrievedChunk[];
  opportunities: Opportunity[];
}

function countHighSeverityFlags(risk: InstitutionalRiskAssessment): number {
  return risk.redFlags.filter((flag) => flag.severity === "High").length;
}

function deriveRecommendationLevel(
  input: DecisionEngineInput,
  scores: ReturnType<typeof buildDecisionScores>
): RecommendationLevel {
  const { valuation, risk } = input;
  const fi = input.context.financialIntelligence;

  return deriveRecommendation({
    valuation: {
      intrinsicValue: valuation.intrinsicValue,
      fairValue: valuation.fairValue,
      marginOfSafety: valuation.marginOfSafety,
      upsidePercent: valuation.upsidePercent,
      expectedCagr: valuation.analysis.expectedCagr,
      models: valuation.analysis.models,
      blendedConfidence: valuation.analysis.confidence,
      overallVerdict: valuation.analysis.overallVerdict,
      available: valuation.analysis.available,
    },
    qualityScore: scores.qualityScore,
    financialScore: scores.financialStrengthScore,
    technicalScore: scores.technicalScore,
    growthScore: scores.growthScore,
    riskScore: risk.aggregateRiskScore,
    cashFlowScore: fi?.scores.financialHealthScore ?? 55,
    balanceSheetScore: fi?.scores.solvencyScore ?? scores.financialStrengthScore,
    redFlagCount: risk.redFlags.length,
    highSeverityFlags: countHighSeverityFlags(risk),
  });
}

function deriveAiConvictionScore(
  scores: ReturnType<typeof buildDecisionScores>,
  context: CompanyContext,
  recommendation: RecommendationLevel
): number {
  const recBoost: Record<RecommendationLevel, number> = {
    "Strong Buy": 12,
    Buy: 8,
    Accumulate: 4,
    Hold: 0,
    Reduce: -6,
    Sell: -10,
    "Strong Sell": -14,
  };

  const intelConviction = context.intelligence?.conviction.overall;
  const base = clamp(
    scores.compositeScore * 0.45 +
      scores.moatScore * 0.2 +
      scores.earningsTrendScore * 0.2 +
      scores.riskScore * 0.15 +
      (recBoost[recommendation] ?? 0)
  );

  if (intelConviction != null) {
    return round(clamp(base * 0.65 + intelConviction * 0.35));
  }
  return round(base);
}

function deriveTimeHorizon(input: DecisionEngineInput, scores: ReturnType<typeof buildDecisionScores>): {
  horizon: TimeHorizon;
  rationale: string;
} {
  const { moat, valuation, context } = input;
  const technical = context.technicalIndicators;

  if (scores.technicalScore >= 68 && technical && technical.bullishCount >= 3) {
    return {
      horizon: "Swing",
      rationale: `Technical score ${scores.technicalScore}/100 with ${technical.bullishCount} bullish indicators supports a tactical swing setup.`,
    };
  }
  if (scores.growthScore >= 72 && scores.technicalScore >= 55) {
    return {
      horizon: "6 Months",
      rationale: `Elevated growth score (${scores.growthScore}/100) and positive momentum favour a 6-month earnings-revision window.`,
    };
  }
  if (moat.moatVerdict === "Wide" && scores.qualityScore >= 65) {
    return {
      horizon: "5 Years",
      rationale: `Wide moat (${moat.overallMoatScore}/10) and durable quality (${scores.qualityScore}/100) align with a 5-year compounding horizon.`,
    };
  }
  if (scores.qualityScore >= 60 && valuation.marginOfSafety > 5) {
    return {
      horizon: "3 Years",
      rationale: `Quality compounder with ${valuation.marginOfSafety.toFixed(1)}% margin of safety suits a 3-year institutional hold.`,
    };
  }
  return {
    horizon: "1 Year",
    rationale: `Balanced risk/reward and ${valuation.analysis.overallVerdict.toLowerCase()} valuation support a 12-month base-case horizon.`,
  };
}

function deriveSuitableInvestors(
  input: DecisionEngineInput,
  scores: ReturnType<typeof buildDecisionScores>
): InvestorProfile[] {
  const { context, valuation, profile } = input;
  const fi = context.financialIntelligence;
  const investors: InvestorProfile[] = [];

  const pe = fi?.ratios.pe ?? profile.financials.pe;
  const revenueGrowth = fi?.ratios.revenueGrowthYoY ?? profile.financials.revenueGrowth;
  const dividendYield = fi?.ratios.dividendYield ?? 0;

  if (
    valuation.analysis.overallVerdict === "Undervalued" ||
    valuation.marginOfSafety >= 10 ||
    (pe > 0 && pe < 18)
  ) {
    investors.push("Value");
  }
  if (revenueGrowth >= 15 || scores.growthScore >= 70) {
    investors.push("Growth");
  }
  if (dividendYield >= 1.5) {
    investors.push("Dividend");
  }
  if (scores.technicalScore >= 65) {
    investors.push("Momentum");
  }
  if (revenueGrowth >= 12 && pe > 0 && pe <= 35 && scores.growthScore >= 55) {
    investors.push("GARP");
  }

  if (investors.length === 0) {
    investors.push("GARP");
  }

  return [...new Set(investors)].slice(0, 3);
}

function derivePositionSizing(
  recommendation: RecommendationLevel,
  confidenceScore: number,
  aiConvictionScore: number
): PositionSizing {
  const actionable =
    recommendation === "Strong Buy" ||
    recommendation === "Buy" ||
    recommendation === "Accumulate";

  if (actionable && confidenceScore >= 70 && aiConvictionScore >= 72) {
    return "High Conviction";
  }
  if (
    actionable &&
    confidenceScore >= 55 &&
    aiConvictionScore >= 58 &&
    recommendation !== "Accumulate"
  ) {
    return "Medium Conviction";
  }
  if (actionable && confidenceScore >= 50) {
    return "Medium Conviction";
  }
  return "Watchlist";
}

function buildReasonsToBuy(input: DecisionEngineInput, scores: ReturnType<typeof buildDecisionScores>): string[] {
  const { context, valuation, moat, intelligence, opportunities, ragChunks } = input;
  const fi = context.financialIntelligence;
  const reasons: string[] = [];

  if (valuation.analysis.overallVerdict === "Undervalued") {
    reasons.push(
      `Valuation engine flags **undervalued** status with ${valuation.upsidePercent > 0 ? "+" : ""}${valuation.upsidePercent.toFixed(1)}% implied upside to fair value ₹${valuation.fairValue.toLocaleString("en-IN")}.`
    );
  }
  if (valuation.marginOfSafety >= 8) {
    reasons.push(`Margin of safety at ${valuation.marginOfSafety.toFixed(1)}% provides downside buffer.`);
  }
  if (moat.moatVerdict !== "None") {
    reasons.push(
      `${moat.moatVerdict} moat (${moat.overallMoatScore}/10) — ${moat.summary.split(".")[0]}.`
    );
  }
  if (fi && fi.scores.qualityScore >= 65) {
    reasons.push(`Financial quality score ${fi.scores.qualityScore}/100 supports institutional-grade fundamentals.`);
  }
  if (fi && fi.cagr.revenue.cagr5Y != null && fi.cagr.revenue.cagr5Y >= 10) {
    reasons.push(`5-year revenue CAGR of ${fi.cagr.revenue.cagr5Y.toFixed(1)}% demonstrates sustained compounding.`);
  }
  if (scores.earningsTrendScore >= 65) {
    reasons.push(deriveEarningsTrendLabel(context));
  }
  if (scores.technicalScore >= 62 && context.technicalIndicators) {
    reasons.push(
      `Technical score ${scores.technicalScore}/100 — ${context.technicalIndicators.summary} bias with ${context.technicalIndicators.bullishCount} bullish signals.`
    );
  }
  for (const opportunity of opportunities.slice(0, 3)) {
    reasons.push(`${opportunity.label}: ${opportunity.description}`);
  }
  if (intelligence?.thesis.bullCase) {
    reasons.push(intelligence.thesis.bullCase.split(".")[0] + ".");
  }
  for (const catalyst of intelligence?.thesis.keyCatalysts.slice(0, 2) ?? []) {
    reasons.push(`Catalyst: ${catalyst}`);
  }
  if (ragChunks.length > 0) {
    const top = ragChunks[0];
    reasons.push(
      `Indexed filing insight (${top.source}${top.year ? ` ${top.year}` : ""}): ${top.content.slice(0, 160).trim()}…`
    );
  }

  const seen = new Set<string>();
  return reasons
    .filter((reason) => {
      const key = reason.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function buildReasonsNotToBuy(
  input: DecisionEngineInput,
  scores: ReturnType<typeof buildDecisionScores>
): string[] {
  const { context, valuation, risk, intelligence } = input;
  const fi = context.financialIntelligence;
  const reasons: string[] = [];

  if (valuation.analysis.overallVerdict === "Overvalued") {
    reasons.push(
      `Valuation engine rates the stock **overvalued** at ${valuation.analysis.pe.value}x P/E vs fair value estimate.`
    );
  }
  if (valuation.marginOfSafety < 0) {
    reasons.push(`Negative margin of safety (${valuation.marginOfSafety.toFixed(1)}%) limits upside asymmetry.`);
  }
  for (const flag of risk.redFlags.slice(0, 4)) {
    reasons.push(`[${flag.severity}] ${flag.label}: ${flag.description}`);
  }
  for (const category of risk.categories) {
    if (category.severity === "High") {
      reasons.push(`${category.category}: ${category.risks[0]}`);
    }
  }
  if (fi && fi.scores.riskScore >= 60) {
    reasons.push(`Elevated financial risk score ${fi.scores.riskScore}/100 from leverage, liquidity, or earnings volatility.`);
  }
  if (scores.technicalScore < 45 && context.technicalIndicators) {
    reasons.push(
      `Weak technical setup (${scores.technicalScore}/100) — ${context.technicalIndicators.bearishCount} bearish indicator(s).`
    );
  }
  if (scores.earningsTrendScore < 42) {
    reasons.push(deriveEarningsTrendLabel(context));
  }
  if (intelligence?.thesis.bearCase) {
    reasons.push(intelligence.thesis.bearCase.split(".")[0] + ".");
  }
  for (const riskLine of intelligence?.thesis.keyRisks.slice(0, 2) ?? []) {
    reasons.push(`Risk: ${riskLine}`);
  }
  if (risk.aggregateRiskScore >= 55) {
    reasons.push(`Aggregate institutional risk score ${risk.aggregateRiskScore}/100 warrants position discipline.`);
  }

  const seen = new Set<string>();
  return reasons
    .filter((reason) => {
      const key = reason.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export function buildAIDecision(input: DecisionEngineInput): AIDecisionSummary {
  const scores = buildDecisionScores(input);
  const recommendation = deriveRecommendationLevel(input, scores);
  const confidence = buildDecisionConfidence({
    context: input.context,
    valuation: input.valuation,
    scores,
    intelligence: input.intelligence,
    ragChunks: input.ragChunks,
  });
  const aiConvictionScore = deriveAiConvictionScore(
    scores,
    input.context,
    recommendation
  );
  const redFlagItems = buildDecisionRedFlags(input.risk, input.context);
  const catalystItems = buildDecisionCatalysts({
    context: input.context,
    intelligence: input.intelligence,
    opportunities: input.opportunities,
    ragChunks: input.ragChunks,
  });
  const { horizon, rationale } = deriveTimeHorizon(input, scores);

  return {
    symbol: input.context.profile.symbol,
    companyName: input.context.profile.name,
    recommendation,
    confidenceScore: confidence.score,
    aiConvictionScore,
    reasonsToBuy: buildReasonsToBuy(input, scores),
    reasonsNotToBuy: buildReasonsNotToBuy(input, scores),
    redFlags: formatRedFlags(redFlagItems),
    upcomingCatalysts: formatCatalysts(catalystItems),
    timeHorizon: horizon,
    timeHorizonRationale: rationale,
    suitableInvestor: deriveSuitableInvestors(input, scores),
    positionSizing: derivePositionSizing(
      recommendation,
      confidence.score,
      aiConvictionScore
    ),
    earningsTrend: deriveEarningsTrendLabel(input.context),
    compositeScore: scores.compositeScore,
    generatedAt: new Date().toISOString(),
  };
}

export function renderDecisionSummaryMarkdown(decision: AIDecisionSummary): string {
  return [
    ``,
    `---`,
    ``,
    sectionHeading("AI Decision Summary"),
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| **Recommendation** | **${decision.recommendation}** |`,
    `| **Confidence Score** | ${decision.confidenceScore} / 100 |`,
    `| **AI Conviction Score** | ${decision.aiConvictionScore} / 100 |`,
    `| **Composite Score** | ${decision.compositeScore} / 100 |`,
    `| **Time Horizon** | ${decision.timeHorizon} |`,
    `| **Suitable Investor** | ${decision.suitableInvestor.join(", ")} |`,
    `| **Position Sizing** | ${decision.positionSizing} |`,
    `| **Earnings Trend** | ${decision.earningsTrend} |`,
    ``,
    `**Time Horizon Rationale:** ${decision.timeHorizonRationale}`,
    ``,
    `### Top Reasons to Buy`,
    ``,
    decision.reasonsToBuy.length > 0
      ? bulletList(decision.reasonsToBuy)
      : "_No compelling buy signals identified from available data._",
    ``,
    `### Top Reasons Not to Buy`,
    ``,
    decision.reasonsNotToBuy.length > 0
      ? bulletList(decision.reasonsNotToBuy)
      : "_No material sell signals identified from available data._",
    ``,
    `### Red Flags`,
    ``,
    decision.redFlags.length > 0
      ? bulletList(decision.redFlags)
      : "_No institutional red flags detected._",
    ``,
    `### Upcoming Catalysts`,
    ``,
    decision.upcomingCatalysts.length > 0
      ? bulletList(decision.upcomingCatalysts)
      : "_No near-term catalysts identified from filings, earnings, or opportunity engine._",
    ``,
    `*AI Decision Summary generated ${new Date(decision.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST by EquityOS Institutional Decision Engine.*`,
  ].join("\n");
}

async function loadDecisionInputs(
  symbol: string,
  prompt?: string
): Promise<DecisionEngineInput | null> {
  const bundle = await loadInstitutionalBundle(symbol, prompt);
  if (!bundle) return null;

  return {
    context: bundle.context,
    profile: bundle.profile,
    valuation: bundle.valuation,
    risk: bundle.risk,
    moat: bundle.moat,
    intelligence: bundle.intelligence,
    ragChunks: bundle.ragChunks,
    opportunities: bundle.opportunities,
  };
}

export async function generateDecisionSummaryMarkdown(
  symbol: string,
  prompt?: string
): Promise<string | null> {
  const input = await loadDecisionInputs(symbol, prompt);
  if (!input) return null;
  const decision = buildAIDecision(input);
  return renderDecisionSummaryMarkdown(decision);
}

export function resolveSymbolForDecision(
  prompt: string,
  symbol: string | null
): string | null {
  const symbols = resolveSymbolsFromPrompt(prompt, symbol);
  return symbols.length > 0 ? symbols[0] : null;
}
