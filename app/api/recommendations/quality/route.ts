import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import { getLastQualityGateReport } from "@/lib/recommendations/quality-gate";

export async function GET() {
  const state = await loadOpportunityEngineState();
  const report = state.qualityGate ?? getLastQualityGateReport();

  if (!report) {
    return NextResponse.json({
      candidatesEvaluated: 0,
      published: 0,
      rejected: 0,
      rejectionBreakdown: {},
      averageConviction: 0,
      averageRiskReward: 0,
      publishedAverageConviction: 0,
      publishedAverageRiskReward: 0,
      sessionId: state.tradingDate,
      scanId: state.published?.scanId ?? null,
      generatedAt: null,
      message: "No quality gate report yet — run an Opportunity Engine scan.",
      topRejectionReasons: [],
    });
  }

  const topRejectionReasons = Object.entries(report.rejectionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));

  return NextResponse.json({
    candidatesEvaluated: report.candidatesEvaluated,
    published: report.published,
    rejected: report.rejected,
    rejectionBreakdown: report.rejectionBreakdown,
    averageConviction: report.averageConviction,
    averageRiskReward: report.averageRiskReward,
    publishedAverageConviction: report.publishedAverageConviction,
    publishedAverageRiskReward: report.publishedAverageRiskReward,
    sessionId: report.sessionId,
    scanId: report.scanId,
    generatedAt: report.generatedAt,
    topRejectionReasons,
    rejections: report.rejections.slice(0, 50),
  });
}
