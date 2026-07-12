import { NextResponse } from "next/server";
import { getProviderHealth } from "@/lib/market-data";

export async function GET() {
  return NextResponse.json({
    providers: getProviderHealth(),
    serverTime: new Date().toISOString(),
  });
}
