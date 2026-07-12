import { buildResearchPrompt } from "@/lib/ai/context/contextBuilder";
import {
  FINANCIAL_INTELLIGENCE_DIRECTIVE,
  QUALITY_DIRECTIVES,
  RAG_DIRECTIVE,
} from "@/lib/ai/core/directives";
import { ResearchEngineError } from "@/lib/ai/core/errors";
import { streamChatCompletion, type OpenAIMessage } from "@/lib/ai/core/openai-client";
import {
  buildAIDecision,
  renderDecisionSummaryMarkdown,
  resolveSymbolForDecision,
} from "@/lib/ai/decision/decisionEngine";
import { loadInstitutionalBundle } from "@/lib/ai/institutional/loadBundle";
import { getPlatformEnv } from "@/lib/platform/env";
import {
  appendQualityDisclaimer,
  evaluateOutputQuality,
  validateFinancialConsistency,
} from "@/lib/platform/quality";
import { sanitizeUserPrompt } from "@/lib/platform/security";
import {
  generateInstitutionalReportMarkdown,
  ReportGeneratorError,
  resolveSingleSymbolForReport,
} from "@/lib/research/reportGenerator";
import { isInstitutionalAnalysisRequest } from "@/lib/research/reportTemplates";

export interface ResearchChatRequest {
  prompt: string;
  symbol: string | null;
  requestId?: string;
}

export { ResearchEngineError };

async function* streamTextContent(text: string): AsyncGenerator<string> {
  const parts = text.split(/(?<=\n\n)/);
  for (const part of parts) {
    if (part) yield part;
  }
}

function createTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamTextContent(text)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function generateResearchStream(
  request: ResearchChatRequest
): Promise<ReadableStream<Uint8Array>> {
  const env = getPlatformEnv();
  const sanitized = sanitizeUserPrompt(request.prompt, env.AI_MAX_PROMPT_CHARS);
  if (sanitized.blocked) {
    throw new ResearchEngineError(
      `Prompt rejected: ${sanitized.reasons.join(" ")}`,
      400
    );
  }

  const prompt = sanitized.value;
  const requestId = request.requestId ?? `req-${Date.now()}`;

  if (isInstitutionalAnalysisRequest(prompt)) {
    const symbol = await resolveSingleSymbolForReport(prompt, request.symbol);
    if (symbol) {
      try {
        const reportMarkdown = await generateInstitutionalReportMarkdown(symbol, prompt);
        return createTextStream(reportMarkdown);
      } catch (error) {
        if (error instanceof ReportGeneratorError) {
          throw new ResearchEngineError(error.message, error.status);
        }
        throw error;
      }
    }
  }

  const built = await buildResearchPrompt({
    prompt,
    symbol: request.symbol,
  });

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: `${built.systemPrompt}\n\n${FINANCIAL_INTELLIGENCE_DIRECTIVE}\n\n${RAG_DIRECTIVE}\n\n${QUALITY_DIRECTIVES}`,
    },
    { role: "user", content: built.userPrompt },
  ];

  const encoder = new TextEncoder();
  let fullAnswer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamChatCompletion({
          messages,
          route: "/api/ai/chat",
          requestId,
          symbol: request.symbol,
          temperature: 0.35,
        })) {
          fullAnswer += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        const symbol = resolveSymbolForDecision(prompt, request.symbol);
        if (symbol) {
          const bundle = await loadInstitutionalBundle(symbol, prompt);
          if (bundle) {
            const quality = evaluateOutputQuality({
              answer: fullAnswer,
              ragChunks: bundle.ragChunks,
              confidenceScore: bundle.intelligence?.researchConfidence.overall,
            });
            const consistencyIssues = validateFinancialConsistency({
              context: bundle.context,
              generatedText: fullAnswer,
            });
            const disclaimer = appendQualityDisclaimer([
              ...quality.warnings,
              ...consistencyIssues,
            ]);
            if (disclaimer) {
              for await (const chunk of streamTextContent(disclaimer)) {
                fullAnswer += chunk;
                controller.enqueue(encoder.encode(chunk));
              }
            }

            const decision = buildAIDecision({
              context: bundle.context,
              profile: bundle.profile,
              valuation: bundle.valuation,
              risk: bundle.risk,
              moat: bundle.moat,
              intelligence: bundle.intelligence,
              ragChunks: bundle.ragChunks,
              opportunities: bundle.opportunities,
            });
            const decisionMarkdown = renderDecisionSummaryMarkdown(decision);
            for await (const chunk of streamTextContent(`\n\n${decisionMarkdown}`)) {
              controller.enqueue(encoder.encode(chunk));
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
