import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/platform/rate-limit";
import { getClientIp } from "@/lib/platform/security";

const PROTECTED_PREFIXES = ["/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const session = request.cookies.get("equityos_session")?.value;
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  if (!pathname.startsWith("/api/ai")) {
    return NextResponse.next();
  }

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
  matcher: ["/api/ai/:path*", "/settings", "/settings/:path*"],
};
