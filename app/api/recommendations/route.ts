import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
  listRecommendationHistory,
  type RecommendationRecordStatus,
} from "@/lib/opportunity-engine";
import {
  wireHealthDashboard,
  wireLearningHistory,
  wireOutcomeDashboard,
  wireRecommendationHistory,
  wireReplayHistory,
} from "@/src/core/recommendations";

const STATUSES = new Set<RecommendationRecordStatus>([
  "ACTIVE",
  "EXPIRED",
  "INVALIDATED",
  "ARCHIVED",
]);

export async function GET(request: NextRequest) {
  const requestedStatus = request.nextUrl.searchParams
    .get("status")
    ?.toUpperCase() as RecommendationRecordStatus | undefined;

  if (requestedStatus && !STATUSES.has(requestedStatus)) {
    return NextResponse.json(
      { error: `Unsupported recommendation status: ${requestedStatus}` },
      { status: 400 }
    );
  }

  const recommendations = listRecommendationHistory(
    getOpportunityState(),
    requestedStatus
  );
  return NextResponse.json({
    recommendations,
    lifecycle: wireRecommendationHistory(),
    health: wireHealthDashboard(),
    replay: wireReplayHistory(),
    outcomes: wireOutcomeDashboard(),
    learning: wireLearningHistory(),
  });
}
