import { NextResponse } from "next/server";
import { loadOpportunityEngineState } from "@/services/opportunityEngine";
import {
  buildPublishedStatusReport,
  loadPublishedRecommendations,
} from "@/lib/recommendations/published/server";

export async function GET() {
  const state = await loadOpportunityEngineState();
  const published = await loadPublishedRecommendations(state);
  const status = buildPublishedStatusReport(state, published);

  return NextResponse.json({
    currentSession: status.currentSession,
    latestScanId: status.latestScanId,
    publishedCount: status.publishedCount,
    dashboardSlotCount: status.dashboardSlotCount,
    filledDashboardSlotCount: status.filledDashboardSlotCount,
    recommendationVersion: status.recommendationVersion,
    generatedAt: status.generatedAt,
    consumerStatus: status.consumers,
    integrity: published
      ? {
          sessionId: published.sessionId,
          scanId: published.scanId,
          recommendationVersion: published.recommendationVersion,
        }
      : null,
  });
}
