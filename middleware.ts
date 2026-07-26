import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/platform/rate-limit";
import { getClientIp } from "@/lib/platform/security";
import { applySecurityHeaders } from "@/lib/ops/security-headers";

const PROTECTED_PREFIXES = ["/settings", "/admin"];

function withSecurity(response: NextResponse): NextResponse {
  applySecurityHeaders(response.headers);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const session = request.cookies.get("equityos_session")?.value;
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return withSecurity(NextResponse.redirect(login));
    }
  }

  if (pathname.startsWith("/api/ai")) {
    const ip = getClientIp(request);
    const result = checkRateLimit(`api-ai:${ip}`);

    if (!result.allowed) {
      return withSecurity(
        NextResponse.json(
          {
            error: "Rate limit exceeded. Please retry shortly.",
            code: "RATE_LIMITED",
          },
          { status: 429, headers: rateLimitHeaders(result) }
        )
      );
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
      response.headers.set(key, value);
    }
    return withSecurity(response);
  }

  if (pathname.startsWith("/api/billing/webhooks")) {
    const ip = getClientIp(request);
    const result = checkRateLimit(`api-webhook:${ip}`);
    if (!result.allowed) {
      return withSecurity(
        NextResponse.json(
          { error: "Webhook rate limit exceeded", code: "RATE_LIMITED" },
          { status: 429, headers: rateLimitHeaders(result) }
        )
      );
    }
  }

  return withSecurity(NextResponse.next());
}

export const config = {
  matcher: [
    "/api/ai/:path*",
    "/api/billing/:path*",
    "/settings",
    "/settings/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
