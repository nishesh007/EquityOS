/**
 * Earnings AI summary — research narrative for institutional drawer.
 * Composes text from existing expectation / surprise / risk signals (no new LLM path).
 */

import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import { parseInrCrores } from "@/lib/fundamentals/normalize";
import type {
  AIExpectationView,
  AIOutlook,
  EarningsConfidenceView,
  EarningsQuarterPoint,
  EarningsResearchContext,
  EarningsResearchSummary,
  EarningsRiskView,
  ExpectedSurpriseView,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

function toPoints(context: EarningsResearchContext): EarningsQuarterPoint[] {
  if (!context.quarters.length) return [];
  const enriched = enrichQuarterlyResults(context.quarters);
  return enriched.map((q) => ({
    label: q.quarter,
    revenue: parseInrCrores(q.revenue),
    eps: q.eps,
    margin: q.margin,
    surprise:
      q.surprise === "positive"
        ? "Beat"
        : q.surprise === "negative"
          ? "Miss"
          : q.surprise === "neutral"
            ? "Inline"
            : "—",
  }));
}

export function getResearchSummary(input: {
  context: EarningsResearchContext;
  outlook: AIOutlook;
  expectation: AIExpectationView;
  surprise: ExpectedSurpriseView;
  risk: EarningsRiskView;
  confidence: EarningsConfidenceView;
}): EarningsResearchSummary {
  const { context, outlook, expectation, surprise, risk, confidence } = input;
  const points = toPoints(context);

  if (points.length < 2) {
    return {
      executiveSummary: INTELLIGENCE_EMPTY.insufficientHistory,
      streetExpectations: INTELLIGENCE_EMPTY.consensusNotAvailable,
      aiExpectations: INTELLIGENCE_EMPTY.insufficientHistory,
      historicalEarnings: INTELLIGENCE_EMPTY.insufficientHistory,
      revenueTrend: [],
      epsTrend: [],
      marginTrend: [],
      operatingLeverage: INTELLIGENCE_EMPTY.insufficientHistory,
      beatMissHistory: [],
      institutionalPositioning: INTELLIGENCE_EMPTY.noAnalystCoverage,
      riskAnalysis: risk.riskSummary || INTELLIGENCE_EMPTY.awaitingEarnings,
      bullCase: [],
      bearCase: [],
      catalysts: [],
      questionsToWatch: [],
      expectedMarketReaction: INTELLIGENCE_EMPTY.awaitingEarnings,
      finalAIOpinion: INTELLIGENCE_EMPTY.notEnoughConfidence,
      confidenceBreakdown: confidence.breakdown,
      empty: true,
      emptyMessage: INTELLIGENCE_EMPTY.insufficientHistory,
    };
  }

  const latest = points[0]!;
  const prior = points[1]!;
  const revDelta = latest.revenue - prior.revenue;
  const epsDelta = latest.eps - prior.eps;
  const marginDelta = latest.margin - prior.margin;

  const operatingLeverage =
    revDelta === 0
      ? "Operating leverage inconclusive vs prior quarter."
      : marginDelta > 0 && epsDelta > 0
        ? "Positive operating leverage — profit growth outpacing revenue."
        : marginDelta < 0
          ? "Operating leverage softening — margins under pressure."
          : "Stable operating leverage into the upcoming print.";

  const bullCase = [
    expectation.revenue === "Expected Beat"
      ? "Street underestimating revenue run-rate."
      : "Stable top-line with room for estimate revisions.",
    expectation.marginTrend === "Expand"
      ? "Margin expansion can drive EPS beat."
      : "Cost discipline can defend profitability.",
    context.event.highImpact
      ? "High-impact name — upside surprise can re-rate peers."
      : "Clean setup if delivery confirms institutional accumulation.",
  ];

  const bearCase = [
    expectation.eps === "Miss"
      ? "EPS risk skewed to the downside."
      : "Inline print may trigger profit-taking in crowded names.",
    risk.expectedVolatility === "High"
      ? "Elevated volatility around the announcement window."
      : "Guidance cut risk even on an inline quarter.",
    "Macro / sector newsflow can dominate the stock reaction.",
  ];

  const catalysts = [
    `${context.event.quarter} ${context.event.financialYear} results (${context.event.resultDate})`,
    context.event.fno ? "F&O rollover and gap open risk" : "Cash-market reaction to print",
    `${context.event.sector} peer results cluster`,
  ];

  const questions = [
    "Will management raise or cut FY guidance?",
    "Is margin expansion sustainable into next quarter?",
    "Are institutional flows confirming the AI outlook?",
  ];

  const street =
    typeof surprise.consensusDirection === "string" &&
    surprise.consensusDirection !== INTELLIGENCE_EMPTY.consensusNotAvailable
      ? `Street consensus leans ${String(surprise.consensusDirection).toLowerCase()} with ${surprise.historicalBeatRateLabel}.`
      : INTELLIGENCE_EMPTY.consensusNotAvailable;

  const aiExpectations = expectation.available
    ? `AI expects revenue ${expectation.revenue}, EPS ${expectation.eps}, margins ${expectation.marginTrend}.`
    : INTELLIGENCE_EMPTY.insufficientHistory;

  const reaction =
    outlook === "Bullish"
      ? "Constructive open bias if print confirms beat + guidance."
      : outlook === "Bearish"
        ? "Defensive bias — watch gap-down risk on miss/guidance cut."
        : "Two-way tape expected; reaction hinges on guidance quality.";

  const opinion =
    confidence.available && confidence.score != null
      ? `${outlook} pre-result stance with confidence ${confidence.score}. ${surprise.beatProbabilityLabel}.`
      : INTELLIGENCE_EMPTY.notEnoughConfidence;

  return {
    executiveSummary: `${context.event.companyName} (${context.event.ticker}) reports ${context.event.quarter} ${context.event.financialYear} on ${context.event.resultDate}. AI outlook: ${outlook}.`,
    streetExpectations: street,
    aiExpectations,
    historicalEarnings: `Last print ${latest.label}: revenue trend ${revDelta >= 0 ? "up" : "down"}, EPS ${epsDelta >= 0 ? "up" : "down"}, margin ${marginDelta >= 0 ? "expanding" : "compressing"}.`,
    revenueTrend: points,
    epsTrend: points,
    marginTrend: points,
    operatingLeverage,
    beatMissHistory: points.map((p) => ({
      label: p.label,
      result: p.surprise,
    })),
    institutionalPositioning:
      context.fiiPercent != null || context.diiPercent != null
        ? `FII ${context.fiiPercent ?? "—"}% · DII ${context.diiPercent ?? "—"}% · Interest ${risk.institutionalInterest}.`
        : `Institutional interest assessed as ${risk.institutionalInterest} from calendar and liquidity context.`,
    riskAnalysis: risk.riskSummary,
    bullCase,
    bearCase,
    catalysts,
    questionsToWatch: questions,
    expectedMarketReaction: reaction,
    finalAIOpinion: opinion,
    confidenceBreakdown: confidence.breakdown,
    empty: false,
    emptyMessage: "",
  };
}
