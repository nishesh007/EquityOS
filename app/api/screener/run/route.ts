import { NextRequest, NextResponse } from "next/server";
import type { ScreenerQuery } from "@/lib/screener";
import { executeScreener } from "@/services/screenerData";
import { ensureOpportunityEngineState } from "@/services/opportunityEngine";

export async function POST(request: NextRequest) {
  let query: ScreenerQuery;
  try {
    query = (await request.json()) as ScreenerQuery;
  } catch {
    return NextResponse.json({ error: "Invalid screener query" }, { status: 400 });
  }

  await ensureOpportunityEngineState();
  const result = await executeScreener(query);
  return NextResponse.json(result);
}
