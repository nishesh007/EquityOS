import { NextResponse } from "next/server";
import { triggerOpportunityScan } from "@/services/opportunityEngine";

export async function POST() {
  const result = await triggerOpportunityScan();
  return NextResponse.json({
    success: true,
    state: result.state,
    durationMs: result.durationMs,
    symbolsScanned: result.symbolsScanned,
    added: result.added,
    removed: result.removed,
    updated: result.updated,
  });
}
