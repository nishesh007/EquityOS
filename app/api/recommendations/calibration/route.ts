import { NextResponse } from "next/server";
import { runRecommendationCalibration } from "@/lib/recommendations/calibration";

/**
 * GET /api/recommendations/calibration
 * Advisory Quality Gate threshold recommendations from Paper Trading outcomes.
 * Does NOT mutate thresholds.
 */
export async function GET() {
  const report = runRecommendationCalibration();

  return NextResponse.json({
    currentThresholds: report.currentThresholds,
    suggestedThresholds: report.suggestedThresholds,
    suggestions: report.suggestions,
    supportingStatistics: {
      sampleSize: report.sampleSize,
      closedTrades: report.closedTrades,
      overall: report.overall,
      bestBucket: report.bestBucket,
      worstBucket: report.worstBucket,
      buckets: report.buckets.filter((b) => b.trades >= 3).slice(0, 40),
    },
    confidence: report.confidence,
    generatedAt: report.generatedAt,
    notes: report.notes,
    approvalRequired: true,
    autoApply: false,
  });
}
