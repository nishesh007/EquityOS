import { NextResponse } from "next/server";
import { fetchOpportunityEngineBundle } from "@/services/opportunityEngine";

export async function GET() {
  const bundle = await fetchOpportunityEngineBundle();
  return NextResponse.json({
    ...bundle.state,
    marketIntelligence: bundle.marketIntelligence,
  });
}
