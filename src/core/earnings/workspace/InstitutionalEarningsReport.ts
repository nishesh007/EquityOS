/**
 * Institutional earnings report — generates via Sprint 9F Reporting Engine.
 * No new exporters; PDF/Excel/Markdown/Print reuse ExportFacade + ACL.
 */

import {
  exportExcel,
  exportMarkdown,
  exportPDF,
  generateReport,
  printReport,
  type ExportAccessSubject,
  type ExportableFormat,
  type ExportResult,
  type InstitutionalReport,
  type ReportSourcePayload,
} from "@/src/core/dataIntegrity/reporting";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { EarningsScorecard } from "@/src/core/earnings/dashboard";
import { getResearchSummary } from "@/src/core/earnings/intelligence";
import {
  getGuidanceSummary,
  getPostEarningsAnalysis,
} from "@/src/core/earnings/postAnalysis";
import {
  getTranscriptSummary,
} from "@/src/core/earnings/transcripts";
import type { DecisionSummary } from "./WorkspaceModels";
import {
  WORKSPACE_EMPTY,
  type EarningsReportSection,
  type InstitutionalEarningsReportView,
} from "./WorkspaceModels";

const DISCLAIMER =
  "Institutional research for informational purposes only. Not investment advice. Past performance does not guarantee future results.";

export function buildEarningsReportSections(input: {
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
  decision: DecisionSummary;
  portfolioExposure: string;
  watchlistExposure: string;
}): EarningsReportSection[] {
  const { event, scorecard, decision } = input;
  const research = getResearchSummary(event);
  let estimateVsActual = "Awaiting Results";
  let guidance = "Guidance analysis pending";
  let transcript = "Transcript Awaited";

  try {
    if (scorecard.resultsReleased) {
      const post = getPostEarningsAnalysis(event);
      estimateVsActual = post.comparison.available
        ? `Overall ${post.comparison.overallOutcome}`
        : "Results Not Published";
      const g = getGuidanceSummary(event);
      guidance = g.available ? `${g.change} · ${g.commentary}` : g.emptyMessage;
    }
  } catch {
    /* keep defaults */
  }

  try {
    const t = getTranscriptSummary(event.ticker, event.resultDate);
    if (t.available) {
      transcript = t.executiveSummary || t.emptyMessage || "Transcript available";
    } else {
      transcript = t.emptyMessage || "Transcript Awaited";
    }
  } catch {
    /* keep defaults */
  }

  return [
    {
      id: "executive_summary",
      title: "Executive Summary",
      body: research.empty
        ? `${event.companyName} (${event.ticker}) · ${event.quarter} ${event.financialYear}. Decision: ${decision.recommendation}.`
        : research.executiveSummary,
    },
    {
      id: "earnings_preview",
      title: "Earnings Preview",
      body: `${event.quarter} ${event.financialYear} · Session ${event.resultSession} · Beat probability ${scorecard.beatProbability} · AI confidence ${scorecard.aiConfidence}.`,
    },
    {
      id: "ai_outlook",
      title: "AI Outlook",
      body: `${scorecard.outlook}. ${research.empty ? WORKSPACE_EMPTY.awaitingEarnings : research.finalAIOpinion}`,
    },
    {
      id: "portfolio_exposure",
      title: "Portfolio Exposure",
      body: event.inPortfolio
        ? `In portfolio · exposure score ${input.portfolioExposure}. Impact direction informed by AI outlook ${scorecard.outlook}.`
        : WORKSPACE_EMPTY.noPortfolio,
    },
    {
      id: "watchlist_exposure",
      title: "Watchlist Exposure",
      body: event.inWatchlist
        ? `On watchlist · exposure ${input.watchlistExposure}. High conviction: ${
            event.highConviction || scorecard.aiConfidence >= 70 ? "Yes" : "No"
          }.`
        : WORKSPACE_EMPTY.noWatchlist,
    },
    {
      id: "historical_performance",
      title: "Historical Performance",
      body: research.empty
        ? `Historical beat rate ${scorecard.historicalBeatRate}.`
        : research.historicalEarnings,
    },
    {
      id: "estimate_vs_actual",
      title: "Estimate vs Actual",
      body: estimateVsActual,
    },
    {
      id: "transcript_summary",
      title: "Transcript Summary",
      body: transcript,
    },
    {
      id: "guidance_analysis",
      title: "Guidance Analysis",
      body: guidance,
    },
    {
      id: "risk_assessment",
      title: "Risk Assessment",
      body: `Risk ${scorecard.riskScore} · Expected volatility ${scorecard.expectedVolatilityScore}. ${
        research.empty ? "" : research.riskAnalysis
      }`.trim(),
    },
    {
      id: "catalysts",
      title: "Catalysts",
      body:
        decision.catalysts.length > 0
          ? decision.catalysts.join("; ")
          : research.catalysts?.join("; ") || "No catalysts listed",
    },
    {
      id: "decision_summary",
      title: "Decision Summary",
      body: `${decision.recommendation} · Confidence ${decision.confidence} · Risk ${decision.risk}. ${decision.reasoning}`,
    },
    {
      id: "disclaimer",
      title: "Disclaimer",
      body: DISCLAIMER,
    },
  ];
}

function toReportPayloads(input: {
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
  decision: DecisionSummary;
  sections: EarningsReportSection[];
}): ReportSourcePayload[] {
  const { event, scorecard, decision, sections } = input;
  const modulePayloads: ReportSourcePayload[] = sections
    .filter((s) => s.id !== "disclaimer")
    .map((section, index) => ({
      sourceId: `earnings.${section.id}`,
      module: section.title,
      stock: event.ticker,
      sector: event.sector,
      exchange: event.exchange,
      recommendation: decision.recommendation,
      averageScore: scorecard.institutionalScore,
      integrityScore: scorecard.aiConfidence,
      trustScore: scorecard.beatProbability,
      historicalScore: scorecard.historicalBeatRate,
      recommendationQuality: scorecard.opportunityScore,
      tradeQuality: 100 - scorecard.riskScore,
      overallHealth: scorecard.institutionalScore,
      status: "ACTIVE" as const,
      trend:
        scorecard.outlook === "Bullish"
          ? ("UP" as const)
          : scorecard.outlook === "Bearish"
            ? ("DOWN" as const)
            : ("FLAT" as const),
      validationCount: 1,
      passed: scorecard.available ? 1 : 0,
      failed: scorecard.available ? 0 : 1,
      warnings: scorecard.riskScore >= 70 ? 1 : 0,
      metadata: {
        sectionId: section.id,
        body: section.body,
        order: index,
      },
      recommendationsList: [decision.recommendation, decision.reasoning],
      warningsList:
        scorecard.riskScore >= 70
          ? [`Elevated earnings risk for ${event.ticker}`]
          : [],
    }));

  modulePayloads.push({
    sourceId: "earnings.workspace",
    module: "Earnings Workspace",
    stock: event.ticker,
    averageScore: scorecard.institutionalScore,
    overallHealth: scorecard.institutionalScore,
    integrityScore: scorecard.aiConfidence,
    trustScore: scorecard.beatProbability,
    historicalScore: scorecard.historicalBeatRate,
    recommendationQuality: scorecard.opportunityScore,
    tradeQuality: 100 - scorecard.riskScore,
    status: "ACTIVE",
    recommendationsList: [
      `${event.ticker}: ${decision.recommendation}`,
      ...sections.slice(0, 3).map((s) => `${s.title}: ${s.body.slice(0, 160)}`),
    ],
  });

  return modulePayloads;
}

export function buildInstitutionalEarningsReport(input: {
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
  decision: DecisionSummary;
  portfolioExposure?: string;
  watchlistExposure?: string;
}): InstitutionalEarningsReportView {
  const sections = buildEarningsReportSections({
    event: input.event,
    scorecard: input.scorecard,
    decision: input.decision,
    portfolioExposure: input.portfolioExposure ?? "—",
    watchlistExposure: input.watchlistExposure ?? "—",
  });

  let institutional: InstitutionalReport | null = null;
  try {
    const payloads = toReportPayloads({
      event: input.event,
      scorecard: input.scorecard,
      decision: input.decision,
      sections,
    });
    const report = generateReport({
      reportType: "CustomReport",
      includeLiveCollectors: false,
      payloads,
      detailLevel: "STANDARD",
      label: `earnings-${input.event.ticker}`,
    });
    institutional = {
      ...report,
      title: `Institutional Earnings Report · ${input.event.ticker}`,
      reportType: "DailyMarketReport",
      recommendations: [
        `${input.decision.recommendation}: ${input.decision.reasoning}`,
        ...report.recommendations,
      ].slice(0, 20),
    };
  } catch {
    institutional = null;
  }

  const ready = institutional != null;
  return {
    ticker: input.event.ticker,
    title: `Institutional Earnings Report · ${input.event.ticker}`,
    sections,
    institutional,
    ready,
    emptyMessage: ready ? "" : WORKSPACE_EMPTY.noReport,
    disclaimer: DISCLAIMER,
  };
}

/** Export integration — reuses Sprint 9F exporters + ACL only. */
export function exportInstitutionalEarningsReport(input: {
  report: InstitutionalReport;
  format: ExportableFormat;
  subject: ExportAccessSubject;
}): ExportResult<unknown> {
  const options = {
    reportType: "DailyMarketReport" as const,
    report: input.report,
    subject: input.subject,
    generatedBy: input.subject.userId,
  };

  switch (input.format) {
    case "PDF":
      return exportPDF(options);
    case "EXCEL":
      return exportExcel(options);
    case "MARKDOWN":
      return exportMarkdown(options);
    case "PRINT":
      return printReport(options);
    default:
      return exportMarkdown(options);
  }
}
