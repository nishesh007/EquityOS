import { NextResponse } from "next/server";
import {
  getMarketStatus,
  getMarketStatusLabel,
  getQuotePollIntervalMs,
  isMarketOpen,
} from "@/lib/market/session";

export async function GET() {
  const now = new Date();
  const status = getMarketStatus(now);

  return NextResponse.json({
    marketOpen: isMarketOpen(now),
    marketStatus: status,
    marketStatusLabel: getMarketStatusLabel(status),
    pollIntervalMs: getQuotePollIntervalMs(now),
    timezone: "Asia/Kolkata",
    serverTime: now.toISOString(),
  });
}
