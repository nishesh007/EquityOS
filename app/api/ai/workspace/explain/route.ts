import {
  streamExplainResponse,
  type ExplainTarget,
} from "@/lib/ai/explainEngine";

export const runtime = "nodejs";

import {
  AIApiError,
  createAIHandlerContext,
  enforceRateLimit,
  jsonErrorResponse,
  parseJsonBody,
  withRateLimitHeaders,
} from "@/lib/platform/api";
import { explainRequestSchema } from "@/lib/ai/core/validation";

export async function POST(request: Request) {
  const ctx = createAIHandlerContext(request);
  const route = "/api/ai/workspace/explain";

  try {
    enforceRateLimit(request, route);
    const body = await parseJsonBody(request, explainRequestSchema);
    const target: ExplainTarget = body.target;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of streamExplainResponse(target, ctx.requestId)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
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
    if (error instanceof AIApiError) {
      return jsonErrorResponse(error, ctx, route);
    }
    return jsonErrorResponse(error, ctx, route);
  }
}
