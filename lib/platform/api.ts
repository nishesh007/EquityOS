/**
 * Shared AI API handler — validation, rate limiting, logging, error mapping.
 */

import { ZodError, type ZodSchema } from "zod";
import { createRequestId, logger } from "@/lib/platform/logger";
import { checkRateLimit, peekRateLimit, rateLimitHeaders } from "@/lib/platform/rate-limit";
import { getClientIp } from "@/lib/platform/security";

export class AIApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "AI_API_ERROR") {
    super(message);
    this.name = "AIApiError";
    this.status = status;
    this.code = code;
  }
}

export interface AIHandlerContext {
  requestId: string;
  ip: string;
  startedAt: number;
}

export function createAIHandlerContext(request: Request): AIHandlerContext {
  return {
    requestId: createRequestId(),
    ip: getClientIp(request),
    startedAt: Date.now(),
  };
}

export function enforceRateLimit(request: Request, route: string): void {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${route}:${ip}`);
  if (!result.allowed) {
    throw new AIApiError("Rate limit exceeded. Please retry shortly.", 429, "RATE_LIMITED");
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AIApiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AIApiError(formatZodError(parsed.error), 400, "VALIDATION_ERROR");
  }
  return parsed.data;
}

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function jsonErrorResponse(
  error: unknown,
  ctx: AIHandlerContext,
  route: string
): Response {
  const durationMs = Date.now() - ctx.startedAt;

  if (error instanceof AIApiError) {
    logger.warn("ai_api_error", {
      requestId: ctx.requestId,
      route,
      durationMs,
      error: error.message,
      code: error.code,
    });
    return Response.json(
      { error: error.message, code: error.code, requestId: ctx.requestId },
      { status: error.status }
    );
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";

  logger.error("ai_api_unhandled_error", {
    requestId: ctx.requestId,
    route,
    durationMs,
    error: message,
  });

  return Response.json(
    { error: "Failed to process AI request", requestId: ctx.requestId },
    { status: 500 }
  );
}

export function withRateLimitHeaders(response: Response, request: Request, route: string): Response {
  const ip = getClientIp(request);
  const result = peekRateLimit(`${route}:${ip}`);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
    headers.set(key, value);
  }
  headers.set("X-Request-Id", headers.get("X-Request-Id") ?? createRequestId());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
