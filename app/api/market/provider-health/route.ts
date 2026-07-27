import { NextResponse } from "next/server";
import { getProviderHealth } from "@/lib/market-data/server";

export async function GET() {
  return NextResponse.json({
    providers: getProviderHealth(),
    serverTime: new Date().toISOString(),
  });
}
