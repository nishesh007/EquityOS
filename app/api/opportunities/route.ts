import { NextResponse } from "next/server";
import { fetchOpportunityEngineState } from "@/services/opportunityEngine";

export async function GET() {
  const state = await fetchOpportunityEngineState();
  return NextResponse.json(state);
}
