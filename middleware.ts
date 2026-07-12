import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/platform/rate-limit";
import { getClientIp } from "@/lib/platform/security";

export function middleware(request: NextRequest) {
  const ip = getClientIp(request);
  const result = checkRateLimit(`api-ai:${ip}`);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly.", code: "RATE_LIMITED" },
      { status: 429, headers: rateLimitHeaders(result) }
    );
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/api/ai/:path*"],
};
