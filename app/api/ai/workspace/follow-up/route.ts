import { buildFollowUpBundle } from "@/lib/ai/followUpEngine";

export const runtime = "nodejs";

import {
  AIApiError,
  createAIHandlerContext,
  enforceRateLimit,
  jsonErrorResponse,
  parseJsonBody,
  withRateLimitHeaders,
} from "@/lib/platform/api";
import { logger } from "@/lib/platform/logger";
import { followUpRequestSchema } from "@/lib/ai/core/validation";

export async function POST(request: Request) {
  const ctx = createAIHandlerContext(request);
  const route = "/api/ai/workspace/follow-up";

  try {
    enforceRateLimit(request, route);
    const body = await parseJsonBody(request, followUpRequestSchema);

    const bundle = await buildFollowUpBundle({
      prompt: body.prompt,
      answer: body.answer,
      symbol: body.symbol ?? null,
    });

    logger.info("follow_up_generated", {
      requestId: ctx.requestId,
      route,
      durationMs: Date.now() - ctx.startedAt,
      symbol: bundle.resolvedSymbol,
    });

    return withRateLimitHeaders(
      Response.json(bundle, {
        headers: { "X-Request-Id": ctx.requestId },
      }),
      request,
      route
    );
  } catch (error) {
    if (error instanceof AIApiError) {
      return jsonErrorResponse(error, ctx, route);
    }

    logger.error("follow_up_failed", {
      requestId: ctx.requestId,
      route,
      durationMs: Date.now() - ctx.startedAt,
      error: error instanceof Error ? error.message : "unknown",
    });

    return jsonErrorResponse(error, ctx, route);
  }
}
