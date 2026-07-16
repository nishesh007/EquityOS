import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunityState,
  replayRecommendation,
} from "@/lib/opportunity-engine";

type RouteContext = {
  params: Promise<{ recommendationId: string }>;
};

/**
 * Replays the immutable recommendation exactly as generated. No current
 * market data, rescoring, or report generation is involved.
 */
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
