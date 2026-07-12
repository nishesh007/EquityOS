import { buildCompareResult } from "@/lib/compare/compareEngine";
import { CompareEngineError } from "@/lib/ai/core/errors";

export const runtime = "nodejs";

import {
  AIApiError,
  createAIHandlerContext,
  enforceRateLimit,
  jsonErrorResponse,
  parseJsonBody,
  withRateLimitHeaders,
} from "@/lib/platform/api";
import { compareRequestSchema } from "@/lib/ai/core/validation";
import { logger } from "@/lib/platform/logger";

export async function POST(request: Request) {
  const ctx = createAIHandlerContext(request);
  const route = "/api/ai/compare";

  try {
    enforceRateLimit(request, route);
    const body = await parseJsonBody(request, compareRequestSchema);
    const result = await buildCompareResult(body.symbols);

    logger.info("compare_completed", {
      requestId: ctx.requestId,
      route,
      durationMs: Date.now() - ctx.startedAt,
      symbols: result.symbols,
    });

    return withRateLimitHeaders(
      Response.json(result, { headers: { "X-Request-Id": ctx.requestId } }),
      request,
      route
    );
  } catch (error) {
    if (error instanceof CompareEngineError) {
      return jsonErrorResponse(
        new AIApiError(error.message, error.status, error.code),
        ctx,
        route
      );
    }
    if (error instanceof AIApiError) {
      return jsonErrorResponse(error, ctx, route);
    }

    logger.error("compare_failed", {
      requestId: ctx.requestId,
      route,
      durationMs: Date.now() - ctx.startedAt,
      error: error instanceof Error ? error.message : "unknown",
    });

    return jsonErrorResponse(error, ctx, route);
  }
}
