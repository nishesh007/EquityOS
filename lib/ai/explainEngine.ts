/**
 * Explain engine — context-aware explanations for ratios, statements, charts, and scores.
 */

import { loadCompanyContext } from "@/lib/ai/context/companyContext";
import { QUALITY_DIRECTIVES } from "@/lib/ai/core/directives";
import { ExplainEngineError } from "@/lib/ai/core/errors";
import { streamChatCompletion } from "@/lib/ai/core/openai-client";
import { FUNDAMENTALS_METRIC_REGISTRY } from "@/lib/fundamentals/registry";
import { getResearchSystemPrompt } from "@/lib/ai/systemPrompt";

export type ExplainTargetType =
  | "ratio"
  | "financial_row"
  | "chart"
  | "technical"
  | "score";

export interface ExplainTarget {
  type: ExplainTargetType;
  key: string;
  label: string;
  value?: string | number | null;
  symbol: string;
  pageContext?: string | null;
  detail?: string | null;
}

export interface ExplainPromptBundle {
  systemPrompt: string;
  userPrompt: string;
  target: ExplainTarget;
}

const TECHNICAL_INDICATOR_GUIDE: Record<string, string> = {
  rsi: "Relative Strength Index — momentum oscillator; above 70 overbought, below 30 oversold.",
  macd: "Moving Average Convergence Divergence — trend/momentum crossover system.",
  adx: "Average Directional Index — trend strength, not direction.",
  bollinger: "Bollinger Bands — volatility envelope around moving average.",
  supertrend: "Supertrend — ATR-based trend following overlay.",
  ema: "Exponential Moving Average — weighted trend line.",
  sma: "Simple Moving Average — mean price over a window.",
};

function metricDefinition(key: string): string | null {
  const entry = FUNDAMENTALS_METRIC_REGISTRY.find(
    (item) => item.key === key || item.label.toLowerCase() === key.toLowerCase()
  );
  return entry ? `${entry.label} (${entry.category})` : null;
}

function buildTargetContext(target: ExplainTarget): string {
  const valueLine =
    target.value !== undefined && target.value !== null
      ? `Current value: ${target.value}`
      : "Current value: not provided";

  switch (target.type) {
    case "ratio":
      return [
        `Explain the financial ratio **${target.label}** (${target.key}) for ${target.symbol}.`,
        metricDefinition(target.key) ?? "",
        valueLine,
        target.detail ?? "",
        "Cover: definition, how it is calculated, what is good vs concerning for Indian equities, and how to interpret this specific value.",
      ].join("\n");

    case "financial_row":
      return [
        `Explain the financial statement line item **${target.label}** for ${target.symbol}.`,
        valueLine,
        target.detail ?? "",
        "Cover: what the line item represents, quality signals, and linkage to cash flow or balance sheet.",
      ].join("\n");

    case "chart":
      return [
        `Explain the chart/visual **${target.label}** for ${target.symbol}.`,
        target.detail ?? "",
        valueLine,
        "Cover: what the chart shows, how to read it, and actionable interpretation for investors.",
      ].join("\n");

    case "technical":
      return [
        `Explain the technical indicator **${target.label}** for ${target.symbol}.`,
        TECHNICAL_INDICATOR_GUIDE[target.key.toLowerCase()] ?? "",
        valueLine,
        target.detail ?? "",
        "Cover: signal reading, current bias, and what would change the outlook.",
      ].join("\n");

    case "score":
      return [
        `Explain the EquityOS AI score **${target.label}** for ${target.symbol}.`,
        valueLine,
        target.detail ?? "",
        "Cover: score scale, drivers, limitations, and how it should influence research (not as standalone advice).",
      ].join("\n");
  }
}

export async function buildExplainPrompt(target: ExplainTarget): Promise<ExplainPromptBundle> {
  const context = await loadCompanyContext(target.symbol);
  const contextBlock = context
    ? [
        `Company: ${context.profile.name} (${context.profile.symbol})`,
        `Sector: ${context.profile.sector} · Industry: ${context.profile.industry}`,
        `Price: ₹${context.profile.price}`,
        context.financialIntelligence
          ? `Financial Health: ${context.financialIntelligence.scores.financialHealthScore}/100 · Quality: ${context.financialIntelligence.scores.qualityScore}/100`
          : "",
        context.technicalIndicators
          ? `Technical score: ${context.technicalIndicators.score}/100 (${context.technicalIndicators.summary})`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : `Symbol: ${target.symbol} (limited context available)`;

  const userPrompt = [
    buildTargetContext(target),
    "",
    "---",
    "EquityOS Company Context:",
    contextBlock,
    target.pageContext ? `Page context: ${target.pageContext}` : "",
  ].join("\n");

  return {
    systemPrompt: `${getResearchSystemPrompt()}\n\n${QUALITY_DIRECTIVES}\n\nYou are in EXPLAIN mode. Provide a concise institutional explanation in 3–5 short paragraphs with bullet takeaways. Use only supplied context; state gaps explicitly.`,
    userPrompt,
    target,
  };
}

export { ExplainEngineError };

export async function* streamExplainResponse(
  target: ExplainTarget,
  requestId = `req-${Date.now()}`
): AsyncGenerator<string> {
  const { systemPrompt, userPrompt } = await buildExplainPrompt(target);

  yield* streamChatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.25,
    route: "/api/ai/workspace/explain",
    requestId,
    symbol: target.symbol,
  });
}

export function buildExplainSeedPrompt(target: ExplainTarget): string {
  const value =
    target.value !== undefined && target.value !== null ? ` (${target.value})` : "";
  return `Explain ${target.label}${value} for ${target.symbol}`;
}
