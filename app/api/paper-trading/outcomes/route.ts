import { NextResponse } from "next/server";
import { fetchPaperTradingOutcomes } from "@/services/paperTrading";

export const dynamic = "force-dynamic";

/**
 * GET /api/paper-trading/outcomes
 * Trade Outcome Engine report — strategy summaries, winners/losers,
 * exit reason distribution, MFE/MAE statistics.
 */
export async function GET() {
  try {
    const report = fetchPaperTradingOutcomes();
    return NextResponse.json({
      generatedAt: report.generatedAt,
      tradesAnalyzed: report.tradesAnalyzed,
      closedTrades: report.closedTrades,
      openTrades: report.openTrades,
      strategySummaries: report.strategySummaries,
      topWinners: report.topWinners,
      worstPerformers: report.worstPerformers,
      exitReasonDistribution: report.exitReasonDistribution,
      mfeMaeStatistics: report.mfeMaeStatistics,
      bestStrategy: report.bestStrategy,
      worstStrategy: report.worstStrategy,
      mostCommonExitReason: report.mostCommonExitReason,
      notes: report.notes,
      outcomes: report.outcomes,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build trade outcome report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
