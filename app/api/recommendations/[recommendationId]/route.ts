import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
  replayRecommendation,
  updateRecommendationStatus,
  type RecommendationRecordStatus,
} from "@/lib/opportunity-engine";

type RouteContext = {
  params: Promise<{ recommendationId: string }>;
};

const TRANSITION_STATUSES = new Set<RecommendationRecordStatus>([
  "EXPIRED",
  "INVALIDATED",
  "ARCHIVED",
]);

/** Replay returns the original snapshot plus its complete lifecycle. */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { recommendationId } = await context.params;
  const recommendation = replayRecommendation(
    getOpportunityState(),
    recommendationId
  );
  if (!recommendation) {
    return NextResponse.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ recommendation });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { recommendationId } = await context.params;
  const body = (await request.json()) as {
    status?: RecommendationRecordStatus;
    reason?: string;
  };
  const status = body.status?.toUpperCase() as
    | RecommendationRecordStatus
    | undefined;

  if (!status || !TRANSITION_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Status must be EXPIRED, INVALIDATED, or ARCHIVED" },
      { status: 400 }
    );
  }

  const recommendation = updateRecommendationStatus(
    recommendationId,
    status as Exclude<RecommendationRecordStatus, "ACTIVE">,
    body.reason?.trim() || `Recommendation marked ${status.toLowerCase()}`
  );
  if (!recommendation) {
    return NextResponse.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ recommendation });
}
