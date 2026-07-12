import {
  generateResearchStream,
  ResearchEngineError,
} from "@/lib/ai/researchEngine";

export const runtime = "nodejs";

import {
  AIApiError,
  createAIHandlerContext,
  enforceRateLimit,
  jsonErrorResponse,
  parseJsonBody,
  withRateLimitHeaders,
} from "@/lib/platform/api";
import { sanitizeUserPrompt } from "@/lib/platform/security";
import { getPlatformEnv } from "@/lib/platform/env";
import { chatRequestSchema } from "@/lib/ai/core/validation";
import { logger } from "@/lib/platform/logger";

export async function POST(request: Request) {
  const ctx = createAIHandlerContext(request);
  const route = "/api/ai/chat";

  try {
    enforceRateLimit(request, route);
    const body = await parseJsonBody(request, chatRequestSchema);
    const env = getPlatformEnv();
    const sanitized = sanitizeUserPrompt(body.prompt, env.AI_MAX_PROMPT_CHARS);

    if (sanitized.blocked) {
      throw new AIApiError(`Prompt rejected: ${sanitized.reasons.join(" ")}`, 400, "PROMPT_REJECTED");
    }

    const stream = await generateResearchStream({
      prompt: sanitized.value,
      symbol: body.symbol ?? null,
      requestId: ctx.requestId,
    });

    logger.info("chat_stream_started", {
      requestId: ctx.requestId,
      route,
      symbol: body.symbol ?? null,
    });

    return withRateLimitHeaders(
      new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Request-Id": ctx.requestId,
        },
      }),
      request,
      route
    );
  } catch (error) {
    if (error instanceof ResearchEngineError) {
      return jsonErrorResponse(
        new AIApiError(error.message, error.status, error.code),
        ctx,
        route
      );
    }
    if (error instanceof AIApiError) {
      return jsonErrorResponse(error, ctx, route);
    }

    logger.error("chat_stream_failed", {
      requestId: ctx.requestId,
      route,
      durationMs: Date.now() - ctx.startedAt,
      error: error instanceof Error ? error.message : "unknown",
    });

    return jsonErrorResponse(error, ctx, route);
  }
}
