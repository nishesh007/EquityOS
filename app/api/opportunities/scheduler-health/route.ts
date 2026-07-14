import { NextResponse } from "next/server";
import { getSchedulerHealth } from "@/services/opportunityEngine";

export async function GET() {
  const health = getSchedulerHealth();
  return NextResponse.json(health);
}
