/**
 * Institutional research report generator — 20-section equity research reports.
 */

import {
  resolveSymbolsFromPrompt,
} from "@/lib/ai/context/companyContext";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import { loadInstitutionalBundle } from "@/lib/ai/institutional/loadBundle";
import {
  buildInstitutionalRating,
  deriveProbabilityMatrix,
} from "@/lib/research/ratingEngine";
import { buildInstitutionalMoatAssessment, formatMoatSection } from "@/lib/research/moatEngine";
import { buildInstitutionalRiskAssessment, formatRiskSection } from "@/lib/research/riskEngine";
import {
  buildInstitutionalValuation,
  formatValuationSection,
} from "@/lib/research/valuationEngine";
import {
  bulletList,
  type InstitutionalReportHeader,
  type ReportSection,
  renderProbabilityMatrix,
  renderRatingTable,
  renderReportMarkdown,
  REPORT_SECTIONS,
} from "@/lib/research/reportTemplates";
import {
  renderDecisionSummaryMarkdown,
  type AIDecisionSummary,
} from "@/lib/ai/decision/decisionEngine";
import type { CompanyProfile, EquityIntelligence, Opportunity } from "@/types";
import {
  ensureOpportunityEngineState,
  fetchRecommendationForSymbol,
} from "@/services/opportunityEngine";
import type { SharedRecommendation } from "@/lib/recommendations";

export interface InstitutionalResearchReport {
  header: InstitutionalReportHeader;
  sections: ReportSection[];
  rating: ReturnType<typeof buildInstitutionalRating>;
  probability: { bull: number; base: number; bear: number };
  decision: AIDecisionSummary | null;
}

function toReportDecision(
  recommendation: SharedRecommendation,
  companyName: string
): AIDecisionSummary {
  return {
    symbol: recommendation.symbol,
    companyName,
    recommendation:
      recommendation.action === "BUY"
        ? "Buy"
        : recommendation.action === "SELL"
          ? "Sell"
          : "Hold",
    confidenceScore: recommendation.confidence,
    aiConvictionScore: recommendation.conviction,
    reasonsToBuy:
      recommendation.action === "BUY" ? recommendation.reasons : [],
    reasonsNotToBuy:
      recommendation.action !== "BUY" ? recommendation.reasons : [],
    redFlags: recommendation.opposingStrategies,
    upcomingCatalysts: recommendation.evidence,
    timeHorizon:
      recommendation.category === "intraday" ? "Swing" : "1 Year",
    timeHorizonRationale: recommendation.holdingPeriod,
    suitableInvestor: ["Momentum"],
    positionSizing:
      recommendation.confidence >= 75
        ? "High Conviction"
        : recommendation.confidence >= 55
          ? "Medium Conviction"
          : "Watchlist",
    earningsTrend: recommendation.marketContext,
    compositeScore: recommendation.opportunityScore,
    generatedAt: recommendation.timestamp,
  };
}

export class ReportGeneratorError extends Error {
  readonly status: number;

  constructor(message: string, status = 404) {
    super(message);
    this.name = "ReportGeneratorError";
    this.status = status;
  }
}

function buildExecutiveSummary(input: {
  context: CompanyContext;
  rating: ReturnType<typeof buildInstitutionalRating>;
  valuation: ReturnType<typeof buildInstitutionalValuation>;
  moat: ReturnType<typeof buildInstitutionalMoatAssessment>;
}): string {
  const { context, rating, valuation, moat } = input;
  return [
    `${context.profile.name} (${context.profile.symbol}) — **${rating.overallRating}** with an overall score of **${rating.overallScore}/100**.`,
    ``,
    `EquityOS rates business quality at ${rating.dimensions.businessQuality}/10 with a **${moat.moatVerdict}** moat (${moat.overallMoatScore}/10). Financial strength ${rating.dimensions.financialStrength}/10; valuation ${rating.dimensions.valuation}/10 (${valuation.analysis.overallVerdict}).`,
    ``,
    `Fair value estimate: ₹${valuation.fairValue.toLocaleString("en-IN")} vs current ₹${context.profile.price.toLocaleString("en-IN")} (${valuation.upsidePercent > 0 ? "+" : ""}${valuation.upsidePercent.toFixed(1)}% implied upside).`,
    ``,
    rating.rationale,
  ].join("\n");
}

function buildQuarterlySection(context: CompanyContext, intelligence: EquityIntelligence | null): string {
  const quarters = context.quarterlyResults.slice(0, 4);
  const lines = quarters.map(
    (q) =>
      `**${q.quarter}:** Revenue ${q.revenue}, Profit ${q.netProfit}, EPS ₹${q.eps}, Margin ${q.margin}%${
        q.revenueYoY ? `, Rev YoY ${q.revenueYoY}%` : ""
      }`
  );

  const summary = intelligence?.quarterly.summary ?? context.latestResults?.commentary;
  return [summary ?? "Latest quarterly trajectory from EquityOS filings.", ``, bulletList(lines)].join("\n");
}

function buildAnnualGrowthSection(context: CompanyContext): string {
  const fi = context.financialIntelligence;
  if (!fi) return "Annual growth analysis unavailable — fundamentals bundle not loaded.";

  const { cagr, ratios } = fi;
  return [
    `| Metric | 3Y CAGR | 5Y CAGR | 10Y CAGR | YoY |`,
    `| --- | --- | --- | --- | --- |`,
    `| Revenue | ${formatCagr(cagr.revenue.cagr3Y)} | ${formatCagr(cagr.revenue.cagr5Y)} | ${formatCagr(cagr.revenue.cagr10Y)} | ${ratios.revenueGrowthYoY ?? "—"}% |`,
    `| Profit | ${formatCagr(cagr.profit.cagr3Y)} | ${formatCagr(cagr.profit.cagr5Y)} | ${formatCagr(cagr.profit.cagr10Y)} | ${ratios.profitGrowthYoY ?? "—"}% |`,
    `| EPS | ${formatCagr(cagr.eps.cagr3Y)} | ${formatCagr(cagr.eps.cagr5Y)} | ${formatCagr(cagr.eps.cagr10Y)} | ${ratios.epsGrowthYoY ?? "—"}% |`,
  ].join("\n");
}

function formatCagr(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function buildCashFlowSection(context: CompanyContext): string {
  const fi = context.financialIntelligence;
  if (!fi) return "Cash flow data unavailable.";

  const { ttm, ratios, fundamentals } = fi;
  return [
    `| Metric | Value |`,
    `| --- | --- |`,
    `| TTM Operating Cash Flow | ${ttm.operatingCashFlow ?? "—"} |`,
    `| TTM Free Cash Flow | ${ttm.freeCashFlow ?? "—"} |`,
    `| FCF (annual) | ${fundamentals.fcf} |`,
    `| FCF Margin | ${ratios.fcfMargin ?? fundamentals.fcfMargin ?? "—"}% |`,
    `| CFO / PAT | ${ratios.cfoToPat ?? fundamentals.cashConversion ?? "—"}% |`,
    `| Cash Conversion | ${fundamentals.cashConversion ?? "—"}% |`,
  ].join("\n");
}

function buildBalanceSheetSection(context: CompanyContext): string {
  const fi = context.financialIntelligence;
  const f = context.financialRatios.headline;
  const ratios = fi?.ratios;

  return [
    `Debt/Equity: **${ratios?.debtToEquity ?? f.debtToEquity}x** · ROE: **${ratios?.roe ?? f.roe}%** · ROCE: **${ratios?.roce ?? f.roce}%**`,
    ``,
    fi
      ? `Solvency score: **${fi.scores.solvencyScore}/100** · Financial health: **${fi.scores.financialHealthScore}/100** · Interest coverage: ${ratios?.interestCoverage ?? fi.fundamentals.interestCoverage ?? "—"}x`
      : "Solvency metrics derived from headline financials.",
    ``,
    `Current ratio: ${ratios?.currentRatio ?? fi?.fundamentals.currentRatio ?? "—"} · Quick ratio: ${fi?.fundamentals.quickRatio ?? "—"}`,
  ].join("\n");
}

function buildShareholdingSection(context: CompanyContext): string {
  const sh = context.shareholding;
  const changes = sh.changes;
  return [
    `| Holder | % |`,
    `| --- | --- |`,
    `| Promoter | ${sh.promoter}% |`,
    `| FII | ${sh.fii}% |`,
    `| DII | ${sh.dii}% |`,
    `| Public | ${sh.public}% |`,
    ``,
    changes
      ? `QoQ changes — Promoter ${changes.promoter > 0 ? "+" : ""}${changes.promoter}%, FII ${changes.fii > 0 ? "+" : ""}${changes.fii}%, DII ${changes.dii > 0 ? "+" : ""}${changes.dii}%`
      : `Last updated: ${sh.lastUpdated}`,
  ].join("\n");
}

function buildTechnicalSection(context: CompanyContext): string {
  const tech = context.technicalIndicators;
  if (!tech) return "Technical analysis unavailable.";

  const indicators = tech.indicators
    .slice(0, 6)
    .map((item) => `**${item.name}:** ${item.value} (${item.signal}) — ${item.detail}`);

  return [
    `Technical score: **${tech.score}/100** · Summary: **${tech.summary}**`,
    `Bullish ${tech.bullishCount} · Neutral ${tech.neutralCount} · Bearish ${tech.bearishCount}`,
    ``,
    bulletList(indicators),
  ].join("\n");
}

function buildCaseSection(
  label: string,
  thesis: string | undefined,
  fallback: string
): string {
  return thesis?.trim() || fallback;
}

function buildSections(input: {
  context: CompanyContext;
  profile: CompanyProfile;
  intelligence: EquityIntelligence | null;
  valuation: ReturnType<typeof buildInstitutionalValuation>;
  risk: ReturnType<typeof buildInstitutionalRiskAssessment>;
  moat: ReturnType<typeof buildInstitutionalMoatAssessment>;
  rating: ReturnType<typeof buildInstitutionalRating>;
  opportunities: Opportunity[];
  ragFormatted: string;
}): ReportSection[] {
  const { context, profile, intelligence, valuation, risk, moat, rating, opportunities, ragFormatted } =
    input;
  const thesis = intelligence?.thesis;

  const sectionContent: Record<(typeof REPORT_SECTIONS)[number], string> = {
    "Executive Summary": buildExecutiveSummary({ context, rating, valuation, moat }),
    "Business Overview": profile.description || `${profile.name} operates in ${profile.industry} (${profile.sector}).`,
    "Industry Structure": `${profile.sector} / ${profile.industry} — competitive landscape assessed via ${context.peerComparison.length} peer comparables. Sector growth and regulatory dynamics inform the institutional view.`,
    "Competitive Advantages (Moat)": formatMoatSection(moat),
    "Management Quality":
      thesis?.managementQuality ??
      `Promoter holding ${context.shareholding.promoter}% with institutional ownership FII ${context.shareholding.fii}% / DII ${context.shareholding.dii}%.`,
    "Financial Performance": context.financialIntelligence
      ? `Revenue ${context.financialRatios.headline.revenue} (${context.financialRatios.headline.revenueGrowth}% YoY), Net profit ${context.financialRatios.headline.netProfit} (${context.financialRatios.headline.netProfitGrowth}% YoY). ROE ${context.financialRatios.headline.roe}%, ROCE ${context.financialRatios.headline.roce}%, P/E ${context.financialRatios.headline.pe}x.`
      : `Revenue ${context.financialRatios.headline.revenue}, Net profit ${context.financialRatios.headline.netProfit}.`,
    "Quarterly Analysis": buildQuarterlySection(context, intelligence),
    "Annual Growth Analysis": buildAnnualGrowthSection(context),
    "Cash Flow Analysis": buildCashFlowSection(context),
    "Balance Sheet Strength": buildBalanceSheetSection(context),
    "Shareholding Analysis": buildShareholdingSection(context),
    Valuation: formatValuationSection(valuation),
    "Technical Trend": buildTechnicalSection(context),
    "Key Risks": formatRiskSection(risk),
    "Key Catalysts": bulletList(
      thesis?.keyCatalysts ??
        opportunities.map((item) => `${item.label}: ${item.description}`)
    ),
    "Bull Case": buildCaseSection(
      "Bull",
      thesis?.bullCase,
      `Upside case driven by ${valuation.upsidePercent.toFixed(0)}% valuation upside, ${moat.moatVerdict} moat, and growth score ${rating.dimensions.growth}/10.`
    ),
    "Bear Case": buildCaseSection(
      "Bear",
      thesis?.bearCase,
      `Downside case if ${risk.redFlags.length} flagged risks materialise and valuation re-rates to peer median.`
    ),
    "Base Case": `Base case assumes ${valuation.analysis.expectedCagr.toFixed(1)}% earnings CAGR, fair value ₹${valuation.fairValue.toLocaleString("en-IN")}, and ${rating.overallRating} stance over a 12-month horizon.`,
    "Probability Matrix": "_See probability matrix below._",
    "Final Verdict": [
      `**Recommendation: ${rating.overallRating}**`,
      `Overall score: **${rating.overallScore}/100**`,
      ``,
      intelligence?.decision.aiSummary?.institutionalSummary ??
        rating.rationale,
      ``,
      ragFormatted !== "No institutional document chunks were retrieved from the vector store for this query."
        ? `Indexed filing context was reviewed for this report.`
        : `No matching indexed filings were retrieved from the vector store.`,
    ].join("\n"),
  };

  return REPORT_SECTIONS.map((title) => ({
    key: title,
    title,
    content: sectionContent[title],
  }));
}

export async function generateInstitutionalReport(
  symbol: string,
  prompt?: string
): Promise<InstitutionalResearchReport> {
  const researchPrompt = prompt ?? `Analyse ${symbol}`;
  const loaded = await loadInstitutionalBundle(symbol, researchPrompt);

  if (!loaded) {
    throw new ReportGeneratorError(
      `Unable to load EquityOS research data for ${symbol.toUpperCase()}.`,
      404
    );
  }

  const {
    context,
    profile,
    intelligence,
    valuation,
    risk,
    moat,
    opportunities,
    ragChunks,
    ragFormatted,
  } = loaded;

  const rating = buildInstitutionalRating({
    context,
    valuation,
    risk,
    moat,
    intelligence,
  });

  const header: InstitutionalReportHeader = {
    symbol: context.profile.symbol,
    companyName: context.profile.name,
    sector: context.profile.sector,
    industry: context.profile.industry,
    price: context.profile.price,
    changePercent: context.profile.changePercent,
    marketCap: context.profile.marketCap,
    generatedAt: new Date().toISOString(),
    dataProvider: context.dataSource.provider,
  };

  const sections = buildSections({
    context,
    profile,
    intelligence,
    valuation,
    risk,
    moat,
    rating,
    opportunities,
    ragFormatted,
  });

  await ensureOpportunityEngineState();
  const strategyRecommendation = fetchRecommendationForSymbol(
    context.profile.symbol
  );
  const decision = strategyRecommendation
    ? toReportDecision(strategyRecommendation, context.profile.name)
    : null;

  return {
    header,
    sections,
    rating,
    probability: deriveProbabilityMatrix(rating),
    decision,
  };
}

export async function generateInstitutionalReportMarkdown(
  symbol: string,
  prompt?: string
): Promise<string> {
  const report = await generateInstitutionalReport(symbol, prompt);

  const ratingTable = renderRatingTable({
    overallRating: report.rating.overallRating,
    overallScore: report.rating.overallScore,
    businessQuality: report.rating.dimensions.businessQuality,
    financialStrength: report.rating.dimensions.financialStrength,
    valuation: report.rating.dimensions.valuation,
    growth: report.rating.dimensions.growth,
    risk: report.rating.dimensions.risk,
    management: report.rating.dimensions.management,
    technical: report.rating.dimensions.technical,
  });

  const probabilityMatrix = renderProbabilityMatrix(report.probability);
  const decisionSummary = report.decision
    ? renderDecisionSummaryMarkdown(report.decision)
    : "## Strategy Engine Recommendation\n\nNo validated recommendation is available from the centralized pipeline.";

  return renderReportMarkdown(
    report.header,
    report.sections,
    ratingTable,
    probabilityMatrix,
    decisionSummary
  );
}

export async function resolveSingleSymbolForReport(
  prompt: string,
  symbol: string | null
): Promise<string | null> {
  const symbols = resolveSymbolsFromPrompt(prompt, symbol);
  return symbols.length === 1 ? symbols[0] : symbols[0] ?? null;
}
